"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Crown, Copy, Check, Edit } from "lucide-react"
import Link from "next/link"
import { Label } from "@/components/ui/label"
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
  const [creatorReferralCode, setCreatorReferralCode] = useState<string | null>(null)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [showReferralCodeDialog, setShowReferralCodeDialog] = useState(false)

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

      // Get all creators with their platforms, posting frameworks, and sub-niches
      const { data: creators } = await supabase
        .from("creators")
        .select(
          `
      *,
      creator_platforms(
        platforms(id, name)
      ),
      creator_posting_frameworks(
        posting_frequency
      ),
      creator_sub_niches(
        sub_niche
      )
    `,
        )
        .eq("workspace_id", membership.workspace_id)
        .order("created_at", { ascending: false })

      console.log("[v0] Loaded creators:", creators)

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
            postingFrequency: creator.creator_posting_frameworks?.[0]?.posting_frequency || null,
            subNiches: creator.creator_sub_niches?.map((sn: any) => sn.sub_niche) || [],
          }
        }),
      )

      setCreatorsWithCounts(creatorsData)

      // Load creator referral code
      const { data: creatorCodeData } = await supabase
        .from("workspace_referral_codes")
        .select("referral_code")
        .eq("workspace_id", membership.workspace_id)
        .eq("role", "creator")
        .single()
      
      setCreatorReferralCode(creatorCodeData?.referral_code || null)

      setLoading(false)
    }

    loadData()
  }, [router])

  const isAtCreatorLimit = () => {
    // personal_creator and manager workspace types have a limit of 1 creator
    // team_agency has unlimited creators
    return (
      (workspace?.type === "personal_creator" || workspace?.type === "manager") &&
      creatorsWithCounts.length >= 1
    )
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

  function handleCopyCode(code: string) {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
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
            onClick={() => {
              if (isAtCreatorLimit()) {
                setShowUpgradeDialog(true)
              } else {
                setShowReferralCodeDialog(true)
              }
            }}
            className="bg-accent text-accent-foreground hover:bg-accent/90 border-accent"
          >
            <Plus className="size-4 mr-2" />
            Add Creator
          </Button>
        </div>

        <p className="text-muted-foreground">Manage your content creators and their brands</p>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {creatorsWithCounts.map((creator) => {
            const platformConfig: Record<string, { icon: string; bg: string; border: string; text: string }> = {
              youtube: {
                icon: "/icons/youtube.svg",
                bg: "bg-red-50",
                border: "border-red-600",
                text: "text-red-700",
              },
              "youtube shorts": {
                icon: "/icons/youtube.svg",
                bg: "bg-red-50",
                border: "border-red-600",
                text: "text-red-700",
              },
              "youtube long": {
                icon: "/icons/youtube.svg",
                bg: "bg-red-50",
                border: "border-red-600",
                text: "text-red-700",
              },
              tiktok: {
                icon: "/icons/tiktok.svg",
                bg: "bg-gradient-to-br from-cyan-50 via-pink-50 to-black/5",
                border: "border-black",
                text: "text-black",
              },
              instagram: {
                icon: "/icons/instagram.svg",
                bg: "bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50",
                border: "border-pink-500",
                text: "text-pink-700",
              },
              twitter: {
                icon: "/icons/x.svg",
                bg: "bg-black/5",
                border: "border-black",
                text: "text-black",
              },
              x: {
                icon: "/icons/x.svg",
                bg: "bg-black/5",
                border: "border-black",
                text: "text-black",
              },
              linkedin: {
                icon: "/icons/linkedin.svg",
                bg: "bg-blue-50",
                border: "border-blue-700",
                text: "text-blue-800",
              },
              facebook: {
                icon: "/icons/facebook.svg",
                bg: "bg-blue-50",
                border: "border-blue-600",
                text: "text-blue-700",
              },
            }

            return (
              <Card 
                key={creator.id} 
                className="hover:shadow-lg transition-all cursor-pointer border-2 hover:border-primary/50"
                onClick={() => router.push(`/profile/creators/${creator.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <CardTitle className="text-lg">{creator.name}</CardTitle>
                      {creator.brand_name && <p className="text-sm text-muted-foreground">{creator.brand_name}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary" className="w-fit">
                      {creator.primary_niche}
                    </Badge>
                    {creator.postingFrequency && (
                      <Badge variant="outline" className="text-xs">
                        {creator.postingFrequency} posts/week
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Platform Icons */}
                  <div className="flex flex-wrap gap-2">
                    {creator.creator_platforms?.map((cp: any, idx: number) => {
                      const platformName = cp.platforms?.name?.toLowerCase() || ""
                      const config = platformConfig[platformName] || {
                        icon: "",
                      }
                      
                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-center"
                          title={cp.platforms?.name}
                        >
                          {config.icon ? (
                            <img src={config.icon} alt={cp.platforms?.name} className="size-6 object-contain" />
                          ) : (
                            <span className="text-xs font-medium">{cp.platforms?.name?.charAt(0) || "?"}</span>
                          )}
                        </div>
                      )
                    })}
                    {(!creator.creator_platforms || creator.creator_platforms.length === 0) && (
                      <p className="text-xs text-muted-foreground italic">No platforms</p>
                    )}
                  </div>

                  {/* Sub-Niches */}
                  {creator.subNiches && creator.subNiches.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Sub-Niches</p>
                      <div className="flex flex-wrap gap-1">
                        {creator.subNiches.slice(0, 3).map((niche: string, idx: number) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {niche}
                          </Badge>
                        ))}
                        {creator.subNiches.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{creator.subNiches.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t">
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
                </CardContent>
              </Card>
            )
          })}
        </div>

        {creatorsWithCounts.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">No creators yet. Click "Add Creator" to get started.</p>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Creator Referral Code Dialog */}
      <Dialog open={showReferralCodeDialog} onOpenChange={setShowReferralCodeDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Creator Referral Code</DialogTitle>
            <DialogDescription>
              Share this code with creators. They'll use it when signing up to join your workspace and can set up their creator or brand details on the creators page.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {creatorReferralCode ? (
              <div className="flex items-center gap-2 p-3 bg-accent/10 border border-accent/20 rounded-lg">
                <code className="flex-1 font-mono text-sm font-semibold text-accent bg-background px-3 py-2 rounded border border-accent/30">
                  {creatorReferralCode}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopyCode(creatorReferralCode)}
                  className="h-9 w-9 p-0 hover:bg-accent/20"
                >
                  {copiedCode === creatorReferralCode ? (
                    <Check className="size-4 text-green-600 dark:text-green-400" />
                  ) : (
                    <Copy className="size-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Referral code will be available after workspace setup.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Upgrade Dialog */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-2">
              <Crown className="size-5 text-accent" />
              <DialogTitle>Upgrade to Add Creators</DialogTitle>
            </div>
            <DialogDescription>Upgrade to Team/Agency to add multiple creators and brands</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2 text-sm text-muted-foreground">
            <p>Multiple creators are not available on the Personal Creator or Manager of Creators plan.</p>
            <p>
              Upgrade to <strong>Team/Agency</strong> to manage multiple creators and brands, scale your content creation workflow,
              and collaborate with larger teams.
            </p>
            <div className="bg-muted p-3 rounded-lg mt-4">
              <p className="font-medium mb-2">With Team/Agency, you get:</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Unlimited creators and brands</li>
                <li>Unlimited team members</li>
                <li>Full team collaboration</li>
                <li>Advanced workspace management</li>
              </ul>
            </div>
          </div>
          <DialogFooter className="sm:justify-between">
            <Button variant="outline" onClick={() => setShowUpgradeDialog(false)}>
              Maybe Later
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


      <Footer />
    </div>
  )
}
