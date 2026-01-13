"use client"

import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Footer } from "@/components/footer"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

import { useState, useEffect, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { AppNav } from "@/components/app-nav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Users, Building2, User, Plus, X, Save, Trash2, Copy } from "lucide-react"
import { updateWorkspace, deleteWorkspace } from "@/app/actions/workspace"
import type { Platform, WorkspaceType } from "@/types" // Import Platform and WorkspaceType

export default function SettingsPage() {
  const router = useRouter()
  const [supabase] = useMemo(() => [createClient()], [])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState("")
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [membership, setMembership] = useState<any>(null)
  const [workspace, setWorkspace] = useState<any>(null)
  const [creators, setCreators] = useState<any[]>([])
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [currentCreatorIndex, setCurrentCreatorIndex] = useState(0)
  const [teamInvites, setTeamInvites] = useState<any[]>([])

  const [workspaceName, setWorkspaceName] = useState("")
  const [workspaceType, setWorkspaceType] = useState<WorkspaceType>("personal_creator")
  const [editCreators, setEditCreators] = useState<any[]>([])
  const [selectedPlatforms, setSelectedPlatforms] = useState<Record<number, string[]>>({})

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()
      if (!authUser) {
        router.push("/auth/login")
        return
      }
      setUser(authUser)

      const { data: membershipData } = await supabase
        .from("workspace_members")
        .select("*, workspaces(*)")
        .eq("user_id", authUser.id)
        .single()

      if (!membershipData) {
        router.push("/onboarding")
        return
      }
      setMembership(membershipData)
      setWorkspace(membershipData.workspaces)
      setWorkspaceName(membershipData.workspaces.name)
      setWorkspaceType(membershipData.workspaces.type)

      const { data: creatorsData } = await supabase
        .from("creators")
        .select("*, creator_platforms(platform_id), creator_sub_niches(sub_niche)")
        .eq("workspace_id", membershipData.workspaces.id)

      if (creatorsData) {
        setCreators(creatorsData)
        setEditCreators(
          creatorsData.map((c: any) => ({
            id: c.id,
            name: c.name,
            brandName: c.brand_name,
            primaryNiche: c.primary_niche,
            subNiches: c.creator_sub_niches?.map((sn: any) => sn.sub_niche) || [],
            platforms: c.creator_platforms?.map((cp: any) => cp.platform_id) || [],
          })),
        )

        const platformsObj: Record<number, string[]> = {}
        creatorsData.forEach((c: any, idx: number) => {
          platformsObj[idx] = c.creator_platforms?.map((cp: any) => cp.platform_id) || []
        })
        setSelectedPlatforms(platformsObj)
      }

      const { data: teamMembersData } = await supabase
        .from("workspace_members")
        .select("*, user_profiles(first_name, last_name, email)")
        .eq("workspace_id", membershipData.workspaces.id)

      if (teamMembersData) {
        setTeamMembers(teamMembersData)
      }

      const { data: platformsData } = await supabase.from("platforms").select("*").order("name")
      if (platformsData) setPlatforms(platformsData)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const addCreator = () => {
    setEditCreators([...editCreators, { name: "", brandName: "", primaryNiche: "", subNiches: [], platforms: [] }])
  }

  const removeCreator = (index: number) => {
    setEditCreators(editCreators.filter((_, i) => i !== index))
  }

  const updateCreator = (index: number, field: string, value: any) => {
    const newCreators = [...editCreators]
    newCreators[index][field] = value
    setEditCreators(newCreators)
  }

  const addSubNiche = (creatorIndex: number) => {
    const newCreators = [...editCreators]
    if (newCreators[creatorIndex].subNiches.length < 5) {
      newCreators[creatorIndex].subNiches.push("")
      setEditCreators(newCreators)
    }
  }

  const removeSubNiche = (creatorIndex: number, subNicheIndex: number) => {
    const newCreators = [...editCreators]
    newCreators[creatorIndex].subNiches.splice(subNicheIndex, 1)
    setEditCreators(newCreators)
  }

  const updateSubNiche = (creatorIndex: number, subNicheIndex: number, value: string) => {
    const newCreators = [...editCreators]
    newCreators[creatorIndex].subNiches[subNicheIndex] = value
    setEditCreators(newCreators)
  }

  const togglePlatform = (creatorIndex: number, platformId: string) => {
    setSelectedPlatforms((prev) => {
      const current = prev[creatorIndex] || []
      const updated = current.includes(platformId)
        ? current.filter((id) => id !== platformId)
        : [...current, platformId]
      return { ...prev, [creatorIndex]: updated }
    })
  }

  const addInvite = () => {
    setTeamInvites([...teamInvites, { firstName: "", lastName: "", email: "", role: "viewer" }])
  }

  const removeInvite = (index: number) => {
    setTeamInvites(teamInvites.filter((_, i) => i !== index))
  }

  const updateInvite = (index: number, field: string, value: any) => {
    const newInvites = [...teamInvites]
    newInvites[index][field] = value
    setTeamInvites(newInvites)
  }

  const handleStartEdit = () => {
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    loadData()
  }

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)

    try {
      const creatorsData = editCreators
        .filter((c) => c.name || workspaceType === "personal_creator")
        .map((c, i) => ({
          id: c.id,
          name: c.name || user?.email?.split("@")[0] || "Creator",
          brand_name: c.brandName,
          primary_niche: c.primaryNiche,
          sub_niches: c.subNiches.filter(Boolean),
          platforms: selectedPlatforms[i] || [],
        }))

      const result = await updateWorkspace({
        workspaceId: workspace.id,
        workspace: {
          name: workspaceName,
          type: workspaceType,
        },
        creators: creatorsData,
        teamInvites: teamInvites,
      })

      if (result?.error) {
        throw new Error(result.error)
      }

      setIsEditing(false)
      await loadData()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteWorkspace = async () => {
    if (deleteConfirmText !== "delete workspace") {
      return
    }

    setIsDeleting(true)
    setError(null)

    try {
      const result = await deleteWorkspace(workspace.id)

      if (result?.error) {
        throw new Error(result.error)
      }

      router.push("/onboarding")
    } catch (err: any) {
      setError(err.message)
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  const handleCopyDeleteText = () => {
    navigator.clipboard.writeText("delete workspace")
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const canEdit = membership?.role === "owner" || membership?.role === "admin"

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <AppNav userEmail={user?.email || ""} />
        <main className="container mx-auto p-6 space-y-6 flex-1">
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-9 bg-muted" />
            <Skeleton className="h-9 w-32 bg-muted" />
          </div>

          <Skeleton className="h-5 w-80 bg-muted" />

          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48 bg-muted" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-32 w-full bg-muted" />
              <Skeleton className="h-16 w-full bg-muted" />
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppNav userEmail={user?.email || ""} />

      <main className="container mx-auto p-6 space-y-6 flex-1">
        <div className="flex items-center gap-2">
          <Link href="/profile" className="hover:opacity-70 transition-opacity">
            <ArrowLeft className="size-6 text-foreground" />
          </Link>
          <h1 className="text-3xl font-bold">Settings</h1>
        </div>

        <p className="text-muted-foreground">Configure workspace preferences and settings</p>

        {canEdit && !isEditing && <Button onClick={handleStartEdit}>Edit Workspace</Button>}
        {isEditing && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancelEdit} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="size-4 mr-2" />
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        )}
        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-sm text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {isEditing && (
          <Accordion
            type="multiple"
            defaultValue={["workspace", "creators", "platforms", "team"]}
            className="space-y-4"
          >
            <AccordionItem value="workspace" className="border rounded-lg px-6">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <Building2 className="size-5" />
                  <span className="text-lg font-semibold">Workspace Details</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Workspace Name</Label>
                  <Input value={workspaceName} onChange={(e) => setWorkspaceName(e.target.value)} />
                </div>
                <div className="space-y-3">
                  <Label>Workspace Type</Label>
                  <RadioGroup value={workspaceType} onValueChange={(v) => setWorkspaceType(v as WorkspaceType)}>
                    <div className="flex items-start space-x-3 p-4 border rounded-lg">
                      <RadioGroupItem value="personal_creator" id="personal" />
                      <label htmlFor="personal" className="flex-1 cursor-pointer">
                        <div className="flex items-center gap-2 mb-1">
                          <User className="size-4" />
                          <span className="font-semibold">Personal Creator</span>
                        </div>
                        <p className="text-sm text-muted-foreground">Managing your own content and brand</p>
                      </label>
                    </div>
                    <div className="flex items-start space-x-3 p-4 border rounded-lg">
                      <RadioGroupItem value="manager" id="manager" />
                      <label htmlFor="manager" className="flex-1 cursor-pointer">
                        <div className="flex items-center gap-2 mb-1">
                          <Users className="size-4" />
                          <span className="font-semibold">Manager of Creators</span>
                        </div>
                        <p className="text-sm text-muted-foreground">Managing one or more creator brands</p>
                      </label>
                    </div>
                    <div className="flex items-start space-x-3 p-4 border rounded-lg">
                      <RadioGroupItem value="team_agency" id="team" />
                      <label htmlFor="team" className="flex-1 cursor-pointer">
                        <div className="flex items-center gap-2 mb-1">
                          <Building2 className="size-4" />
                          <span className="font-semibold">Team / Agency</span>
                        </div>
                        <p className="text-sm text-muted-foreground">Managing multiple creators with a full team</p>
                      </label>
                    </div>
                  </RadioGroup>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="creators" className="border rounded-lg px-6">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <User className="size-5" />
                  <span className="text-lg font-semibold">
                    {workspaceType === "personal_creator" ? "Your Creator Profile" : "Manage Creators"}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-6 pt-4">
                {workspaceType === "personal_creator" ? (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">As a personal creator, add your sub-niches below.</p>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Sub-Niches (up to 5)</Label>
                        {(editCreators[0]?.subNiches?.length || 0) < 5 && (
                          <Button variant="outline" size="sm" onClick={() => addSubNiche(0)}>
                            <Plus className="size-3 mr-1" />
                            Add
                          </Button>
                        )}
                      </div>
                      {editCreators[0]?.subNiches?.map((subNiche: string, snIdx: number) => (
                        <div key={snIdx} className="flex gap-2">
                          <Input
                            placeholder="Sub-niche name"
                            className="flex-1"
                            value={subNiche}
                            onChange={(e) => updateSubNiche(0, snIdx, e.target.value)}
                          />
                          <Button variant="ghost" size="icon" onClick={() => removeSubNiche(0, snIdx)}>
                            <X className="size-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    {editCreators.length > 1 && (
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {editCreators.map((creator: any, idx: number) => (
                          <Button
                            key={idx}
                            variant={currentCreatorIndex === idx ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentCreatorIndex(idx)}
                          >
                            {creator.name || `Creator ${idx + 1}`}
                          </Button>
                        ))}
                        <Button variant="outline" size="sm" onClick={addCreator}>
                          <Plus className="size-4" />
                        </Button>
                      </div>
                    )}

                    {editCreators.length > 0 && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Creator Name</Label>
                          <Input
                            placeholder="John Doe"
                            value={editCreators[currentCreatorIndex]?.name || ""}
                            onChange={(e) => updateCreator(currentCreatorIndex, "name", e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Brand Name (Optional)</Label>
                          <Input
                            placeholder="The John Doe Show"
                            value={editCreators[currentCreatorIndex]?.brandName || ""}
                            onChange={(e) => updateCreator(currentCreatorIndex, "brandName", e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Primary Niche</Label>
                          <Input
                            placeholder="Fitness, Tech, Finance, etc."
                            value={editCreators[currentCreatorIndex]?.primaryNiche || ""}
                            onChange={(e) => updateCreator(currentCreatorIndex, "primaryNiche", e.target.value)}
                          />
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label>Sub-Niches (up to 5)</Label>
                            {editCreators[currentCreatorIndex]?.subNiches.length < 5 && (
                              <Button variant="outline" size="sm" onClick={() => addSubNiche(currentCreatorIndex)}>
                                <Plus className="size-3 mr-1" />
                                Add
                              </Button>
                            )}
                          </div>
                          {editCreators[currentCreatorIndex]?.subNiches.map((subNiche: string, snIdx: number) => (
                            <div key={snIdx} className="flex gap-2">
                              <Input
                                placeholder="Sub-niche name"
                                className="flex-1"
                                value={subNiche}
                                onChange={(e) => updateSubNiche(currentCreatorIndex, snIdx, e.target.value)}
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeSubNiche(currentCreatorIndex, snIdx)}
                              >
                                <X className="size-4" />
                              </Button>
                            </div>
                          ))}
                        </div>

                        {editCreators.length > 1 && (
                          <Button variant="destructive" size="sm" onClick={() => removeCreator(currentCreatorIndex)}>
                            Remove This Creator
                          </Button>
                        )}
                      </div>
                    )}

                    {editCreators.length === 0 && (
                      <Button variant="outline" onClick={addCreator} className="w-full bg-transparent">
                        <Plus className="size-4 mr-2" />
                        Add Creator
                      </Button>
                    )}
                  </>
                )}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="platforms" className="border rounded-lg px-6">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                    />
                  </svg>
                  <span className="text-lg font-semibold">Platform Selection</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-6 pt-4">
                {editCreators.map((creator: any, idx: number) => (
                  <div key={idx} className="space-y-3">
                    <Label className="text-base">
                      {workspaceType === "personal_creator"
                        ? "Your Platforms"
                        : `Platforms for ${creator.name || `Creator ${idx + 1}`}`}
                    </Label>
                    <div className="grid grid-cols-2 gap-3">
                      {platforms.map((platform) => (
                        <div
                          key={platform.id}
                          className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-muted/50"
                          onClick={() => togglePlatform(idx, platform.id)}
                        >
                          <Checkbox
                            checked={selectedPlatforms[idx]?.includes(platform.id)}
                            onCheckedChange={() => togglePlatform(idx, platform.id)}
                          />
                          <Label className="cursor-pointer flex-1">{platform.name}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="team" className="border rounded-lg px-6">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <Users className="size-5" />
                  <span className="text-lg font-semibold">Team Members</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <p className="text-sm text-muted-foreground">Invite team members to collaborate on your workspace.</p>
                <div className="space-y-3">
                  {teamInvites.map((invite, idx) => (
                    <div key={idx} className="grid grid-cols-2 gap-3 p-4 border rounded-lg">
                      <div className="space-y-2">
                        <Label>First Name</Label>
                        <Input
                          value={invite.firstName}
                          onChange={(e) => updateInvite(idx, "firstName", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Last Name</Label>
                        <Input
                          value={invite.lastName}
                          onChange={(e) => updateInvite(idx, "lastName", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input
                          type="email"
                          value={invite.email}
                          onChange={(e) => updateInvite(idx, "email", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Role</Label>
                        <Select value={invite.role} onValueChange={(v) => updateInvite(idx, "role", v)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="editor">Editor</SelectItem>
                            <SelectItem value="viewer">Viewer</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2">
                        <Button variant="destructive" size="sm" onClick={() => removeInvite(idx)}>
                          <X className="size-4 mr-2" />
                          Remove Invite
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" onClick={addInvite} className="w-full bg-transparent">
                    <Plus className="size-4 mr-2" />
                    Add Team Member
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}

        {!isEditing && (
          <Card>
            <CardHeader>
              <CardTitle>Workspace Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Name</Label>
                <p className="font-semibold">{workspace?.name}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Type</Label>
                <p className="font-semibold capitalize">{workspace?.type?.replace(/_/g, " ")}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Your Role</Label>
                <Badge>{membership?.role}</Badge>
              </div>
              <div>
                <Label className="text-muted-foreground">Creators</Label>
                <p className="font-semibold">{creators.length}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {!isEditing && membership?.role === "owner" && (
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold mb-1">Delete Workspace</h3>
                  <p className="text-sm text-muted-foreground">
                    Once you delete a workspace, there is no going back. Please be certain.
                  </p>
                </div>
                <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
                  <Trash2 className="size-4 mr-2" />
                  Delete Workspace
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <div className="flex flex-col space-y-4 py-4">
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 space-y-3">
                <p className="text-sm font-semibold text-destructive">⚠️ This will remove access for the following:</p>

                {creators.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-1">Creators ({creators.length}):</p>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                      {creators.map((creator) => (
                        <li key={creator.id}>
                          • {creator.name}
                          {creator.brand_name ? ` (${creator.brand_name})` : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {teamMembers.length > 1 && (
                  <div>
                    <p className="text-sm font-medium mb-1">Team Members ({teamMembers.length}):</p>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                      {teamMembers.map((member) => (
                        <li key={member.id}>
                          • {member.user_profiles?.first_name} {member.user_profiles?.last_name} ({member.role})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>
                    Please type <span className="font-mono font-semibold">delete workspace</span> to confirm
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleCopyDeleteText}
                    title="Copy 'delete workspace' to clipboard"
                  >
                    <Copy className={`size-4 ${copied ? "text-green-500" : ""}`} />
                  </Button>
                </div>
                <Input
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="delete workspace"
                  className="flex-1"
                />
                {copied && <p className="text-xs text-green-500">Copied to clipboard!</p>}
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowDeleteDialog(false)
                    setDeleteConfirmText("")
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={deleteConfirmText !== "delete workspace" || isDeleting}
                  onClick={handleDeleteWorkspace}
                >
                  {isDeleting ? "Deleting..." : "Delete Workspace"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>

      <Footer />
    </div>
  )
}
