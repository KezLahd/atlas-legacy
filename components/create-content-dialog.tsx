"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, ArrowRight, ArrowLeft } from "lucide-react"
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
  workspaceType?: string // Added workspace type prop
}

export function CreateContentDialog({
  workspaceId,
  creators,
  onContentCreated,
  workspaceType,
}: CreateContentDialogProps) {
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

  // Form state - Step 3: Strategy
  const [selectedPillars, setSelectedPillars] = useState<string[]>([])
  const [selectedFourH, setSelectedFourH] = useState<string>("none")
  const [selectedSeries, setSelectedSeries] = useState<string>("none")
  const [episodeNumber, setEpisodeNumber] = useState<string>("")
  const [style, setStyle] = useState<ContentStyle>("talking_head")

  const [showSeriesForm, setShowSeriesForm] = useState(false)
  const [newSeriesName, setNewSeriesName] = useState("")
  const [newSeriesType, setNewSeriesType] = useState("custom")

  const isFormValid = () => {
    return (
      hook.trim() !== "" &&
      selectedCreator !== "" &&
      selectedPlatforms.length > 0 &&
      format !== "" &&
      selectedPillars.length > 0
    )
  }

  const isSeriesPillarSelected = () => {
    const seriesPillar = pillars.find((p) => p.name === "Series")
    return seriesPillar ? selectedPillars.includes(seriesPillar.id) : false
  }

  const getAvailableStyles = (): { value: ContentStyle; label: string }[] => {
    const selectedPillarNames = pillars.filter((p) => selectedPillars.includes(p.id)).map((p) => p.name.toLowerCase())

    // Educational pillar styles
    if (selectedPillarNames.includes("educational")) {
      return [
        { value: "talking_head", label: "Talking Head" },
        { value: "b_roll_storytelling", label: "B-roll with Voiceover" },
        { value: "interview", label: "Interview" },
        { value: "transformation", label: "Before/After Transformation" },
      ]
    }

    // Storytelling pillar styles
    if (selectedPillarNames.includes("storytelling")) {
      return [
        { value: "talking_head", label: "Talking Head" },
        { value: "b_roll_storytelling", label: "B-roll Storytelling" },
        { value: "skit_dialogue", label: "Skit / Dialogue" },
      ]
    }

    // Authority pillar styles
    if (selectedPillarNames.includes("authority")) {
      return [
        { value: "talking_head", label: "Talking Head" },
        { value: "interview", label: "Interview" },
        { value: "split_pov", label: "Split POV" },
      ]
    }

    // Series or Double Down styles
    if (selectedPillarNames.includes("series") || selectedPillarNames.includes("double down")) {
      return [
        { value: "talking_head", label: "Talking Head" },
        { value: "b_roll_storytelling", label: "B-roll Storytelling" },
        { value: "skit_dialogue", label: "Skit / Dialogue" },
        { value: "transformation", label: "Transformation" },
      ]
    }

    // Default styles if no pillar selected
    return [
      { value: "talking_head", label: "Talking Head" },
      { value: "skit_dialogue", label: "Skit / Dialogue" },
      { value: "transformation", label: "Transformation" },
      { value: "interview", label: "Interview" },
      { value: "b_roll_storytelling", label: "B-roll Storytelling" },
      { value: "split_pov", label: "Split POV" },
    ]
  }

  useEffect(() => {
    if (open) {
      loadData()
      if (creators.length === 1 && !selectedCreator) {
        setSelectedCreator(creators[0].id)
      }
    }
  }, [open, selectedCreator])

  const loadData = async () => {
    const [platformsRes, pillarsRes, fourHsRes, batchesRes] = await Promise.all([
      supabase.from("platforms").select("*").order("name"),
      supabase.from("content_pillars").select("*").order("name"),
      supabase.from("four_hs").select("*").order("name"),
      supabase.from("batches").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }),
    ])

    if (platformsRes.data) setPlatforms(platformsRes.data)
    if (pillarsRes.data) setPillars(pillarsRes.data)
    if (fourHsRes.data) setFourHs(fourHsRes.data)
    if (batchesRes.data) setBatches(batchesRes.data)

    if (selectedCreator) {
      const { data: seriesData } = await supabase
        .from("series")
        .select("*")
        .eq("creator_id", selectedCreator)
        .order("name")
      if (seriesData) setSeries(seriesData)
    }
  }

  const togglePlatform = (platformId: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platformId) ? prev.filter((id) => id !== platformId) : [...prev, platformId],
    )
  }

  const togglePillar = (pillarId: string) => {
    setSelectedPillars((prev) => (prev.includes(pillarId) ? prev.filter((id) => id !== pillarId) : [...prev, pillarId]))
  }

  const toggleBatchCreator = (creatorId: string) => {
    setNewBatchCreators((prev) =>
      prev.includes(creatorId) ? prev.filter((id) => id !== creatorId) : [...prev, creatorId],
    )
  }

  const handleCreateBatch = async () => {
    if (!newBatchName.trim()) {
      alert("Please enter a batch name")
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
      alert("Please fill in all required fields: Hook/Title, Creator, Platform(s), Format, and Content Pillar(s)")
      return
    }

    setIsLoading(true)
    try {
      const { data: newContent, error: contentError } = await supabase
        .from("content")
        .insert({
          creator_id: selectedCreator,
          batch_id: selectedBatch === "none" ? null : selectedBatch,
          series_id: selectedSeries === "none" ? null : selectedSeries,
          episode_number: episodeNumber ? Number.parseInt(episodeNumber) : null,
          format,
          style,
          four_h_id: selectedFourH === "none" ? null : selectedFourH,
          production_stage: "idea",
          hook: hook || null,
        })
        .select()
        .single()

      if (contentError) throw contentError

      for (const platformId of selectedPlatforms) {
        await supabase.from("content_platforms").insert({
          content_id: newContent.id,
          platform_id: platformId,
        })
      }

      for (const pillarId of selectedPillars) {
        await supabase.from("content_content_pillars").insert({
          content_id: newContent.id,
          pillar_id: pillarId,
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
    setSelectedPillars([])
    setSelectedFourH("none")
    setSelectedSeries("none")
    setEpisodeNumber("")
    setStyle("talking_head")
    setHook("")
    setShowBatchForm(false)
    setNewBatchName("")
    setNewBatchStartDate("")
    setNewBatchEndDate("")
    setNewBatchCreators([])
    setShowSeriesForm(false)
    setNewSeriesName("")
    setNewSeriesType("custom")
  }

  const isBatchFormValid = () => {
    return newBatchName.trim() !== "" && newBatchStartDate !== "" && newBatchEndDate !== ""
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4 mr-2" />
          Create Content
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <DialogHeader>
          <DialogTitle>Create New Content</DialogTitle>
        </DialogHeader>

        <Tabs value={currentTab} onValueChange={setCurrentTab}>
          <TabsList className="grid w-full grid-cols-3 bg-muted/50">
            <TabsTrigger
              value="context"
              className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground"
            >
              Context
            </TabsTrigger>
            <TabsTrigger
              value="batch"
              className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground"
            >
              Batch
            </TabsTrigger>
            <TabsTrigger
              value="strategy"
              className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground"
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

            {workspaceType !== "personal_creator" && (
              <div className="space-y-2">
                <Label>Creator *</Label>
                <Select value={selectedCreator} onValueChange={setSelectedCreator}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select creator" />
                  </SelectTrigger>
                  <SelectContent>
                    {creators.map((creator) => (
                      <SelectItem key={creator.id} value={creator.id}>
                        {creator.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Platforms *</Label>
              <div className="grid grid-cols-2 gap-2">
                {platforms.map((platform) => (
                  <div key={platform.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={platform.id}
                      checked={selectedPlatforms.includes(platform.id)}
                      onCheckedChange={() => togglePlatform(platform.id)}
                    />
                    <label htmlFor={platform.id} className="text-sm cursor-pointer">
                      {platform.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>

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
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      value={newBatchStartDate}
                      onChange={(e) => setNewBatchStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date</Label>
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

          <TabsContent value="strategy" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Content Pillars *</Label>
              <div className="grid grid-cols-2 gap-2">
                {pillars.map((pillar) => (
                  <div key={pillar.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={pillar.id}
                      checked={selectedPillars.includes(pillar.id)}
                      onCheckedChange={() => togglePillar(pillar.id)}
                    />
                    <label htmlFor={pillar.id} className="text-sm cursor-pointer">
                      {pillar.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>4H Framework</Label>
              <Select value={selectedFourH} onValueChange={setSelectedFourH}>
                <SelectTrigger>
                  <SelectValue placeholder="Select 4H" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {fourHs.map((fourH) => (
                    <SelectItem key={fourH.id} value={fourH.id}>
                      {fourH.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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
              {selectedPillars.length === 0 && (
                <p className="text-xs text-muted-foreground">Select a content pillar to see relevant styles</p>
              )}
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
            <Button onClick={handleSubmit} disabled={isLoading || !isFormValid()}>
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
