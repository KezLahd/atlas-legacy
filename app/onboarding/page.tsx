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
import { GripVertical, Users, Building2, User, Plus, X, ArrowLeft, ArrowRight } from "lucide-react"
import { AtlasLogo } from "@/components/atlas-logo"
import type { WorkspaceType, Platform, UserRole } from "@/lib/types/database"
import { createWorkspaceWithCreators, joinWorkspaceWithReferralCode } from "@/app/actions/onboarding"

export default function OnboardingPage() {
  const router = useRouter()
  const [supabase] = useMemo(() => [createClient()], [])
  const [step, setStep] = useState<OnboardingStep>(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [workspaceChoice, setWorkspaceChoice] = useState<"creating" | "joining" | null>(null)
  const [referralCode, setReferralCode] = useState("")
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

  // Step 4: Removed - referral codes are generated automatically after workspace creation
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

  // Invite functions removed - referral codes are used instead

  const handleSubmit = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const contentTypeOrderIds = activeContentTypes.map((ct) => ct.id)

      let creatorsData: Array<{
        name: string
        brand_name?: string
        primary_niche: string
        sub_niches: string[]
        platforms: string[]
        entity_type?: "creator" | "brand"
        posting_frequency: number
        excluded_day_types: number[]
        content_type_order: number[]
      }>
      if (workspaceType === "personal_creator") {
        creatorsData = [
          {
            name: "",
            brand_name: "",
            primary_niche: creators[0]?.primaryNiche || "",
            sub_niches: creators[0]?.subNiches.map((sn) => sn.subNiche).filter(Boolean) || [],
            platforms: selectedPlatforms[0] || [],
            entity_type: "creator" as const,
            posting_frequency: postingFrequency,
            excluded_day_types: [], // This field is no longer used based on the frontend changes
            content_type_order: contentTypeOrderIds,
          },
        ]
      } else {
        // For team/manager, no creators are created during onboarding
        // Creators will be added via referral codes later
        creatorsData = []
      }

      const result = await createWorkspaceWithCreators({
        workspace: {
          name: workspaceName || "My Workspace",
          type: workspaceType,
        },
        creators: creatorsData,
        invitations: [], // Referral codes are generated automatically, no email invites needed
      })

      if (result?.error) {
        throw new Error(result.error)
      }

      // Redirect to dashboard for all workspace types
      // For team/manager, pass query parameter to show referral codes dialog
      if (workspaceType !== "personal_creator" && result?.workspaceId) {
        router.push("/dashboard?showReferralCodes=true")
      } else {
        router.push("/dashboard")
      }
    } catch (err: any) {
      setError(err.message)
      setIsLoading(false)
    }
  }


  // Helper function to get the current step number for display (1-based, excluding step 0)
  const getCurrentStepNumber = (): number => {
    if (workspaceType === "personal_creator") {
      // For personal_creator, map steps: 0->0, 1->1, 2->2, 3->3, 5->4 (skip step 4)
      if (step === 0) return 0
      if (step === 1) return 1
      if (step === 2) return 2
      if (step === 3) return 3
      if (step === 5) return 4
      return step
    } else {
      // For team/manager, map steps: 0->0, 1->1, 4->2
      if (step === 0) return 0
      if (step === 1) return 1
      if (step === 4) return 2
      return step
    }
  }

  // Helper function to get the next step
  const getNextStep = (currentStep: OnboardingStep): OnboardingStep => {
    if (workspaceType === "personal_creator") {
      // For personal_creator, skip step 4
      if (currentStep === 3) {
        return 5 // Skip from step 3 to step 5 (skipping 4)
      } else if (currentStep < 5) {
        return (currentStep + 1) as OnboardingStep
      }
      return 5
    } else {
      // For team/manager, skip steps 2, 3, and 5
      if (currentStep === 1) {
        return 4 // Skip from step 1 to step 4 (skipping 2 and 3)
      } else if (currentStep === 4) {
        // Step 4 is the last step for team/manager (skip step 5)
        return 4 // Stay at step 4, but handleSubmit will be called
      }
      return currentStep
    }
  }

  // Helper function to get the previous step
  const getPreviousStep = (currentStep: OnboardingStep): OnboardingStep => {
    if (workspaceType === "personal_creator") {
      // For personal_creator, skip step 4
      if (currentStep === 5) {
        return 3 // Skip from step 5 back to step 3 (skipping 4)
      } else if (currentStep > 0) {
        return (currentStep - 1) as OnboardingStep
      }
      return 0
    } else {
      // For team/manager, skip steps 2, 3, and 5
      if (currentStep === 4) {
        return 1 // Skip from step 4 back to step 1 (skipping 3 and 2)
      } else if (currentStep > 0) {
        return (currentStep - 1) as OnboardingStep
      }
      return 0
    }
  }

  // Helper function to get total number of content steps (excluding step 0)
  const getTotalSteps = () => {
    return workspaceType === "personal_creator" ? 4 : 2 // Personal: 4 steps (1, 2, 3, 5), Team/Manager: 2 steps (1, 4)
  }

  const canProceed = () => {
    switch (step) {
      case 0:
        return workspaceChoice !== null
      case 1:
        return workspaceName.trim().length > 0
      case 2:
        // Step 2 only exists for personal_creator
        if (workspaceType === "personal_creator") {
          return creators[0]?.primaryNiche?.trim().length > 0
        }
        return true // Should never reach here for team/manager
      case 3:
        return true
      case 4:
        return true // Step 4 is informational, always can proceed
      case 5:
        return postingFrequency >= 3 && postingFrequency <= 7
      default:
        return false
    }
  }

  const progress = step === 0 ? 0 : ((getCurrentStepNumber() / getTotalSteps()) * 100)

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
        <div className="mb-8 text-center space-y-2 relative">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="absolute top-0 right-0 p-2 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-foreground"
            title="Return to home"
          >
            <X className="size-5" />
          </button>
          <div className="flex items-center justify-center gap-2 mb-4">
            <AtlasLogo className="size-10" showText />
          </div>
          <p className="text-muted-foreground">
            {step === 0 ? "Get Started" : `Step ${getCurrentStepNumber()} of ${getTotalSteps()}`}
          </p>
          <Progress value={progress} className="mt-4" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {step === 0 && workspaceChoice === "joining" && (
                <button
                  type="button"
                  onClick={() => {
                    setWorkspaceChoice(null)
                    setReferralCode("")
                    setError(null)
                  }}
                  className="p-1 hover:bg-muted rounded-md transition-colors"
                  disabled={isLoading}
                >
                  <ArrowLeft className="size-4" />
                </button>
              )}
              {step === 0 && "Get Started"}
              {step === 1 && "Choose your workspace type"}
              {step === 2 && workspaceType === "personal_creator" && "Set up your content niche"}
              {step === 3 && workspaceType === "personal_creator" && "Select platforms"}
              {step === 4 && workspaceType !== "personal_creator" && "Team member referral codes"}
              {step === 5 && workspaceType === "personal_creator" && "Set posting frequency"}
            </CardTitle>
            {step !== 5 && (
              <CardDescription>
                {step === 0 && "Are you creating a new workspace or joining an existing one?"}
                {step === 1 && "Select the type that best describes your content operation"}
                {step === 2 && workspaceType === "personal_creator" && "Define your content focus and sub-niches"}
                {step === 3 && workspaceType === "personal_creator" && "Choose where your content will be published"}
                {step === 4 && workspaceType !== "personal_creator" && "Referral codes will be generated after workspace creation"}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {step === 0 && (
              <div className="space-y-6">
                {!workspaceChoice ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => {
                        setWorkspaceChoice("creating")
                        setStep(1)
                      }}
                      className="flex flex-col items-center p-8 border-2 rounded-lg cursor-pointer transition-all border-border hover:border-primary/50 hover:bg-muted/30"
                    >
                      <Building2 className="size-12 mb-4 text-primary" />
                      <span className="font-semibold text-lg mb-2">Creating a Workspace</span>
                      <p className="text-sm text-muted-foreground text-center">
                        Start a new workspace and set up your content operation from scratch
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setWorkspaceChoice("joining")}
                      className="flex flex-col items-center p-8 border-2 rounded-lg cursor-pointer transition-all border-border hover:border-primary/50 hover:bg-muted/30"
                    >
                      <Users className="size-12 mb-4 text-primary" />
                      <span className="font-semibold text-lg mb-2">Joining a Workspace</span>
                      <p className="text-sm text-muted-foreground text-center">
                        Join an existing workspace using a referral code from your team
                      </p>
                    </button>
                  </div>
                ) : workspaceChoice === "joining" ? (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="referralCode">Referral Code</Label>
                      <Input
                        id="referralCode"
                        type="text"
                        placeholder="Enter referral code"
                        value={referralCode}
                        onChange={(e) => setReferralCode(e.target.value.toUpperCase().trim())}
                        className="font-mono text-lg"
                      />
                      <p className="text-xs text-muted-foreground">
                        Enter the referral code provided by your workspace owner or team member
                      </p>
                    </div>
                    {error && <p className="text-sm text-destructive">{error}</p>}
                    <div className="flex items-center justify-end gap-4">
                      <Button
                        onClick={async () => {
                          if (!referralCode.trim()) {
                            setError("Please enter a referral code")
                            return
                          }
                          setIsLoading(true)
                          setError(null)
                          
                          try {
                            const result = await joinWorkspaceWithReferralCode(referralCode)
                            if (result?.error) {
                              setError(result.error)
                            }
                            // If successful, redirect happens in the server action
                          } catch (err: any) {
                            setError(err.message || "Failed to join workspace")
                            setIsLoading(false)
                          }
                        }}
                        disabled={!referralCode.trim() || isLoading}
                        className="ml-auto"
                      >
                        {isLoading ? "Joining..." : "Join Workspace"}
                        <ArrowRight className="size-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
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


            {step === 3 && workspaceType === "personal_creator" && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {platforms.map((platform) => {
                      const isSelected = selectedPlatforms[0]?.includes(platform.id)

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
                          onClick={() => togglePlatform(0, platform.id)}
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
              </div>
            )}

            {step === 4 && workspaceType !== "personal_creator" && (
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    Team Member Referral Codes
                  </h4>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    After your workspace is created, referral codes will be automatically generated for each role. 
                    You can share these codes with team members from the Team page or Settings page. 
                    Team members will use these codes when signing up to join your workspace.
                  </p>
                </div>
              </div>
            )}

            {step === 5 && workspaceType === "personal_creator" && (
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

            {step > 0 && (
              <div className="flex items-center justify-between gap-4">
                {step >= 1 && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (step === 2 && workspaceType === "personal_creator") {
                        resetFormData()
                      }
                      if (step === 1) {
                        // Go back to workspace selection
                        setStep(0)
                        setWorkspaceChoice(null)
                      } else {
                        setStep(getPreviousStep(step))
                      }
                    }}
                    disabled={isLoading}
                  >
                    <ArrowLeft className="size-4 mr-2" />
                    Back
                  </Button>
                )}
                <Button
                  onClick={() => {
                    const nextStep = getNextStep(step)
                    if (workspaceType === "personal_creator" && step < 5) {
                      setStep(nextStep)
                    } else if (workspaceType !== "personal_creator" && step === 4) {
                      // For team/manager, step 4 is the last step
                      handleSubmit()
                    } else if (step < 5) {
                      setStep(nextStep)
                    } else {
                      handleSubmit()
                    }
                  }}
                  disabled={!canProceed() || isLoading}
                  className={step === 1 ? "ml-auto" : "flex-1"}
                >
                  {isLoading
                    ? "Setting up..."
                    : (workspaceType === "personal_creator" && step === 5) || (workspaceType !== "personal_creator" && step === 4)
                      ? "Complete Setup"
                      : "Next"}
                  {((workspaceType === "personal_creator" && step < 5) || (workspaceType !== "personal_creator" && step < 4)) && (
                    <ArrowRight className="size-4 ml-2" />
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  )
}

type OnboardingStep = 0 | 1 | 2 | 3 | 4 | 5

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
