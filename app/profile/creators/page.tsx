"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { upgradeWorkspaceType } from "@/app/actions/workspace"
import { useToast } from "@/hooks/use-toast"

export default function CreatorsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [user, setUser] = useState<any>(null)
  const [creatorsWithCounts, setCreatorsWithCounts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [workspace, setWorkspace] = useState<any>(null)
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false)
  const [isUpgrading, setIsUpgrading] = useState(false)
  const [showAddCreatorDialog, setShowAddCreatorDialog] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    brand_name: "",
    primary_niche: "",
  })

  useEffect(() => {
    async function loadData() {
      const supabase = createClient()

      const {
        data: { user: authUser },
        error: userError,
      } = await supabase.auth.getUser()
      if (userError || !authUser) {
        router.push("/auth/login")
        return
      }
      setUser(authUser)

      // Get user's workspace
      const { data: membership } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", authUser.id)
        .single()

      if (!membership) {
        router.push("/onboarding")
        return
      }

      // Get all workspace fields including workspace_type
      const { data: workspaceData } = await supabase
        .from("workspaces")
        .select("id, name, type, created_at")
        .eq("id", membership.workspace_id)
        .single()

      console.log("[v0] Loaded workspace:", workspaceData)
      setWorkspace(workspaceData)

      // Get all creators with their platforms and content counts
      const { data: creators } = await supabase
        .from("creators")
        .select(
          `
      *,
      creator_platforms(
        platforms(name)
      )
    `,
        )
        .eq("workspace_id", membership.workspace_id)
        .order("created_at", { ascending: false })

      // Get content counts per creator
      const creatorsData = await Promise.all(
        (creators || []).map(async (creator) => {
          const { count: totalContent } = await supabase
            .from("content")
            .select("*", { count: "exact", head: true })
            .eq("creator_id", creator.id)

          const { count: inProgress } = await supabase
            .from("content")
            .select("*", { count: "exact", head: true })
            .eq("creator_id", creator.id)
            .in("production_stage", ["scripted", "approved", "shot", "edited"])

          const { data: batches } = await supabase
            .from("batch_creators")
            .select("batch_id")
            .eq("creator_id", creator.id)

          return {
            ...creator,
            totalContent: totalContent || 0,
            inProgress: inProgress || 0,
            activeBatches: batches?.length || 0,
          }
        }),
      )

      setCreatorsWithCounts(creatorsData)
      setLoading(false)
    }

    loadData()
  }, [router])

  const handleAddClick = () => {
    console.log("[v0] Workspace type:", workspace?.type)
    console.log("[v0] Current creator count:", creatorsWithCounts.length)

    if (
      (workspace?.type === "personal_creator" || workspace?.type === "manager_of_creators") &&
      creatorsWithCounts.length >= 1
    ) {
      console.log("[v0] At capacity, showing upgrade dialog")
      setShowUpgradeDialog(true)
    } else {
      console.log("[v0] Team/agency or under limit, showing creation dialog")
      setShowAddCreatorDialog(true)
    }
  }

  async function handleUpgrade() {
    console.log("[v0] Starting workspace upgrade...")
    setIsUpgrading(true)

    const result = await upgradeWorkspaceType(workspace.id, "team_agency")

    if (result.error) {
      console.error("[v0] Error upgrading workspace:", result.error)
      alert(`Failed to upgrade: ${result.error}`)
    } else {
      console.log("[v0] Workspace upgraded successfully to team_agency")
      setWorkspace({ ...workspace, type: "team_agency" })
      setShowUpgradeDialog(false)
      toast({
        title: "Workspace upgraded successfully!",
        description: "You're now on Team/Agency plan and can add unlimited creators.",
      })
      router.push("/profile/settings")
      router.refresh()
    }
    setIsUpgrading(false)
  }

  async function handleCreateCreator() {
    if (!formData.name || !formData.primary_niche) {
      return
    }

    setIsCreating(true)
    const supabase = createClient()

    const { data: membership } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", user.id)
      .single()

    const { data: newCreator, error } = await supabase
      .from("creators")
      .insert({
        workspace_id: membership.workspace_id,
        name: formData.name,
        brand_name: formData.brand_name || null,
        primary_niche: formData.primary_niche,
      })
      .select()
      .single()

    if (error) {
      console.error("[v0] Error creating creator:", error)
    } else {
      // Reload data
      const { data: creators } = await supabase
        .from("creators")
        .select(
          `
          *,
          creator_platforms(
            platforms(name)
          )
        `,
        )
        .eq("workspace_id", membership.workspace_id)
        .order("created_at", { ascending: false })

      const creatorsData = await Promise.all(
        (creators || []).map(async (creator) => {
          const { count: totalContent } = await supabase
            .from("content")
            .select("*", { count: "exact", head: true })
            .eq("creator_id", creator.id)

          const { count: inProgress } = await supabase
            .from("content")
            .select("*", { count: "exact", head: true })
            .eq("creator_id", creator.id)
            .in("production_stage", ["scripted", "approved", "shot", "edited"])

          const { data: batches } = await supabase
            .from("batch_creators")
            .select("batch_id")
            .eq("creator_id", creator.id)

          return {
            ...creator,
            totalContent: totalContent || 0,
            inProgress: inProgress || 0,
            activeBatches: batches?.length || 0,
          }
        }),
      )

      setCreatorsWithCounts(creatorsData)
      setShowAddCreatorDialog(false)
      setFormData({ name: "", brand_name: "", primary_niche: "" })
    }
    setIsCreating(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <main className="container mx-auto p-6 space-y-6 flex-1">
          <Skeleton className="h-9 w-32 bg-muted" />
          <Skeleton className="h-5 w-96 bg-muted" />

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-32 bg-muted" />
                    <Skeleton className="h-4 w-24 bg-muted" />
                  </div>
                  <Skeleton className="h-5 w-20 bg-muted" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-1">
                    <Skeleton className="h-5 w-16 bg-muted" />
                    <Skeleton className="h-5 w-20 bg-muted" />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Skeleton className="h-16 w-full bg-muted" />
                    <Skeleton className="h-16 w-full bg-muted" />
                    <Skeleton className="h-16 w-full bg-muted" />
                  </div>
                  <Skeleton className="h-10 w-full bg-muted" />
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="container mx-auto p-6 space-y-6 flex-1">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Creators</h1>
          <Button
            onClick={handleAddClick}
            className="bg-accent text-accent-foreground hover:bg-accent/90 border-accent"
          >
            <Plus className="size-4 mr-2" />
            Add Creator
          </Button>
        </div>

        <p className="text-muted-foreground">Manage your content creators and their brands</p>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {creatorsWithCounts.map((creator) => (
            <Card key={creator.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <CardTitle className="text-lg">{creator.name}</CardTitle>
                    {creator.brand_name && <p className="text-sm text-muted-foreground">{creator.brand_name}</p>}
                  </div>
                </div>
                <Badge variant="secondary" className="w-fit">
                  {creator.primary_niche}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-1">
                  {creator.creator_platforms?.map((cp: any, idx: number) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {cp.platforms.name}
                    </Badge>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="space-y-1">
                    <p className="text-2xl font-bold">{creator.totalContent}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl font-bold">{creator.inProgress}</p>
                    <p className="text-xs text-muted-foreground">In Progress</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl font-bold">{creator.activeBatches}</p>
                    <p className="text-xs text-muted-foreground">Batches</p>
                  </div>
                </div>

                <Button asChild variant="outline" className="w-full bg-transparent">
                  <Link href={`/creators/${creator.id}`}>View Details</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {creatorsWithCounts.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">No creators yet. Add your first creator to get started.</p>
              <Button
                onClick={handleAddClick}
                className="bg-accent text-accent-foreground hover:bg-accent/90 border-accent"
              >
                <Plus className="size-4 mr-2" />
                Add Creator
              </Button>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Upgrade Dialog */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Upgrade to Team/Agency</DialogTitle>
            <DialogDescription>Unlock unlimited creators and brands by upgrading your workspace</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Your current plan only allows 1 creator. Upgrade to Team/Agency to add unlimited creators and brands.
            </p>
            <div className="rounded-lg border p-4 space-y-2">
              <h4 className="font-medium">Team/Agency Benefits:</h4>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Unlimited creators and brands</li>
                <li>Full team collaboration</li>
                <li>Advanced workspace management</li>
                <li>Priority support</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpgradeDialog(false)} disabled={isUpgrading}>
              Cancel
            </Button>
            <Button
              onClick={handleUpgrade}
              disabled={isUpgrading}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {isUpgrading ? "Upgrading..." : "Upgrade Now"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddCreatorDialog} onOpenChange={setShowAddCreatorDialog}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle>Add Creator</DialogTitle>
            <DialogDescription>Create a new creator profile for your workspace</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Creator Name *
              </label>
              <input
                id="name"
                type="text"
                placeholder="e.g. John Smith"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="brand_name" className="text-sm font-medium">
                Brand Name (Optional)
              </label>
              <input
                id="brand_name"
                type="text"
                placeholder="e.g. Fitness by John"
                value={formData.brand_name}
                onChange={(e) => setFormData({ ...formData, brand_name: e.target.value })}
                className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="primary_niche" className="text-sm font-medium">
                Primary Niche *
              </label>
              <input
                id="primary_niche"
                type="text"
                placeholder="e.g. Fitness & Health"
                value={formData.primary_niche}
                onChange={(e) => setFormData({ ...formData, primary_niche: e.target.value })}
                className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddCreatorDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateCreator}
              disabled={!formData.name || !formData.primary_niche || isCreating}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {isCreating ? "Adding..." : "Add Creator"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  )
}
