"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

import { useState, useEffect, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Users, Building2, User, Plus, X, Save, Trash2, Copy, GripVertical, Code, Check } from "lucide-react"
import { updateWorkspace, deleteWorkspace, generateReferralCodes } from "@/app/actions/workspace"
import type { Platform, WorkspaceType } from "@/lib/types/database"

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
  const [referralCodes, setReferralCodes] = useState<Array<{ role: string; referral_code: string }>>([])
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [isGeneratingCodes, setIsGeneratingCodes] = useState(false)

  const [postingFrequency, setPostingFrequency] = useState(7)
  const [activeContentTypes, setActiveContentTypes] = useState<typeof allContentTypes>([])
  const [bankContentTypes, setBankContentTypes] = useState<typeof allContentTypes>([])
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragSource, setDragSource] = useState<"active" | "bank" | null>(null)

  const [workspaceName, setWorkspaceName] = useState("")
  const [workspaceType, setWorkspaceType] = useState<WorkspaceType>("personal_creator")
  const [editCreators, setEditCreators] = useState<any[]>([])
  const [selectedPlatforms, setSelectedPlatforms] = useState<Record<number, string[]>>({})

  const [primaryNiche, setPrimaryNiche] = useState("")

  const [hasChanges, setHasChanges] = useState(false)
  const [initialState, setInitialState] = useState<any>(null)

  const allContentTypes = [
    { id: 1, name: "Storytelling", description: "B-Roll Narrative", icon: "📖" },
    { id: 2, name: "Behind the Scenes", description: "Day in the Life", icon: "🎬" },
    { id: 3, name: "Education", description: "Teach One Skill", icon: "📚" },
    { id: 4, name: "Entertainment", description: "Trending Format", icon: "🎥" },
    { id: 5, name: "Inspiration", description: "Save-Worthy Breakdown", icon: "💡" },
    { id: 6, name: "Trust", description: "Relatability / Split POV", icon: "🤝" },
    { id: 7, name: "Depth", description: "Proof / Long-Form", icon: "🔍" },
  ]

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (!initialState || !isEditing) return

    const changed =
      workspaceName !== initialState.workspaceName ||
      workspaceType !== initialState.workspaceType ||
      primaryNiche !== initialState.primaryNiche ||
      JSON.stringify(editCreators) !== JSON.stringify(initialState.editCreators) ||
      JSON.stringify(selectedPlatforms) !== JSON.stringify(initialState.selectedPlatforms) ||
      postingFrequency !== initialState.postingFrequency ||
      JSON.stringify(activeContentTypes) !== JSON.stringify(initialState.activeContentTypes)

    setHasChanges(changed)
  }, [
    workspaceName,
    workspaceType,
    primaryNiche,
    editCreators,
    selectedPlatforms,
    postingFrequency,
    activeContentTypes,
    initialState,
    isEditing,
  ])

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
        if (creatorsData.length > 0) {
          setPrimaryNiche(creatorsData[0].primary_niche || "")
        }
        const creatorsArray = creatorsData.map((c: any) => ({
          id: c.id,
          name: c.name,
          brandName: c.brand_name,
          primaryNiche: c.primary_niche,
          subNiches: c.creator_sub_niches?.map((sn: any) => sn.sub_niche) || [],
          platforms: c.creator_platforms?.map((cp: any) => cp.platform_id) || [],
        }))
        setEditCreators(creatorsArray)

        const platformsObj: Record<number, string[]> = {}
        creatorsData.forEach((c: any, idx: number) => {
          platformsObj[idx] = c.creator_platforms?.map((cp: any) => cp.platform_id) || []
        })
        setSelectedPlatforms(platformsObj)

        setInitialState({
          workspaceName: membershipData.workspaces.name,
          workspaceType: membershipData.workspaces.type,
          primaryNiche: creatorsData[0]?.primary_niche || "",
          editCreators: creatorsArray,
          selectedPlatforms: platformsObj,
          postingFrequency: 7, // Default for initial load
          activeContentTypes: allContentTypes.slice(0, 7), // Default for initial load
        })
      }

      const { data: teamMembersData } = await supabase
        .from("workspace_members")
        .select("*, user_profiles(first_name, last_name, email)")
        .eq("workspace_id", membershipData.workspaces.id)

      if (teamMembersData) {
        setTeamMembers(teamMembersData)
      }

      // Load referral codes
      const { data: referralCodesData } = await supabase
        .from("workspace_referral_codes")
        .select("role, referral_code")
        .eq("workspace_id", membershipData.workspaces.id)
        .order("role")
      
      setReferralCodes(referralCodesData || [])

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

  function handleCopyCode(code: string) {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const handleGenerateReferralCodes = async () => {
    if (!workspace?.id) return
    
    setIsGeneratingCodes(true)
    setError(null)

    try {
      const result = await generateReferralCodes(workspace.id)

      if (result?.error) {
        throw new Error(result.error)
      }

      // Reload data to show the new codes
      await loadData()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsGeneratingCodes(false)
    }
  }

  const handleStartEdit = () => {
    setIsEditing(true)
    setHasChanges(false)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setHasChanges(false)
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
          primary_niche: workspaceType === "personal_creator" ? primaryNiche : c.primaryNiche,
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

  const canEdit = membership?.role === "owner"

  const handleDragStart = (index: number, source: "active" | "bank") => {
    setDraggedIndex(index)
    setDragSource(source)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragSource(null)
  }

  const handleDrop = (target: "active" | "bank", targetIndex: number) => {
    if (draggedIndex !== null && dragSource !== null) {
      const draggedItem = dragSource === "active" ? activeContentTypes[draggedIndex] : bankContentTypes[draggedIndex]
      const newActive = [...activeContentTypes]
      const newBank = [...bankContentTypes]

      if (dragSource === "active") {
        newActive.splice(draggedIndex, 1)
      } else {
        newBank.splice(draggedIndex, 1)
      }

      if (target === "active") {
        newActive.splice(targetIndex, 0, draggedItem)
      } else {
        newBank.splice(targetIndex, 0, draggedItem)
      }

      setActiveContentTypes(newActive)
      setBankContentTypes(newBank)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <main className="container mx-auto p-6 space-y-6 flex-1">
          <Skeleton className="h-9 w-32 bg-muted" />
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
      <main className="container mx-auto p-6 space-y-6 flex-1">
        <h1 className="text-3xl font-bold">Settings</h1>

        <p className="text-muted-foreground">Configure workspace preferences and settings</p>

        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-sm text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {isEditing && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancelEdit} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !hasChanges}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              <Save className="size-4 mr-2" />
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        )}

        {isEditing && (
          <Accordion
            type="multiple"
            defaultValue={["workspace", "creators", "platforms", "framework", "team"]}
            className="space-y-4"
          >
            <AccordionItem value="workspace" className="border rounded-lg px-6 bg-white">
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

                {workspaceType === "personal_creator" && (
                  <div className="space-y-2">
                    <Label>Primary Niche</Label>
                    <Input
                      placeholder="Fitness, Tech, Finance, etc."
                      value={editCreators[0]?.primaryNiche || ""}
                      onChange={(e) => updateCreator(0, "primaryNiche", e.target.value)}
                    />
                  </div>
                )}

                <div className="space-y-3">
                  <Label>Workspace Type</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                      type="button"
                      onClick={() => setWorkspaceType("personal_creator")}
                      className={`flex flex-col items-center p-6 border-2 rounded-lg cursor-pointer transition-all ${
                        workspaceType === "personal_creator"
                          ? "border-primary bg-primary/5 shadow-md"
                          : "border-border hover:border-primary/50 hover:bg-muted/30"
                      }`}
                    >
                      <User className={`size-8 mb-3 ${workspaceType === "personal_creator" ? "text-primary" : ""}`} />
                      <span className="font-semibold text-center mb-2">Personal Creator</span>
                      <p className="text-sm text-muted-foreground text-center">Managing your own content and brand</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setWorkspaceType("manager")}
                      className={`flex flex-col items-center p-6 border-2 rounded-lg cursor-pointer transition-all ${
                        workspaceType === "manager"
                          ? "border-primary bg-primary/5 shadow-md"
                          : "border-border hover:border-primary/50 hover:bg-muted/30"
                      }`}
                    >
                      <Users className={`size-8 mb-3 ${workspaceType === "manager" ? "text-primary" : ""}`} />
                      <span className="font-semibold text-center mb-2">Manager of Creators</span>
                      <p className="text-sm text-muted-foreground text-center">Managing one or more creator brands</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setWorkspaceType("team_agency")}
                      className={`flex flex-col items-center p-6 border-2 rounded-lg cursor-pointer transition-all ${
                        workspaceType === "team_agency"
                          ? "border-primary bg-primary/5 shadow-md"
                          : "border-border hover:border-primary/50 hover:bg-muted/30"
                      }`}
                    >
                      <Building2 className={`size-8 mb-3 ${workspaceType === "team_agency" ? "text-primary" : ""}`} />
                      <span className="font-semibold text-center mb-2">Team / Agency</span>
                      <p className="text-sm text-muted-foreground text-center">
                        Managing multiple creators with a full team
                      </p>
                    </button>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="creators" className="border rounded-lg px-6 bg-white">
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
                    <p className="text-sm text-muted-foreground">
                      As a personal creator, you manage your own content and brand.
                    </p>
                    <div className="space-y-2">
                      <Label>Primary Niche</Label>
                      <Input
                        placeholder="Fitness, Tech, Finance, etc."
                        value={primaryNiche}
                        onChange={(e) => setPrimaryNiche(e.target.value)}
                      />
                    </div>
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

            <AccordionItem value="platforms" className="border rounded-lg px-6 bg-white">
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
                  <div key={idx} className="space-y-4">
                    {workspaceType !== "personal_creator" && (
                      <h3 className="font-medium text-lg">{creator.name || `Creator ${idx + 1}`}</h3>
                    )}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {platforms.map((platform) => {
                        const isSelected = selectedPlatforms[idx]?.includes(platform.id)

                        const platformConfig: Record<
                          string,
                          { icon: string; bg: string; border: string; text: string }
                        > = {
                          youtube: {
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

                        const config = platformConfig[platform.name.toLowerCase()] || {
                          icon: "",
                          bg: "bg-gray-50",
                          border: "border-gray-400",
                          text: "text-gray-700",
                        }

                        return (
                          <div
                            key={platform.id}
                            className={`
                              flex flex-col items-center justify-center p-4 rounded-lg cursor-pointer transition-all
                              ${
                                isSelected
                                  ? `${config.bg} border-2 ${config.border} shadow-md`
                                  : "bg-background border border-border hover:bg-muted/50"
                              }
                            `}
                            onClick={() => togglePlatform(idx, platform.id)}
                          >
                            {config.icon ? (
                              <img
                                src={config.icon || "/placeholder.svg"}
                                alt={platform.name}
                                className="w-8 h-8 mb-2"
                              />
                            ) : (
                              <span className="text-2xl mb-2">🔗</span>
                            )}
                            <span className={`text-sm font-medium ${isSelected ? config.text : "text-foreground"}`}>
                              {platform.name}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="framework" className="border rounded-lg px-6 bg-white">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold">@jun_yuh Content Framework</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-6 pt-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    @jun_yuh 7-Day Content Operating System
                  </h4>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    This framework ensures consistent content variety and strategic planning. Each day type has a
                    specific purpose to engage and grow your audience.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>How many days per week will you post?</Label>
                  <Select
                    value={postingFrequency.toString()}
                    onValueChange={(v) => {
                      const freq = Number.parseInt(v)
                      setPostingFrequency(freq)
                      const newActive = allContentTypes.slice(0, freq)
                      const newBank = allContentTypes.slice(freq)
                      setActiveContentTypes(newActive)
                      setBankContentTypes(newBank)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 days / week</SelectItem>
                      <SelectItem value="4">4 days / week</SelectItem>
                      <SelectItem value="5">5 days / week</SelectItem>
                      <SelectItem value="6">6 days / week</SelectItem>
                      <SelectItem value="7">7 days / week</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-3">Your Weekly Schedule</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {activeContentTypes.map((contentType, index) => {
                        const isDragging = draggedIndex === index && dragSource === "active"

                        return (
                          <div key={contentType.id} className="space-y-2">
                            <p className="text-center font-bold text-sm text-muted-foreground">Day {index + 1}</p>
                            <div
                              draggable
                              onDragStart={() => handleDragStart(index, "active")}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={() => handleDrop("active", index)}
                              onDragEnd={() => handleDragEnd()}
                              className={`relative border-2 rounded-lg p-4 cursor-move transition-all ${
                                isDragging
                                  ? "border-dashed border-muted-foreground bg-muted/30"
                                  : "border-border bg-card hover:border-primary/50"
                              }`}
                            >
                              {isDragging ? (
                                <div className="flex flex-col items-center justify-center h-24 text-muted-foreground">
                                  <GripVertical className="w-6 h-6 mb-2" />
                                  <p className="text-sm">Drop here</p>
                                </div>
                              ) : (
                                <>
                                  <GripVertical className="absolute top-2 right-2 w-5 h-5 text-muted-foreground" />
                                  <div className="text-3xl mb-2">{contentType.icon}</div>
                                  <h3 className="font-semibold text-lg">{contentType.name}</h3>
                                  <p className="text-sm text-muted-foreground">{contentType.description}</p>
                                </>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {bankContentTypes.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-3">Content Bank (Drag to swap)</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {bankContentTypes.map((contentType, index) => (
                          <div
                            key={contentType.id}
                            draggable
                            onDragStart={() => handleDragStart(index, "bank")}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={() => handleDrop("bank", index)}
                            onDragEnd={() => handleDragEnd()}
                            className="relative border-2 border-dashed border-muted-foreground rounded-lg p-4 cursor-move hover:border-primary/50 transition-all bg-muted/30"
                          >
                            <GripVertical className="absolute top-2 right-2 w-4 h-4 text-muted-foreground" />
                            <div className="text-2xl mb-2">{contentType.icon}</div>
                            <h3 className="font-semibold">{contentType.name}</h3>
                            <p className="text-xs text-muted-foreground">{contentType.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="team" className="border rounded-lg px-6 bg-white">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <Users className="size-5" />
                  <span className="text-lg font-semibold">Team Members</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                {workspaceType === "personal_creator" ? (
                  <div className="p-4 bg-muted/50 rounded-lg text-center">
                    <p className="text-sm text-muted-foreground">
                      Team members are not available for Personal Creator workspaces. Upgrade to Manager of Creators or
                      Team/Agency to add team members.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4">
                      <h3 className="font-semibold">Current Team</h3>
                      {teamMembers.map((member: any) => (
                        <Card key={member.id} className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">
                                {member.user_profiles?.first_name} {member.user_profiles?.last_name}
                              </p>
                              <p className="text-sm text-muted-foreground">{member.user_profiles?.email}</p>
                            </div>
                            <Badge variant="outline">{member.role}</Badge>
                          </div>
                        </Card>
                      ))}
                    </div>

                    <div className="space-y-4">
                      <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                          Team Member Referral Codes
                        </h4>
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                          Share these codes with team members. They'll use the code when signing up to join your workspace.
                        </p>
                      </div>
                      
                      {referralCodes.length > 0 ? (
                        <div className="space-y-3">
                          {referralCodes.map((refCode) => (
                            <div key={refCode.role} className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold capitalize">{refCode.role}</span>
                                  <Badge variant="outline" className="font-mono text-xs">
                                    {refCode.referral_code}
                                  </Badge>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCopyCode(refCode.referral_code)}
                                className="ml-2"
                              >
                                {copiedCode === refCode.referral_code ? (
                                  <Check className="size-4 text-green-500" />
                                ) : (
                                  <Copy className="size-4" />
                                )}
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-sm text-muted-foreground">
                            Referral codes haven't been generated yet for this workspace.
                          </p>
                          <Button
                            onClick={handleGenerateReferralCodes}
                            disabled={isGeneratingCodes}
                            className="bg-accent text-accent-foreground hover:bg-accent/90"
                          >
                            {isGeneratingCodes ? "Generating..." : "Generate Referral Codes"}
                          </Button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}

        {isEditing && membership?.role === "owner" && (
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

        {!isEditing && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Workspace Information</CardTitle>
              {canEdit && (
                <Button onClick={handleStartEdit} className="bg-accent text-accent-foreground hover:bg-accent/90">
                  Edit Workspace
                </Button>
              )}
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
            <DialogHeader>
              <DialogTitle>Delete Workspace</DialogTitle>
              <DialogDescription>
                This action cannot be undone. This will permanently delete your workspace and all associated data.
              </DialogDescription>
            </DialogHeader>
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
