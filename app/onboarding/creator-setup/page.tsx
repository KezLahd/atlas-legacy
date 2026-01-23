"use client"

import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import Loading from "./loading"

import { useState, useEffect, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, ArrowRight, Plus, X, GripVertical } from "lucide-react"
import { AtlasLogo } from "@/components/atlas-logo"
import type { Platform } from "@/lib/types/database"
import { updateCreatorProfile } from "@/app/actions/onboarding"

type CreatorSetupStep = 1 | 2 | 3

interface CreatorData {
  name: string
  brandName: string
  primaryNiche: string
  subNiches: Array<{ subNiche: string }>
  entityType: "creator" | "brand"
}

function CreatorSetupContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const creatorId = searchParams.get("creatorId")
  const [supabase] = useMemo(() => [createClient()], [])
  const [step, setStep] = useState<CreatorSetupStep>(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Step 1: Creator/Brand Type
  const [entityType, setEntityType] = useState<"creator" | "brand">("creator")
  const [creatorData, setCreatorData] = useState<CreatorData>({
    name: "",
    brandName: "",
    primaryNiche: "",
    subNiches: [],
    entityType: "creator",
  })

  // Step 2: Platforms
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])

  // Step 3: Posting Frequency
  const [postingFrequency, setPostingFrequency] = useState(7)
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
      3: [1, 3, 4],
      4: [1, 3, 4, 5],
      5: [1, 2, 3, 4, 5],
      6: [1, 2, 3, 4, 5, 6],
      7: [1, 2, 3, 4, 5, 6, 7],
    }
    const activeIds = presets[frequency] || presets[7]
    const active = allContentTypes.filter((ct) => activeIds.includes(ct.id))
    const bank = allContentTypes.filter((ct) => !activeIds.includes(ct.id))
    return { active, bank }
  }

  const [activeContentTypes, setActiveContentTypes] = useState(getInitialSchedule(7).active)
  const [bankContentTypes, setBankContentTypes] = useState(getInitialSchedule(7).bank)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragSource, setDragSource] = useState<"active" | "bank" | null>(null)

  useEffect(() => {
    if (!creatorId) {
      router.push("/dashboard")
      return
    }
    loadPlatforms()
    loadCreatorData()
  }, [creatorId])

  useEffect(() => {
    const { active, bank } = getInitialSchedule(postingFrequency)
    setActiveContentTypes(active)
    setBankContentTypes(bank)
  }, [postingFrequency])

  const loadCreatorData = async () => {
    if (!creatorId) return
    try {
      const { data: creator } = await supabase
        .from("creators")
        .select("name, brand_name, primary_niche")
        .eq("id", creatorId)
        .single()

      if (creator) {
        setCreatorData({
          name: creator.name || "",
          brandName: creator.brand_name || "",
          primaryNiche: creator.primary_niche || "",
          subNiches: [],
          entityType: creator.brand_name ? "brand" : "creator",
        })
        setEntityType(creator.brand_name ? "brand" : "creator")
      }
    } catch (error) {
      console.error("[v0] Error loading creator data:", error)
    }
  }

  const loadPlatforms = async () => {
    const { data } = await supabase.from("platforms").select("*").order("name")
    if (data) setPlatforms(data)
  }

  const addSubNiche = () => {
    if (creatorData.subNiches.length < 5) {
      setCreatorData({
        ...creatorData,
        subNiches: [...creatorData.subNiches, { subNiche: "" }],
      })
    }
  }

  const removeSubNiche = (index: number) => {
    const newSubNiches = [...creatorData.subNiches]
    newSubNiches.splice(index, 1)
    setCreatorData({ ...creatorData, subNiches: newSubNiches })
  }

  const updateSubNiche = (index: number, value: string) => {
    const newSubNiches = [...creatorData.subNiches]
    newSubNiches[index].subNiche = value
    setCreatorData({ ...creatorData, subNiches: newSubNiches })
  }

  const togglePlatform = (platformId: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platformId) ? prev.filter((id) => id !== platformId) : [...prev, platformId],
    )
  }

  const handleDragStart = (index: number, source: "active" | "bank") => {
    setDraggedIndex(index)
    setDragSource(source)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragSource(null)
  }

  const handleDrop = (target: "active" | "bank", targetIndex: number) => {
    if (draggedIndex === null || dragSource === null) return

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
    setDraggedIndex(null)
    setDragSource(null)
  }

  const canProceed = () => {
    switch (step) {
      case 1:
        // Primary niche is required for both creator and brand
        if (entityType === "creator") {
          return creatorData.primaryNiche.trim().length > 0
        } else {
          return creatorData.brandName.trim().length > 0 && creatorData.primaryNiche.trim().length > 0
        }
      case 2:
        return selectedPlatforms.length > 0
      case 3:
        return postingFrequency >= 3 && postingFrequency <= 7
      default:
        return false
    }
  }

  const progress = (step / 3) * 100

  const handleSubmit = async () => {
    if (!creatorId) return

    setIsLoading(true)
    setError(null)

    try {
      const contentTypeOrderIds = activeContentTypes.map((ct) => ct.id)

      const result = await updateCreatorProfile({
        creatorId,
        creator: {
          name: "",
          brand_name: entityType === "brand" ? creatorData.brandName : "",
          primary_niche: creatorData.primaryNiche,
          sub_niches: creatorData.subNiches.map((sn) => sn.subNiche).filter(Boolean),
          platforms: selectedPlatforms,
          posting_frequency: postingFrequency,
          excluded_day_types: [],
          content_type_order: contentTypeOrderIds,
        },
      })

      if (result?.error) {
        throw new Error(result.error)
      }

      router.push("/dashboard")
    } catch (err: any) {
      setError(err.message)
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center space-y-2 relative">
                <button
                  type="button"
                  onClick={() => router.push("/dashboard")}
                  className="absolute top-0 right-0 p-2 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-foreground"
                  title="Go to dashboard"
                >
            <X className="size-5" />
          </button>
          <div className="flex items-center justify-center gap-2 mb-4">
            <AtlasLogo className="size-10" showText />
          </div>
          <p className="text-muted-foreground">Step {step} of 3</p>
          <Progress value={progress} className="mt-4" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {step === 1 && "Set up your creator profile"}
              {step === 2 && (
                <>
                  Select platforms <span className="text-destructive">*</span>
                </>
              )}
              {step === 3 && "Set posting frequency"}
            </CardTitle>
            <CardDescription>
              {step === 1 && "Tell us about yourself or your brand"}
              {step === 2 && "Choose where your content will be published"}
              {step === 3 && "How often will you post?"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {step === 1 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>Are you a Creator or Brand?</Label>
                  <div className="flex gap-4">
                    <Button
                      type="button"
                      variant={entityType === "creator" ? "default" : "outline"}
                      onClick={() => {
                        setEntityType("creator")
                        setCreatorData({ ...creatorData, entityType: "creator" })
                      }}
                      className="flex-1"
                    >
                      Creator
                    </Button>
                    <Button
                      type="button"
                      variant={entityType === "brand" ? "default" : "outline"}
                      onClick={() => {
                        setEntityType("brand")
                        setCreatorData({ ...creatorData, entityType: "brand" })
                      }}
                      className="flex-1"
                    >
                      Brand
                    </Button>
                  </div>
                </div>

                {entityType === "brand" && (
                  <div className="space-y-2">
                    <Label>Brand Name</Label>
                    <Input
                      placeholder="e.g. Fitness by John"
                      value={creatorData.brandName}
                      onChange={(e) => setCreatorData({ ...creatorData, brandName: e.target.value })}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Primary Niche <span className="text-destructive">*</span></Label>
                  <Input
                    placeholder="e.g. Lifestyle, Fitness, Tech, Beauty..."
                    value={creatorData.primaryNiche}
                    onChange={(e) => setCreatorData({ ...creatorData, primaryNiche: e.target.value })}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Sub-Niches (up to 5)</Label>
                    {creatorData.subNiches.length < 5 && (
                      <Button variant="outline" size="sm" onClick={addSubNiche}>
                        <Plus className="size-4 mr-2" />
                        Add Sub-Niche
                      </Button>
                    )}
                  </div>
                  {creatorData.subNiches.map((subNiche, idx) => (
                    <div key={idx} className="flex gap-2">
                      <Input
                        placeholder="e.g. Weight Training"
                        value={subNiche.subNiche}
                        onChange={(e) => updateSubNiche(idx, e.target.value)}
                      />
                      <Button variant="outline" size="icon" onClick={() => removeSubNiche(idx)}>
                        <X className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {platforms.map((platform) => {
                      const isSelected = selectedPlatforms.includes(platform.id)

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
                          onClick={() => togglePlatform(platform.id)}
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

            {step === 3 && (
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
                  onClick={() => setStep((prev) => (prev - 1) as CreatorSetupStep)}
                  disabled={isLoading}
                >
                  <ArrowLeft className="size-4 mr-2" />
                  Back
                </Button>
              )}
              <Button
                onClick={() => {
                  if (step < 3) {
                    setStep((prev) => (prev + 1) as CreatorSetupStep)
                  } else {
                    handleSubmit()
                  }
                }}
                disabled={!canProceed() || isLoading}
                className={step === 1 ? "ml-auto" : "flex-1"}
              >
                {isLoading ? "Saving..." : step === 3 ? "Complete Setup" : "Next"}
                {step < 3 && <ArrowRight className="size-4 ml-2" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function CreatorSetupPage() {
  return (
    <Suspense fallback={<Loading />}>
      <CreatorSetupContent />
    </Suspense>
  )
}
