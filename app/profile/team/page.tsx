"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Plus, Crown } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AppNav } from "@/components/app-nav"
import { upgradeWorkspaceType } from "@/app/actions/workspace"
import { useToast } from "@/hooks/use-toast"

export default function TeamPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [user, setUser] = useState<any>(null)
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [workspace, setWorkspace] = useState<any>(null)
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState("team_member")
  const [isInviting, setIsInviting] = useState(false)
  const [isUpgrading, setIsUpgrading] = useState(false)

  useEffect(() => {
    async function loadData() {
      const supabase = createClient()

      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()
      if (!authUser) {
        router.push("/auth/login")
        return
      }
      setUser(authUser)

      const { data: membership } = await supabase
        .from("workspace_members")
        .select("workspace_id, role")
        .eq("user_id", authUser.id)
        .single()

      if (!membership) {
        router.push("/onboarding")
        return
      }

      const { data: workspaceData } = await supabase
        .from("workspaces")
        .select("id, name, type, created_at")
        .eq("id", membership.workspace_id)
        .single()

      console.log("[v0] Loaded workspace for team:", workspaceData)
      setWorkspace(workspaceData)

      const { data: membersData } = await supabase
        .from("workspace_members")
        .select("*, user_profiles(first_name, last_name)")
        .eq("workspace_id", membership.workspace_id)
        .order("created_at")

      setMembers(membersData || [])
      setLoading(false)
    }

    loadData()
  }, [router])

  function handleAddTeamMember() {
    console.log("[v0] Workspace type for team:", workspace?.type)
    if (workspace?.type === "personal_creator") {
      console.log("[v0] Personal creator - showing upgrade dialog")
      setShowUpgradeDialog(true)
      return
    }
    console.log("[v0] Not personal creator - showing invite dialog")
    setShowInviteDialog(true)
  }

  async function handleUpgrade() {
    console.log("[v0] Starting workspace upgrade to manager_of_creators...")
    setIsUpgrading(true)

    const result = await upgradeWorkspaceType(workspace.id, "manager_of_creators")

    if (result.error) {
      console.error("[v0] Error upgrading workspace:", result.error)
      alert(`Failed to upgrade: ${result.error}`)
    } else {
      console.log("[v0] Workspace upgraded successfully to manager_of_creators")
      setWorkspace({ ...workspace, type: "manager_of_creators" })
      setShowUpgradeDialog(false)
      toast({
        title: "Workspace upgraded successfully!",
        description: "You're now on Manager of Creators plan and can add team members.",
      })
      router.push("/profile/settings")
      router.refresh()
    }
    setIsUpgrading(false)
  }

  async function handleInvite() {
    if (!inviteEmail) return
    setIsInviting(true)

    console.log("[v0] Inviting:", inviteEmail, inviteRole)

    setIsInviting(false)
    setShowInviteDialog(false)
    setInviteEmail("")
    setInviteRole("team_member")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <AppNav userEmail={user?.email || ""} />
        <main className="container mx-auto p-6 space-y-6 flex-1">
          <Skeleton className="h-9 w-24 bg-muted" />
          <Skeleton className="h-5 w-80 bg-muted" />

          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40 bg-muted" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-40 bg-muted" />
                      <Skeleton className="h-4 w-32 bg-muted" />
                    </div>
                    <Skeleton className="h-6 w-20 bg-muted" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="container mx-auto p-6 space-y-6 flex-1">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold">Team</h1>
        </div>

        <p className="text-muted-foreground">Manage workspace members and permissions</p>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Team Members</CardTitle>
            <Button
              onClick={handleAddTeamMember}
              className="bg-accent text-accent-foreground hover:bg-accent/90 border-accent"
            >
              <Plus className="size-4 mr-2" />
              Add Team Member
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {members?.map((member: any) => (
                <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">
                      {member.user_profiles?.first_name && member.user_profiles?.last_name
                        ? `${member.user_profiles.first_name} ${member.user_profiles.last_name}`
                        : "Unknown User"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Joined {new Date(member.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {member.role}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>

      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-2">
              <Crown className="size-5 text-accent" />
              <DialogTitle>Upgrade to Add Team Members</DialogTitle>
            </div>
            <DialogDescription>Upgrade to Manager of Creators to add team members</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2 text-sm text-muted-foreground">
            <p>Team members are not available on the Personal Creator plan.</p>
            <p>
              Upgrade to <strong>Manager of Creators</strong> to collaborate with your team, manage multiple projects,
              and scale your content creation workflow.
            </p>
            <div className="bg-muted p-3 rounded-lg mt-4">
              <p className="font-medium mb-2">With Manager of Creators, you get:</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Unlimited team members</li>
                <li>One creator/brand</li>
                <li>Team collaboration tools</li>
                <li>Advanced workflow management</li>
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

      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>Send an email invitation to add a new team member to your workspace.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="colleague@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="team_member">Team Member</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  {workspace?.type !== "personal_creator" && <SelectItem value="creator">Creator</SelectItem>}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleInvite}
              disabled={!inviteEmail || isInviting}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {isInviting ? "Sending..." : "Send Invite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  )
}
