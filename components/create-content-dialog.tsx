"use client"

import React, { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, ArrowRight, ArrowLeft, Search } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type {
  Creator,
  Platform,
  ContentPillar,
  FourH,
  Series,
  Batch,
  ContentFormat,
  ContentStyle,
} from "@/lib/types/database"

interface CreateContentDialogProps {
  workspaceId: string
  creators: Creator[]
  onContentCreated: () => void
  workspaceType?: string
  userRole?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: React.ReactNode
  initialValues?: {
    hook?: string
    creatorId?: string
    creatorUsername?: string
    platforms?: string[]
    format?: string
    pillarId?: string
    style?: string
    researchId?: string
  }
}

export function CreateContentDialog({
  workspaceId,
  creators,
  onContentCreated,
  workspaceType,
  userRole,
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
  trigger,
  initialValues,
}: CreateContentDialogProps) {
  const supabase = createClient()
  const [internalOpen, setInternalOpen] = useState(false)
  const open = externalOpen !== undefined ? externalOpen : internalOpen
  const setOpen = externalOnOpenChange || setInternalOpen
  const [isLoading, setIsLoading] = useState(false)
  const [currentTab, setCurrentTab] = useState("context")

  // Data
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [pillars, setPillars] = useState<ContentPillar[]>([])
  const [fourHs, setFourHs] = useState<FourH[]>([])
  const [series, setSeries] = useState<Series[]>([])
  const [batches, setBatches] = useState<Batch[]>([])
  const [storytellingFormats, setStorytellingFormats] = useState<any[]>([])
  const [existingContent, setExistingContent] = useState<any[]>([])
  const [contentTypes, setContentTypes] = useState<any[]>([]) // Added state for content type (framework day attribution)

  // Form state - Step 1: Context
  const [selectedCreator, setSelectedCreator] = useState<string>("")
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
  const [format, setFormat] = useState<ContentFormat>("reel")
  const [hook, setHook] = useState("")

  // Form state - Step 2: Batch
  const [selectedBatch, setSelectedBatch] = useState<string>("none")
  const [showBatchForm, setShowBatchForm] = useState(false)
  const [newBatchName, setNewBatchName] = useState("")
  const [newBatchStartDate, setNewBatchStartDate] = useState("")
  const [newBatchEndDate, setNewBatchEndDate] = useState("")
  const [newBatchCreators, setNewBatchCreators] = useState<string[]>([])

  const [selectedPillar, setSelectedPillar] = useState<string>("")
  const [selectedFourH, setSelectedFourH] = useState<string>("")
  const [selectedSeries, setSelectedSeries] = useState<string>("none")
  const [episodeNumber, setEpisodeNumber] = useState<string>("")
  const [style, setStyle] = useState<ContentStyle>("talking_head")
  const [storytellingFormat, setStorytellingFormat] = useState<string>("none")
  const [selectedContentType, setSelectedContentType] = useState<string>("") // Added state for content type (framework day attribution)

  const [contentSearchQuery, setContentSearchQuery] = useState("")
  const [filteredContent, setFilteredContent] = useState<any[]>([])
  const [selectedTemplateContent, setSelectedTemplateContent] = useState<string>("")

  const [showSeriesForm, setShowSeriesForm] = useState(false)
  const [newSeriesName, setNewSeriesName] = useState("")
  const [newSeriesType, setNewSeriesType] = useState("custom")

  const isFormValid = () => {
    return (
      hook.trim() !== "" &&
      selectedCreator !== "" &&
      (selectedCreator === "" || selectedPlatforms.length > 0) &&
      format !== ""
    )
  }

  const isSeriesPillarSelected = () => {
    const seriesPillar = pillars.find((p) => p.name === "Series")
    return seriesPillar ? selectedPillar === seriesPillar.id : false
  }

  const isStorytellingPillarSelected = () => {
    const storytellingPillar = pillars.find((p) => p.name === "Storytelling")
    return storytellingPillar ? selectedPillar === storytellingPillar.id : false
  }

  const isDoubleDownPillarSelected = () => {
    const doubleDownPillar = pillars.find((p) => p.name === "Double Down")
    return doubleDownPillar ? selectedPillar === doubleDownPillar.id : false
  }

  const getAvailableStyles = (): { value: ContentStyle; label: string }[] => {
    const selectedPillarName = pillars.find((p) => p.id === selectedPillar)?.name.toLowerCase()

    if (!selectedPillarName) return []

    // Educational pillar styles (6 styles from backend)
    if (selectedPillarName === "educational") {
      return [
        { value: "talking_head", label: "Talking Head" },
        { value: "b_roll_voiceover", label: "B-roll with Voiceover" },
        { value: "interview", label: "Interview" },
        { value: "transformation", label: "Before/After Transformation" },
        { value: "screen_recording", label: "Screen Recording Tutorial" },
        { value: "demonstration", label: "Demonstration" },
        { value: "other", label: "Other" },
      ]
    }

    // Storytelling pillar styles (3 styles from backend)
    if (selectedPillarName === "storytelling") {
      return [
        { value: "voiceover", label: "Voiceover" },
        { value: "shot_angle_change", label: "Shot/Angle Change" },
        { value: "audio_broll_text", label: "Audio + B-roll + Text" },
        { value: "other", label: "Other" },
      ]
    }

    // Authority pillar styles (placeholder - to be researched)
    if (selectedPillarName === "authority") {
      return [
        { value: "talking_head", label: "Talking Head" },
        { value: "interview", label: "Interview" },
        { value: "split_pov", label: "Split POV" },
        { value: "other", label: "Other" },
      ]
    }

    return []
  }

  const isBatchFormValid = () => {
    return newBatchName.trim() !== "" && newBatchStartDate !== "" && newBatchEndDate !== ""
  }

  useEffect(() => {
    if (open) {
      loadData()
    } else {
      // Reset form when dialog closes
      resetForm()
    }
  }, [open])

  // Load platforms when creator is selected
  useEffect(() => {
    if (selectedCreator) {
      loadPlatformsForCreator(selectedCreator)
    } else {
      setPlatforms([])
    }
  }, [selectedCreator])

  // Set initial values when dialog opens and initialValues are provided
  useEffect(() => {
    if (open && initialValues && creators.length > 0) {
      if (initialValues.hook) {
        setHook(initialValues.hook)
      }
      if (initialValues.format) {
        setFormat(initialValues.format as ContentFormat)
      }
      if (initialValues.pillarId) {
        setSelectedPillar(initialValues.pillarId)
      }
      if (initialValues.style) {
        setStyle(initialValues.style as ContentStyle)
      }
      if (initialValues.platforms && initialValues.platforms.length > 0) {
        setSelectedPlatforms(initialValues.platforms)
      }
      // Find creator by username or use provided creatorId
      if (initialValues.creatorUsername) {
        const matchedCreator = creators.find(
          (c) => c.name?.toLowerCase().replace("@", "").replace(" ", "") === 
                 initialValues.creatorUsername?.toLowerCase().replace("@", "").replace(" ", "")
        )
        if (matchedCreator) {
          setSelectedCreator(matchedCreator.id)
        }
      } else if (initialValues.creatorId) {
        setSelectedCreator(initialValues.creatorId)
      }
    }
  }, [open, initialValues, creators])

  // Auto-select creator based on user role and available creators
  useEffect(() => {
    if (open && creators.length > 0 && !selectedCreator) {
      if (userRole === "creator") {
        // For creators, find their own creator profile and auto-select it
        // This should be the creator where workspace_members[0].user_id matches current user
        // For now, we'll select the first creator (this should be improved to match by user ID)
        setSelectedCreator(creators[0].id)
      } else if (creators.length === 1 || workspaceType === "personal_creator") {
        // For other roles, auto-select if only one creator or personal workspace
        setSelectedCreator(creators[0].id)
      }
    }
  }, [open, creators, selectedCreator, workspaceType, userRole])


  useEffect(() => {
    if (isDoubleDownPillarSelected() && selectedCreator) {
      loadExistingContent()
    }
  }, [selectedPillar, selectedCreator])

  useEffect(() => {
    if (contentSearchQuery.trim() === "") {
      setFilteredContent(existingContent)
    } else {
      const filtered = existingContent.filter((content) =>
        content.hook?.toLowerCase().includes(contentSearchQuery.toLowerCase()),
      )
      setFilteredContent(filtered)
    }
  }, [contentSearchQuery, existingContent])

  useEffect(() => {
    if (selectedTemplateContent) {
      const templateContent = existingContent.find((c) => c.id === selectedTemplateContent)
      if (templateContent) {
        if (templateContent.four_h_id) {
          setSelectedFourH(templateContent.four_h_id)
        }
        if (templateContent.style) {
          setStyle(templateContent.style)
        }
      }
    }
  }, [selectedTemplateContent, existingContent])

  useEffect(() => {
    if (selectedPillar && !isSeriesPillarSelected()) {
      const availableStyles = getAvailableStyles()
      if (availableStyles.length > 0) {
        setStyle(availableStyles[0].value)
      }
    }
  }, [selectedPillar])

  const loadPlatformsForCreator = async (creatorId: string) => {
    if (!creatorId) {
      setPlatforms([])
      return
    }

    // Get platforms for the specific creator
    const { data: creatorPlatformsData } = await supabase
      .from("creator_platforms")
      .select("platforms(*)")
      .eq("creator_id", creatorId)

    if (creatorPlatformsData && creatorPlatformsData.length > 0) {
      // Extract platforms
      const creatorPlatforms = creatorPlatformsData
        .map((cp: any) => cp.platforms)
        .filter((p: any) => p !== null) as Platform[]
      setPlatforms(creatorPlatforms)
    } else {
      setPlatforms([])
    }
  }

  const loadData = async () => {
    // Platforms will be loaded when creator is selected

    const [pillarsRes, fourHsRes, batchesRes, storytellingFormatsRes, contentTypesRes] = await Promise.all([
      supabase.from("content_pillars").select("*").order("name"),
      supabase.from("four_hs").select("*").order("name"),
      supabase.from("batches").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }),
      supabase.from("storytelling_formats").select("*").order("name"),
      supabase
        .from("content_types")
        .select("*")
        .order("id"), // Added contentTypes to the load data call
    ])

    if (pillarsRes.data) setPillars(pillarsRes.data)
    if (fourHsRes.data) setFourHs(fourHsRes.data)
    if (batchesRes.data) setBatches(batchesRes.data)
    if (storytellingFormatsRes.data) setStorytellingFormats(storytellingFormatsRes.data)
    if (contentTypesRes.data) setContentTypes(contentTypesRes.data) // Set content types for framework day attribution

    if (selectedCreator) {
      const { data: seriesData } = await supabase
        .from("series")
        .select("*")
        .eq("creator_id", selectedCreator)
        .order("name")
      if (seriesData) setSeries(seriesData)
    }
  }

  const loadExistingContent = async () => {
    const { data } = await supabase
      .from("content")
      .select("*, four_hs(name)")
      .eq("creator_id", selectedCreator)
      .order("created_at", { ascending: false })
      .limit(50)

    if (data) {
      setExistingContent(data)
      setFilteredContent(data)
    }
  }

  const togglePlatform = (platformId: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platformId) ? prev.filter((id) => id !== platformId) : [...prev, platformId],
    )
  }

  const toggleBatchCreator = (creatorId: string) => {
    setNewBatchCreators((prev) =>
      prev.includes(creatorId) ? prev.filter((id) => id !== creatorId) : [...prev, creatorId],
    )
  }

  const handleCreateBatch = async () => {
    if (!isBatchFormValid()) {
      alert("Please fill in batch name, start date, and end date")
      return
    }

    setIsLoading(true)
    try {
      const { data: newBatch, error: batchError } = await supabase
        .from("batches")
        .insert({
          workspace_id: workspaceId,
          name: newBatchName,
          start_date: newBatchStartDate || null,
          end_date: newBatchEndDate || null,
        })
        .select()
        .single()

      if (batchError) throw batchError

      for (const creatorId of newBatchCreators) {
        await supabase.from("batch_creators").insert({
          batch_id: newBatch.id,
          creator_id: creatorId,
        })
      }

      await loadData()
      setSelectedBatch(newBatch.id)
      setShowBatchForm(false)
      setNewBatchName("")
      setNewBatchStartDate("")
      setNewBatchEndDate("")
      setNewBatchCreators([])
    } catch (error: any) {
      alert(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateSeries = async () => {
    if (!newSeriesName.trim() || !selectedCreator) {
      alert("Please enter a series name and select a creator")
      return
    }

    setIsLoading(true)
    try {
      const { data: newSeriesData, error: seriesError } = await supabase
        .from("series")
        .insert({
          creator_id: selectedCreator,
          name: newSeriesName,
          type: newSeriesType,
        })
        .select()
        .single()

      if (seriesError) throw seriesError

      await loadData()
      setSelectedSeries(newSeriesData.id)
      setShowSeriesForm(false)
      setNewSeriesName("")
      setNewSeriesType("custom")
    } catch (error: any) {
      alert(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!isFormValid()) {
      alert("Please fill in all required fields: Hook/Title, Creator, Platform(s), and Format")
      return
    }

    setIsLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const contentData: any = {
        workspace_id: workspaceId,
        creator_id: selectedCreator,
        hook,
        format,
        production_stage: "idea",
        four_h_id: selectedFourH || null,
        batch_id: selectedBatch !== "none" ? selectedBatch : null,
        series_id: selectedSeries !== "none" ? selectedSeries : null,
        episode_number: episodeNumber || null,
        content_type_id: selectedContentType || null,
        research_id: initialValues?.researchId || null,
        created_by: user?.id || null, // Added user tracking
        updated_by: user?.id || null, // Added user tracking
      }

      if (!isSeriesPillarSelected()) {
        contentData.style = style
      }

      if (isStorytellingPillarSelected() && storytellingFormat !== "none") {
        contentData.storytelling_format_id = storytellingFormat
      }

      const { data: newContent, error: contentError } = await supabase
        .from("content")
        .insert(contentData)
        .select()
        .single()

      if (contentError) throw contentError

      for (const platformId of selectedPlatforms) {
        await supabase.from("content_platforms").insert({
          content_id: newContent.id,
          platform_id: platformId,
        })
      }

      if (selectedPillar) {
        await supabase.from("content_content_pillars").insert({
          content_id: newContent.id,
          pillar_id: selectedPillar,
        })
      }

      // Log creation to audit trail
      if (newContent && newContent.id && user?.id) {
        await supabase.from("content_audit_log").insert({
          content_id: newContent.id,
          user_id: user.id,
          action: "created",
          field_changed: null,
          old_value: null,
          new_value: null,
        })
      }

      resetForm()
      setOpen(false)
      onContentCreated()
    } catch (error: any) {
      alert(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setCurrentTab("context")
    setSelectedCreator("")
    setSelectedBatch("none")
    setSelectedPlatforms([])
    setFormat("reel")
    setSelectedPillar("")
    setSelectedFourH("")
    setSelectedSeries("none")
    setEpisodeNumber("")
    setStyle("talking_head")
    setHook("")
    setStorytellingFormat("none")
    setShowBatchForm(false)
    setNewBatchName("")
    setNewBatchStartDate("")
    setNewBatchEndDate("")
    setNewBatchCreators([])
    setShowSeriesForm(false)
    setNewSeriesName("")
    setNewSeriesType("custom")
    setContentSearchQuery("")
    setSelectedTemplateContent("")
    setSelectedContentType("") // Reset content type state
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!externalOpen && trigger && (
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
      )}
      {!externalOpen && !trigger && (
        <DialogTrigger asChild>
          <Button className="min-w-0">
            <Plus className="size-4 mr-2" />
            <span className="hidden sm:inline">Create </span>Content
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle>Create New Content</DialogTitle>
        </DialogHeader>

        <Tabs value={currentTab} onValueChange={setCurrentTab}>
          <TabsList className="grid w-full grid-cols-3 bg-muted/30">
            <TabsTrigger
              value="context"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Context
            </TabsTrigger>
            <TabsTrigger
              value="batch"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Batch
            </TabsTrigger>
            <TabsTrigger
              value="strategy"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Strategy
            </TabsTrigger>
          </TabsList>

          <TabsContent value="context" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Hook / Title *</Label>
              <Input
                placeholder="e.g., 3 secrets to grow your audience"
                value={hook}
                onChange={(e) => setHook(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">A catchy title or opening line for this content</p>
            </div>

            {/* Creator Selection - Only show for non-creator roles */}
            {workspaceType !== "personal_creator" && userRole !== "creator" && (
              <div className="space-y-2">
                <Label>Creator *</Label>
                <div className="grid grid-cols-3 gap-2">
                  {creators.map((creator) => (
                    <Button
                      key={creator.id}
                      type="button"
                      variant={selectedCreator === creator.id ? "default" : "outline"}
                      className={`w-full ${
                        selectedCreator === creator.id
                          ? "bg-primary text-primary-foreground hover:bg-primary/90"
                          : "bg-white hover:bg-accent"
                      }`}
                      onClick={() => setSelectedCreator(creator.id)}
                    >
                      {creator.name || creator.brand_name}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {selectedCreator && (
              <div className="space-y-2">
                <Label>Platforms *</Label>
                <div className="grid grid-cols-3 gap-2">
                  {platforms.map((platform) => {
                    const isSelected = selectedPlatforms.includes(platform.id)
                    const platformName = platform.name.toLowerCase()

                    // Platform configuration with colors and icons
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

                    const config = platformConfig[platformName] || {
                      icon: "",
                      bg: "bg-gray-50",
                      border: "border-gray-400",
                      text: "text-gray-700",
                    }

                    return (
                      <div
                        key={platform.id}
                        className={`
                          flex flex-col items-center justify-center p-3 rounded-lg cursor-pointer transition-all
                          ${
                            isSelected
                              ? `${config.bg} border-2 ${config.border} shadow-sm`
                              : "bg-background border border-border hover:bg-muted/50"
                          }
                        `}
                        onClick={() => togglePlatform(platform.id)}
                      >
                        {config.icon ? (
                          <img
                            src={config.icon || "/placeholder.svg"}
                            alt={platform.name}
                            className="w-6 h-6 mb-1"
                          />
                        ) : (
                          <span className="text-lg mb-1">🔗</span>
                        )}
                        <span className={`text-xs font-medium ${isSelected ? config.text : "text-foreground"}`}>
                          {platform.name}
                        </span>
                      </div>
                    )
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  Edit workspace in profile page to change platform preferences
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Format *</Label>
              <Select value={format} onValueChange={(v) => setFormat(v as ContentFormat)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="reel">Reel</SelectItem>
                  <SelectItem value="post">Post</SelectItem>
                  <SelectItem value="story">Story</SelectItem>
                  <SelectItem value="carousel">Carousel</SelectItem>
                  <SelectItem value="short">Short</SelectItem>
                  <SelectItem value="long_video">Long Video</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="batch" className="space-y-4 mt-4">
            {!showBatchForm ? (
              <>
                <div className="space-y-2">
                  <Label>Batch (Optional)</Label>
                  <Select value={selectedBatch} onValueChange={setSelectedBatch}>
                    <SelectTrigger>
                      <SelectValue placeholder="No batch" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No batch</SelectItem>
                      {batches.map((batch) => (
                        <SelectItem key={batch.id} value={batch.id}>
                          {batch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Batches help organize multiple pieces of content created together
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full bg-transparent"
                  onClick={() => setShowBatchForm(true)}
                >
                  <Plus className="size-4 mr-2" />
                  Create New Batch
                </Button>
              </>
            ) : (
              <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Create New Batch</h3>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setShowBatchForm(false)}>
                    Cancel
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label>Batch Name *</Label>
                  <Input
                    placeholder="January 2026 Content"
                    value={newBatchName}
                    onChange={(e) => setNewBatchName(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date *</Label>
                    <Input
                      type="date"
                      value={newBatchStartDate}
                      onChange={(e) => setNewBatchStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date *</Label>
                    <Input type="date" value={newBatchEndDate} onChange={(e) => setNewBatchEndDate(e.target.value)} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Creators</Label>
                  <div className="space-y-2">
                    {creators.map((creator) => (
                      <div key={creator.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`batch-creator-${creator.id}`}
                          checked={newBatchCreators.includes(creator.id)}
                          onCheckedChange={() => toggleBatchCreator(creator.id)}
                        />
                        <label htmlFor={`batch-creator-${creator.id}`} className="text-sm cursor-pointer">
                          {creator.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={handleCreateBatch}
                  disabled={isLoading || !isBatchFormValid()}
                  className="w-full"
                >
                  {isLoading ? "Creating..." : "Create Batch"}
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="strategy" className="space-y-4">
            <div className="space-y-2 mt-6">
              <Label>Content Pillar</Label>
              <div className="grid grid-cols-2 gap-2">
                {pillars.map((pillar) => (
                  <Button
                    key={pillar.id}
                    type="button"
                    variant={selectedPillar === pillar.id ? "default" : "outline"}
                    className="w-full justify-start"
                    onClick={() => setSelectedPillar(pillar.id)}
                  >
                    {pillar.name}
                  </Button>
                ))}
              </div>
            </div>

            {isDoubleDownPillarSelected() && (
              <div className="space-y-2">
                <Label>Search Existing Content</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by hook/title..."
                    value={contentSearchQuery}
                    onChange={(e) => setContentSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                {filteredContent.length > 0 && (
                  <div className="max-h-48 overflow-y-auto border rounded-md">
                    {filteredContent.map((content) => (
                      <button
                        key={content.id}
                        type="button"
                        className={`w-full text-left p-3 hover:bg-muted/50 border-b last:border-b-0 ${
                          selectedTemplateContent === content.id ? "bg-primary/10" : ""
                        }`}
                        onClick={() => setSelectedTemplateContent(content.id)}
                      >
                        <p className="text-sm font-medium">{content.hook || "Untitled"}</p>
                        <p className="text-xs text-muted-foreground">
                          {content.format} • {content.four_hs?.name || "No framework"}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {selectedPillar && !isSeriesPillarSelected() && getAvailableStyles().length > 0 && (
              <div className="space-y-2">
                <Label>Content Style</Label>
                <Select
                  value={style}
                  onValueChange={(v) => setStyle(v as ContentStyle)}
                  disabled={isDoubleDownPillarSelected() && selectedTemplateContent !== ""}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableStyles().map((styleOption) => (
                      <SelectItem key={styleOption.value} value={styleOption.value}>
                        {styleOption.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {isStorytellingPillarSelected() && (
              <div className="space-y-2">
                <Label>Storytelling Format</Label>
                <Select value={storytellingFormat} onValueChange={setStorytellingFormat}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {storytellingFormats.map((format) => (
                      <SelectItem key={format.id} value={format.id}>
                        {format.name}
                      </SelectItem>
                    ))}
              </SelectContent>
            </Select>
          </div>
        )}

            {selectedPillar && !isDoubleDownPillarSelected() && !isSeriesPillarSelected() && (
              <div className="space-y-2">
                <Label>@jun_yuh Framework Day (Optional)</Label>
                <p className="text-xs text-muted-foreground">
                  Link this content to a specific day in your posting schedule
                </p>
                <Select value={selectedContentType} onValueChange={setSelectedContentType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select framework day..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {contentTypes.map((ct) => (
                      <SelectItem key={ct.id} value={ct.id.toString()}>
                        Day {ct.id}: {ct.icon} {ct.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>4H Framework</Label>
              <div className="grid grid-cols-4 gap-2">
                {fourHs.map((fourH) => (
                  <Button
                    key={fourH.id}
                    type="button"
                    variant={selectedFourH === fourH.id ? "default" : "outline"}
                    className="w-full"
                    onClick={() => setSelectedFourH(selectedFourH === fourH.id ? "" : fourH.id)}
                    disabled={isDoubleDownPillarSelected() && selectedTemplateContent !== ""}
                  >
                    {fourH.name}
              </Button>
            ))}
          </div>
        </div>

            {isSeriesPillarSelected() && (
              <>
                {!showSeriesForm ? (
                  <>
                    <div className="space-y-2">
                      <Label>Series (Optional)</Label>
                      <div className="flex gap-2">
                        <Select value={selectedSeries} onValueChange={setSelectedSeries}>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="No series" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No series</SelectItem>
                            {series.map((s) => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => setShowSeriesForm(true)}
                          disabled={!selectedCreator}
                        >
                          <Plus className="size-4" />
                        </Button>
                      </div>
                      {!selectedCreator && (
                        <p className="text-xs text-muted-foreground">Select a creator first to create a series</p>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">Create New Series</h3>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setShowSeriesForm(false)}>
                        Cancel
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <Label>Series Name *</Label>
                      <Input
                        placeholder="My Series Name"
                        value={newSeriesName}
                        onChange={(e) => setNewSeriesName(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Series Type</Label>
                      <Select value={newSeriesType} onValueChange={setNewSeriesType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="progress">Progress</SelectItem>
                          <SelectItem value="daily_update">Daily Update</SelectItem>
                          <SelectItem value="goal_based">Goal Based</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button type="button" onClick={handleCreateSeries} disabled={isLoading} className="w-full">
                      {isLoading ? "Creating..." : "Create Series"}
                    </Button>
                  </div>
                )}

                {selectedSeries !== "none" && (
                  <div className="space-y-2">
                    <Label>Episode Number</Label>
                    <Input
                      type="number"
                      placeholder="1"
                      value={episodeNumber}
                      onChange={(e) => setEpisodeNumber(e.target.value)}
                    />
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-between pt-4">
          <Button
            variant="outline"
            onClick={() => {
              const tabs = ["context", "batch", "strategy"]
              const currentIndex = tabs.indexOf(currentTab)
              if (currentIndex > 0) {
                setCurrentTab(tabs[currentIndex - 1])
              }
            }}
            disabled={currentTab === "context"}
          >
            <ArrowLeft className="size-4 mr-2" />
            Back
          </Button>

          {currentTab === "strategy" ? (
            <Button
              onClick={handleSubmit}
              disabled={isLoading || !isFormValid()}
              className="bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              {isLoading ? "Creating..." : "Create Content"}
            </Button>
          ) : (
            <Button
              onClick={() => {
                const tabs = ["context", "batch", "strategy"]
                const currentIndex = tabs.indexOf(currentTab)
                if (currentIndex < tabs.length - 1) {
                  setCurrentTab(tabs[currentIndex + 1])
                }
              }}
              className="bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              Next
              <ArrowRight className="size-4 ml-2" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
