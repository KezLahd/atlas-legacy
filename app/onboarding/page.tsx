"use client"

import { useState, useEffect, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { GripVertical } from "lucide-react"
import { Users, Building2, User, Plus, X, ArrowLeft, ArrowRight } from "lucide-react"
import { AtlasLogo } from "@/components/atlas-logo"
import type { WorkspaceType, Platform, UserRole } from "@/lib/types/database"
import { createWorkspaceWithCreators } from "@/app/actions/onboarding"

export default function OnboardingPage() {
  const router = useRouter()
  const [supabase] = useMemo(() => [createClient()], [])
  const [step, setStep] = useState<OnboardingStep>(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userProfile, setUserProfile] = useState<{
    first_name: string | null
    last_name: string | null
  } | null>(null)

  // Step 1: Workspace Type
  const [workspaceType, setWorkspaceType] = useState<WorkspaceType>("personal_creator")
  const [workspaceName, setWorkspaceName] = useState("")

  // Step 2: Creator Setup
  const [creators, setCreators] = useState<CreatorData[]>([
    {
      name: "",
      brandName: "",
      primaryNiche: "",
      subNiches: [],
      entityType: "creator", // Track if this is a creator or brand
    },
  ])
  const [currentCreatorIndex, setCurrentCreatorIndex] = useState(0)

  // Step 3: Platforms
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [selectedPlatforms, setSelectedPlatforms] = useState<Record<number, string[]>>({})

  // Step 4: Team Invites
  const [invites, setInvites] = useState<TeamInvite[]>([])
  const [createdCreatorIds, setCreatedCreatorIds] = useState<string[]>([])

  // Step 5: Posting Frequency

  const allContentTypes = [
    { id: 1, name: "Storytelling", description: "B-Roll Narrative", icon: "📖" },
    { id: 2, name: "Behind the Scenes", description: "Day in the Life", icon: "🎬" },
    { id: 3, name: "Education", description: "Teach One Skill", icon: "📚" },
    { id: 4, name: "Entertainment", description: "Trending Format", icon: "🎥" },
    { id: 5, name: "Inspiration", description: "Save-Worthy Breakdown", icon: "💡" },
    { id: 6, name: "Trust", description: "Relatability / Split POV", icon: "🤝" },
    { id: 7, name: "Depth", description: "Proof / Long-Form", icon: "🔍" },
  ]

  const getInitialSchedule = (frequency: number) => {
    const presets: Record<number, number[]> = {
      3: [1, 3, 4], // Storytelling, Education, Entertainment
      4: [1, 3, 4, 5], // Add Inspiration
      5: [1, 2, 3, 4, 5], // Add Behind the Scenes, exclude Trust and Depth
      6: [1, 2, 3, 4, 5, 6], // Add Trust, exclude Depth
      7: [1, 2, 3, 4, 5, 6, 7], // All 7
    }

    const activeIds = presets[frequency] || presets[7]
    const active = allContentTypes.filter((ct) => activeIds.includes(ct.id))
    const bank = allContentTypes.filter((ct) => !activeIds.includes(ct.id))

    return { active, bank }
  }

  const [postingFrequency, setPostingFrequency] = useState(7)
  const [activeContentTypes, setActiveContentTypes] = useState(getInitialSchedule(7).active)
  const [bankContentTypes, setBankContentTypes] = useState(getInitialSchedule(7).bank)

  useEffect(() => {
    const { active, bank } = getInitialSchedule(postingFrequency)
    setActiveContentTypes(active)
    setBankContentTypes(bank)
  }, [postingFrequency])

  // CHANGE Removed excludedDayType, now using activeContentTypes and bankContentTypes
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragSource, setDragSource] = useState<"active" | "bank" | null>(null)

  // CHANGE Initialize active and bank content based on posting frequency
  // Removed useEffect hook that was initializing content types based on postingFrequency.
  // This logic is now handled by getInitialSchedule and the useEffect hook above.

  const resetFormData = () => {
    setCreators([
      {
        name: "",
        brandName: "",
        primaryNiche: "",
        subNiches: [],
        entityType: "creator",
      },
    ])
    setCurrentCreatorIndex(0)
    setSelectedPlatforms({})
    setInvites([])
    setCreatedCreatorIds([])
    setPostingFrequency(7)
    // CHANGE Reset active and bank content
    const { active, bank } = getInitialSchedule(7)
    setActiveContentTypes(active)
    setBankContentTypes(bank)
  }

  useEffect(() => {
    loadPlatforms()
    loadUserProfile()
  }, [])

  const loadUserProfile = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        const { data, error } = await supabase
          .from("user_profiles")
          .select("first_name, last_name")
          .eq("id", user.id)
          .single()

        console.log("[v0] User profile fetch:", { data, error })

        if (data) {
          setUserProfile(data)
        } else {
          console.log("[v0] No profile found, setting default")
          setUserProfile({
            first_name: user.user_metadata?.first_name || user.email?.split("@")[0] || "Your",
            last_name: user.user_metadata?.last_name || "Name",
          })
        }
      }
    } catch (error) {
      console.error("[v0] Error loading user profile:", error)
    }
  }

  const loadPlatforms = async () => {
    const { data } = await supabase.from("platforms").select("*").order("name")
    if (data) setPlatforms(data)
  }

  const addSubNiche = (creatorIndex: number) => {
    const newCreators = [...creators]
    if (newCreators[creatorIndex].subNiches.length < 5) {
      newCreators[creatorIndex].subNiches.push({ subNiche: "" })
      setCreators(newCreators)
    }
  }

  const removeSubNiche = (creatorIndex: number, subNicheIndex: number) => {
    const newCreators = [...creators]
    newCreators[creatorIndex].subNiches.splice(subNicheIndex, 1)
    setCreators(newCreators)
  }

  const updateSubNiche = (creatorIndex: number, subNicheIndex: number, value: string) => {
    const newCreators = [...creators]
    newCreators[creatorIndex].subNiches[subNicheIndex].subNiche = value
    setCreators(newCreators)
  }

  const addCreator = () => {
    setCreators([
      ...creators,
      {
        name: "",
        brandName: "",
        primaryNiche: "",
        subNiches: [],
        entityType: "creator", // Default to creator
      },
    ])
  }

  const removeCreator = (index: number) => {
    const newCreators = creators.filter((_, i) => i !== index)
    setCreators(newCreators)
    if (currentCreatorIndex >= newCreators.length) {
      setCurrentCreatorIndex(newCreators.length - 1)
    }
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
    setInvites([...invites, { firstName: "", lastName: "", email: "", role: "viewer", creatorIds: [] }])
  }

  const removeInvite = (index: number) => {
    setInvites(invites.filter((_, i) => i !== index))
  }

  const updateInvite = (index: number, field: keyof TeamInvite, value: any) => {
    const newInvites = [...invites]
    newInvites[index][field] = value
    setInvites(newInvites)
  }

  const handleSubmit = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const contentTypeOrderIds = activeContentTypes.map((ct) => ct.id)

      let creatorsData
      if (workspaceType === "personal_creator") {
        creatorsData = [
          {
            name: "",
            brand_name: "",
            primary_niche: creators[0]?.primaryNiche || "",
            sub_niches: creators[0]?.subNiches.map((sn) => sn.subNiche).filter(Boolean) || [],
            platforms: selectedPlatforms[0] || [],
            entity_type: "creator",
            posting_frequency: postingFrequency,
            excluded_day_types: [], // This field is no longer used based on the frontend changes
            content_type_order: contentTypeOrderIds,
          },
        ]
      } else {
        creatorsData = creators
          .filter((c) => {
            if (c.entityType === "creator") {
              return c.name && c.primaryNiche
            } else {
              return c.brandName && c.primaryNiche
            }
          })
          .map((c, i) => ({
            name: c.entityType === "creator" ? c.name : "",
            brand_name: c.entityType === "brand" ? c.brandName : c.brandName || "",
            primary_niche: c.primaryNiche,
            sub_niches: c.subNiches.map((sn) => sn.subNiche).filter(Boolean),
            platforms: selectedPlatforms[i] || [],
            entity_type: c.entityType,
            posting_frequency: postingFrequency,
            excluded_day_types: [], // This field is no longer used based on the frontend changes
            content_type_order: contentTypeOrderIds,
          }))
      }

      const invitationsData = invites
        .filter((inv) => inv.email && inv.firstName && inv.lastName)
        .map((inv) => ({
          first_name: inv.firstName,
          last_name: inv.lastName,
          email: inv.email,
          role: inv.role,
        }))

      const result = await createWorkspaceWithCreators({
        workspace: {
          name: workspaceName || "My Workspace",
          type: workspaceType,
        },
        creators: creatorsData,
        invitations: invitationsData,
      })

      if (result?.error) {
        throw new Error(result.error)
      }
    } catch (err: any) {
      setError(err.message)
      setIsLoading(false)
    }
  }

  const canProceed = () => {
    switch (step) {
      case 1:
        return workspaceName.trim().length > 0
      case 2:
        if (workspaceType === "personal_creator") {
          return creators[0]?.primaryNiche?.trim().length > 0
        }
        const currentCreator = creators[currentCreatorIndex]
        if (currentCreator?.entityType === "creator") {
          return currentCreator?.name && currentCreator?.primaryNiche
        } else {
          return currentCreator?.brandName && currentCreator?.primaryNiche
        }
      case 3:
        return true
      case 4:
        return true
      case 5:
        return postingFrequency >= 3 && postingFrequency <= 7
      default:
        return false
    }
  }

  const progress = (step / 5) * 100

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

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-4">
            <AtlasLogo size={40} showText />
          </div>
          <p className="text-muted-foreground">Step {step} of 5</p>
          <Progress value={progress} className="mt-4" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {step === 1 && "Choose your workspace type"}
              {step === 2 && workspaceType === "personal_creator" && "Set up your content niche"}
              {step === 2 && workspaceType !== "personal_creator" && "Add creators"}
              {step === 3 && "Select platforms"}
              {step === 4 && "Invite your team"}
              {step === 5 && "Set posting frequency"}
            </CardTitle>
            {step !== 5 && (
              <CardDescription>
                {step === 1 && "Select the type that best describes your content operation"}
                {step === 2 && workspaceType === "personal_creator" && "Define your content focus and sub-niches"}
                {step === 2 &&
                  workspaceType !== "personal_creator" &&
                  "Set up creator profiles with niches and sub-niches"}
                {step === 3 && "Choose where your content will be published"}
                {step === 4 && "Add team members to collaborate (optional)"}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {step === 1 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>Workspace Name</Label>
                  <Input
                    placeholder="My Content Studio"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                  />
                </div>
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
                      <p className="text-sm text-muted-foreground text-center">
                        {"You're the creator - managing your own content and brand"}
                      </p>
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
              </div>
            )}

            {step === 2 && workspaceType === "personal_creator" && (
              <div className="space-y-6">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    {"You'll be set up as the creator using your profile name: "}
                    <span className="font-bold text-foreground">
                      {`${userProfile?.first_name || ""} ${userProfile?.last_name || ""}`.trim() || "Your Name"}
                    </span>
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Primary Niche</Label>
                    <Input
                      placeholder="Fitness, Tech, Finance, etc."
                      value={creators[0]?.primaryNiche || ""}
                      onChange={(e) => {
                        const newCreators = [...creators]
                        newCreators[0].primaryNiche = e.target.value
                        setCreators(newCreators)
                      }}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Sub-Niches (up to 5)</Label>
                      {creators[0]?.subNiches.length < 5 && (
                        <Button variant="outline" size="sm" onClick={() => addSubNiche(0)}>
                          <Plus className="size-3 mr-1" />
                          Add
                        </Button>
                      )}
                    </div>
                    {creators[0]?.subNiches.map((subNiche, idx) => (
                      <div key={idx} className="flex gap-2">
                        <Input
                          placeholder="Sub-niche name"
                          className="flex-1"
                          value={subNiche.subNiche}
                          onChange={(e) => updateSubNiche(0, idx, e.target.value)}
                        />
                        <Button variant="ghost" size="icon" onClick={() => removeSubNiche(0, idx)}>
                          <X className="size-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 2 && workspaceType !== "personal_creator" && (
              <div className="space-y-6">
                {creators.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {creators.map((creator, idx) => (
                      <Button
                        key={idx}
                        variant={currentCreatorIndex === idx ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentCreatorIndex(idx)}
                      >
                        {creator.entityType === "creator"
                          ? creator.name || `Creator ${idx + 1}`
                          : creator.brandName || `Brand ${idx + 1}`}
                      </Button>
                    ))}
                    <Button variant="outline" size="sm" onClick={addCreator}>
                      <Plus className="size-4" />
                    </Button>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Entity Type</Label>
                  <div className="flex gap-2">
                    <Button
                      variant={creators[currentCreatorIndex]?.entityType === "creator" ? "default" : "outline"}
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        const newCreators = [...creators]
                        newCreators[currentCreatorIndex].entityType = "creator"
                        setCreators(newCreators)
                      }}
                    >
                      Creator
                    </Button>
                    <Button
                      variant={creators[currentCreatorIndex]?.entityType === "brand" ? "default" : "outline"}
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        const newCreators = [...creators]
                        newCreators[currentCreatorIndex].entityType = "brand"
                        setCreators(newCreators)
                      }}
                    >
                      Brand
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  {creators[currentCreatorIndex]?.entityType === "creator" ? (
                    <div className="space-y-2">
                      <Label>Creator Name</Label>
                      <Input
                        placeholder="John Doe"
                        value={creators[currentCreatorIndex]?.name || ""}
                        onChange={(e) => {
                          const newCreators = [...creators]
                          newCreators[currentCreatorIndex].name = e.target.value
                          setCreators(newCreators)
                        }}
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label>Brand Name</Label>
                      <Input
                        placeholder="The John Doe Show"
                        value={creators[currentCreatorIndex]?.brandName || ""}
                        onChange={(e) => {
                          const newCreators = [...creators]
                          newCreators[currentCreatorIndex].brandName = e.target.value
                          setCreators(newCreators)
                        }}
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Primary Niche</Label>
                    <Input
                      placeholder="Fitness, Tech, Finance, etc."
                      value={creators[currentCreatorIndex]?.primaryNiche || ""}
                      onChange={(e) => {
                        const newCreators = [...creators]
                        newCreators[currentCreatorIndex].primaryNiche = e.target.value
                        setCreators(newCreators)
                      }}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Sub-Niches (up to 5)</Label>
                      {creators[currentCreatorIndex]?.subNiches.length < 5 && (
                        <Button variant="outline" size="sm" onClick={() => addSubNiche(currentCreatorIndex)}>
                          <Plus className="size-3 mr-1" />
                          Add
                        </Button>
                      )}
                    </div>
                    {creators[currentCreatorIndex]?.subNiches.map((subNiche, idx) => (
                      <div key={idx} className="flex gap-2">
                        <Input
                          placeholder="Sub-niche name"
                          className="flex-1"
                          value={subNiche.subNiche}
                          onChange={(e) => updateSubNiche(currentCreatorIndex, idx, e.target.value)}
                        />
                        <Button variant="ghost" size="icon" onClick={() => removeSubNiche(currentCreatorIndex, idx)}>
                          <X className="size-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                {creators.length === 1 && (
                  <Button variant="outline" onClick={addCreator} className="w-full bg-transparent">
                    <Plus className="size-4 mr-2" />
                    Add Another Creator/Brand
                  </Button>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                {creators.map((creator, idx) => (
                  <div key={idx} className="space-y-4">
                    {(workspaceType !== "personal_creator" || idx === 0) && (
                      <>
                        {workspaceType !== "personal_creator" && (
                          <h3 className="font-medium text-lg">
                            {creator.entityType === "creator"
                              ? creator.name || `Creator ${idx + 1}`
                              : creator.brandName || `Brand ${idx + 1}`}
                          </h3>
                        )}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {platforms.map((platform) => {
                            const isSelected = selectedPlatforms[idx]?.includes(platform.id)

                            // Platform icon paths and brand colors
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
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {workspaceType === "personal_creator"
                    ? "Invite your management team to help with strategy, editing, and viewing your content."
                    : workspaceType === "team_agency"
                      ? "Add team members and assign them to specific creators"
                      : "You can invite team members now or skip and do it later from settings."}
                </p>

                {invites.map((invite, idx) => (
                  <div key={idx} className="p-4 border rounded-lg space-y-3">
                    <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
                      <Input
                        placeholder="First name"
                        value={invite.firstName}
                        onChange={(e) => updateInvite(idx, "firstName", e.target.value)}
                      />
                      <Input
                        placeholder="Last name"
                        value={invite.lastName}
                        onChange={(e) => updateInvite(idx, "lastName", e.target.value)}
                      />
                      <Button variant="ghost" size="icon" onClick={() => removeInvite(idx)}>
                        <X className="size-4" />
                      </Button>
                    </div>

                    <div className="flex gap-2">
                      <Input
                        placeholder="email@example.com"
                        type="email"
                        className="flex-1"
                        value={invite.email}
                        onChange={(e) => updateInvite(idx, "email", e.target.value)}
                      />
                      <Select value={invite.role} onValueChange={(value) => updateInvite(idx, "role", value)}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="viewer">Viewer</SelectItem>
                          <SelectItem value="editor">Editor</SelectItem>
                          <SelectItem value="strategist">Strategist</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          {workspaceType !== "personal_creator" && <SelectItem value="creator">Creator</SelectItem>}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}

                <Button variant="outline" onClick={addInvite} className="w-full bg-transparent">
                  <Plus className="size-4 mr-2" />
                  Add Team Member
                </Button>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-6">
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
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex items-center justify-between gap-4">
              {step > 1 && (
                <Button
                  variant="outline"
                  onClick={() => {
                    if (step === 2) {
                      resetFormData()
                    }
                    setStep((prev) => (prev - 1) as OnboardingStep)
                  }}
                  disabled={isLoading}
                >
                  <ArrowLeft className="size-4 mr-2" />
                  Back
                </Button>
              )}
              <Button
                onClick={() => {
                  if (step < 5) {
                    setStep((prev) => (prev + 1) as OnboardingStep)
                  } else {
                    handleSubmit()
                  }
                }}
                disabled={!canProceed() || isLoading}
                className={step === 1 ? "ml-auto" : "flex-1"}
              >
                {isLoading ? "Setting up..." : step === 5 ? "Complete Setup" : "Next"}
                {step < 5 && <ArrowRight className="size-4 ml-2" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

type OnboardingStep = 1 | 2 | 3 | 4 | 5

interface SubNiche {
  subNiche: string
}

interface CreatorData {
  name: string
  brandName: string
  primaryNiche: string
  subNiches: SubNiche[]
  entityType: "creator" | "brand"
}

interface TeamInvite {
  firstName: string
  lastName: string
  email: string
  role: UserRole
  creatorIds: string[]
}
