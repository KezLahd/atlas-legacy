"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Pencil, ArrowRight, ArrowLeft } from "lucide-react"
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

interface EditContentDialogProps {
  contentId: string
  workspaceId: string
  creators: Creator[]
  onContentUpdated: () => void
  workspaceType?: string
  trigger?: React.ReactNode // Added custom trigger prop
}

export function EditContentDialog({
  contentId,
  workspaceId,
  creators,
  onContentUpdated,
  workspaceType,
  trigger, // Added trigger to destructured props
}: EditContentDialogProps) {
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [currentTab, setCurrentTab] = useState("context")

  // Data
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [pillars, setPillars] = useState<ContentPillar[]>([])
  const [fourHs, setFourHs] = useState<FourH[]>([])
  const [series, setSeries] = useState<Series[]>([])
  const [batches, setBatches] = useState<Batch[]>([])
  const [storytellingFormats, setStorytellingFormats] = useState<any[]>([])
  const [contentTypes, setContentTypes] = useState<any[]>([])

  // Form state
  const [selectedCreator, setSelectedCreator] = useState<string>("")
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
  const [format, setFormat] = useState<ContentFormat>("reel")
  const [hook, setHook] = useState("")
  const [selectedBatch, setSelectedBatch] = useState<string>("none")
  const [selectedPillar, setSelectedPillar] = useState<string>("")
  const [selectedFourH, setSelectedFourH] = useState<string>("")
  const [selectedSeries, setSelectedSeries] = useState<string>("none")
  const [episodeNumber, setEpisodeNumber] = useState<string>("")
  const [style, setStyle] = useState<ContentStyle>("talking_head")
  const [storytellingFormat, setStorytellingFormat] = useState<string>("none")
  const [selectedContentType, setSelectedContentType] = useState<string>("")
  const [originalContent, setOriginalContent] = useState<any>(null)

  const isFormValid = () => {
    return (
      hook.trim() !== "" &&
      selectedCreator !== "" &&
      (selectedCreator === "" || selectedPlatforms.length > 0) &&
      format !== "" &&
      selectedPillar !== ""
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

  const getAvailableStyles = (): { value: ContentStyle; label: string }[] => {
    const selectedPillarName = pillars.find((p) => p.id === selectedPillar)?.name.toLowerCase()

    if (!selectedPillarName) return []

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

    if (selectedPillarName === "storytelling") {
      return [
        { value: "voiceover", label: "Voiceover" },
        { value: "shot_angle_change", label: "Shot/Angle Change" },
        { value: "audio_broll_text", label: "Audio + B-roll + Text" },
        { value: "other", label: "Other" },
      ]
    }

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

  useEffect(() => {
    if (open) {
      loadData()
      loadContentData()
    }
  }, [open])

  useEffect(() => {
    if (selectedPillar && !isSeriesPillarSelected()) {
      const availableStyles = getAvailableStyles()
      if (availableStyles.length > 0 && !style) {
        setStyle(availableStyles[0].value)
      }
    }
  }, [selectedPillar])

  // Load platforms when creator is selected
  useEffect(() => {
    if (selectedCreator) {
      loadPlatformsForCreator(selectedCreator)
    } else {
      setPlatforms([])
    }
  }, [selectedCreator])

  const loadPlatformsForCreator = async (creatorId: string) => {
    if (!creatorId) {
      setPlatforms([])
      return
    }

    // Get platforms for the specific creator
    const { data: platformsRes } = await supabase
      .from("creator_platforms")
      .select("platforms(*)")
      .eq("creator_id", creatorId)

    if (platformsRes) {
      const creatorPlatforms = platformsRes.map((cp: any) => cp.platforms).filter(Boolean) as Platform[]
      setPlatforms(creatorPlatforms)
    } else {
      setPlatforms([])
    }
  }

  const loadData = async () => {
    const { data: content } = await supabase.from("content").select("creator_id").eq("id", contentId).single()

    // Load platforms for the current creator
    if (content?.creator_id) {
      await loadPlatformsForCreator(content.creator_id)
    }

    const [pillarsRes, fourHsRes, batchesRes, storytellingFormatsRes, contentTypesRes] = await Promise.all([
      supabase.from("content_pillars").select("*").order("name"),
      supabase.from("four_hs").select("*").order("name"),
      supabase.from("batches").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }),
      supabase.from("storytelling_formats").select("*").order("name"),
      supabase.from("content_types").select("*").order("id"),
    ])

    if (pillarsRes.data) setPillars(pillarsRes.data)
    if (fourHsRes.data) setFourHs(fourHsRes.data)
    if (batchesRes.data) setBatches(batchesRes.data)
    if (storytellingFormatsRes.data) setStorytellingFormats(storytellingFormatsRes.data)
    if (contentTypesRes.data) setContentTypes(contentTypesRes.data)
  }

  const loadContentData = async () => {
    const { data: content } = await supabase
      .from("content")
      .select(
        `
        *,
        content_platforms(platform_id),
        content_content_pillars(pillar_id)
      `,
      )
      .eq("id", contentId)
      .single()

    if (content) {
      // Store original content for audit trail comparison
      setOriginalContent(content)

      setSelectedCreator(content.creator_id || "")
      setHook(content.hook || "")
      setFormat(content.format || "reel")
      setSelectedBatch(content.batch_id || "none")
      setSelectedFourH(content.four_h_id || "")
      setSelectedSeries(content.series_id || "none")
      setEpisodeNumber(content.episode_number || "")
      setStyle(content.style || "talking_head")
      setStorytellingFormat(content.storytelling_format_id || "none")
      setSelectedContentType(content.content_type_id ? content.content_type_id.toString() : "")

      // Populate platforms from junction table
      if (content.content_platforms && Array.isArray(content.content_platforms)) {
        const platformIds = content.content_platforms.map((cp: any) => cp.platform_id).filter(Boolean)
        setSelectedPlatforms(platformIds)
      }

      // Populate pillar from junction table
      if (content.content_content_pillars && Array.isArray(content.content_content_pillars)) {
        const pillarId = content.content_content_pillars[0]?.pillar_id
        if (pillarId) setSelectedPillar(pillarId)
      }
    }
  }

  const togglePlatform = (platformId: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platformId) ? prev.filter((id) => id !== platformId) : [...prev, platformId],
    )
  }

  const handleSubmit = async () => {
    if (!isFormValid()) {
      alert("Please fill in all required fields")
      return
    }

    setIsLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const contentData: any = {
        creator_id: selectedCreator,
        hook,
        format,
        four_h_id: selectedFourH || null,
        batch_id: selectedBatch !== "none" ? selectedBatch : null,
        series_id: selectedSeries !== "none" ? selectedSeries : null,
        episode_number: episodeNumber || null,
        content_type_id: selectedContentType || null,
        updated_by: user?.id || null, // Added updated_by tracking
      }

      if (!isSeriesPillarSelected()) {
        contentData.style = style
      }

      if (isStorytellingPillarSelected() && storytellingFormat !== "none") {
        contentData.storytelling_format_id = storytellingFormat
      }

      // Track changes for audit log
      const changes: Array<{ field: string; oldValue: any; newValue: any }> = []

      const compareAndTrack = (field: string, oldVal: any, newVal: any) => {
        const oldStr = oldVal?.toString() || ""
        const newStr = newVal?.toString() || ""
        if (oldStr !== newStr) {
          changes.push({ field, oldValue: oldStr, newValue: newStr })
        }
      }

      if (originalContent) {
        // Compare all fields
        compareAndTrack("creator_id", originalContent.creator_id, selectedCreator)
        compareAndTrack("hook", originalContent.hook, hook)
        compareAndTrack("format", originalContent.format, format)
        compareAndTrack("four_h_id", originalContent.four_h_id, selectedFourH || null)
        compareAndTrack("batch_id", originalContent.batch_id, selectedBatch !== "none" ? selectedBatch : null)
        compareAndTrack("series_id", originalContent.series_id, selectedSeries !== "none" ? selectedSeries : null)
        compareAndTrack("episode_number", originalContent.episode_number, episodeNumber || null)
        compareAndTrack("content_type_id", originalContent.content_type_id, selectedContentType || null)
        compareAndTrack("style", originalContent.style, !isSeriesPillarSelected() ? style : null)
        compareAndTrack(
          "storytelling_format_id",
          originalContent.storytelling_format_id,
          isStorytellingPillarSelected() && storytellingFormat !== "none" ? storytellingFormat : null,
        )

        // Compare platforms
        const oldPlatformIds = originalContent.content_platforms
          ? originalContent.content_platforms.map((cp: any) => cp.platform_id).sort()
          : []
        const newPlatformIds = [...selectedPlatforms].sort()
        if (JSON.stringify(oldPlatformIds) !== JSON.stringify(newPlatformIds)) {
          changes.push({
            field: "platforms",
            oldValue: oldPlatformIds.join(", "),
            newValue: newPlatformIds.join(", "),
          })
        }

        // Compare pillars
        const oldPillarId = originalContent.content_content_pillars?.[0]?.pillar_id || null
        const newPillarId = selectedPillar || null
        compareAndTrack("pillar_id", oldPillarId, newPillarId)
      }

      const { error: contentError } = await supabase.from("content").update(contentData).eq("id", contentId)

      if (contentError) throw contentError

      // Update platforms
      await supabase.from("content_platforms").delete().eq("content_id", contentId)
      for (const platformId of selectedPlatforms) {
        await supabase.from("content_platforms").insert({
          content_id: contentId,
          platform_id: platformId,
        })
      }

      // Update pillars
      await supabase.from("content_content_pillars").delete().eq("content_id", contentId)
      if (selectedPillar) {
        await supabase.from("content_content_pillars").insert({
          content_id: contentId,
          pillar_id: selectedPillar,
        })
      }

      // Log changes to audit trail
      if (changes.length > 0 && user?.id) {
        const auditLogEntries = changes.map((change) => ({
          content_id: contentId,
          user_id: user.id,
          action: "updated",
          field_changed: change.field,
          old_value: change.oldValue,
          new_value: change.newValue,
        }))

        await supabase.from("content_audit_log").insert(auditLogEntries)
      }

      setOpen(false)
      onContentUpdated()
    } catch (error: any) {
      alert(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button size="sm" variant="ghost" title="Edit content">
            <Pencil className="size-4" />
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle>Edit Content</DialogTitle>
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
            </div>

            {workspaceType !== "personal_creator" && (
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
                            src={config.icon}
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
                <p className="text-xs text-muted-foreground mt-2">
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
            </div>
          </TabsContent>

          <TabsContent value="strategy" className="space-y-4">
            <div className="space-y-2 mt-6">
              <Label>@avayuergens Content Pillar *</Label>
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

            {selectedPillar && !isSeriesPillarSelected() && getAvailableStyles().length > 0 && (
              <div className="space-y-2">
                <Label>Content Style</Label>
                <Select value={style} onValueChange={(v) => setStyle(v as ContentStyle)}>
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

            {selectedPillar && !isSeriesPillarSelected() && (
              <div className="space-y-2">
                <Label>@jun_yuh Framework Day (Optional)</Label>
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
                  >
                    {fourH.name}
                  </Button>
                ))}
              </div>
            </div>

            {isSeriesPillarSelected() && (
              <>
                <div className="space-y-2">
                  <Label>Series (Optional)</Label>
                  <Select value={selectedSeries} onValueChange={setSelectedSeries}>
                    <SelectTrigger>
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
                </div>

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
              className="bg-[#89cff0] hover:bg-[#6fb8d9] text-accent-foreground"
              onClick={handleSubmit}
              disabled={!isFormValid() || isLoading}
            >
              {isLoading ? "Updating..." : "Update Content"}
            </Button>
          ) : (
            <Button
              className="bg-[#89cff0] hover:bg-[#6fb8d9] text-accent-foreground"
              onClick={() => {
                const tabs = ["context", "batch", "strategy"]
                const currentIndex = tabs.indexOf(currentTab)
                if (currentIndex < tabs.length - 1) {
                  setCurrentTab(tabs[currentIndex + 1])
                }
              }}
            >
              <ArrowRight className="size-4 mr-2" />
              Next
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
