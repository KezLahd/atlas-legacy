"use client"
import type React from "react"
import { useState, useEffect } from "react"
import { createClient as createBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Plus, Upload } from "lucide-react"
import { CalendarIcon } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { Platform } from "@/lib/types/database"

interface CreateResearchDialogProps {
  workspaceId: string
  workspacePlatforms: Platform[]
  contentPillars: any[]
  onResearchCreated: () => void
}

export function CreateResearchDialog({
  workspaceId,
  workspacePlatforms = [],
  contentPillars = [],
  onResearchCreated,
}: CreateResearchDialogProps) {
  useEffect(() => {
    console.log("[v0] CreateResearchDialog - contentPillars prop:", contentPillars)
    console.log("[v0] CreateResearchDialog - workspacePlatforms prop:", workspacePlatforms)
  }, [contentPillars, workspacePlatforms])

  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showAddStyleDialog, setShowAddStyleDialog] = useState(false)
  const [newStyle, setNewStyle] = useState("")
  const [newStyleDescription, setNewStyleDescription] = useState("")
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [format, setFormat] = useState("")
  const [platformId, setPlatformId] = useState("")
  const [creatorUsername, setCreatorUsername] = useState("")
  const [thumbnailUrl, setThumbnailUrl] = useState("")
  const [link, setLink] = useState("")
  const [postingDate, setPostingDate] = useState<Date | undefined>(undefined)
  const [hook, setHook] = useState("")
  const [views, setViews] = useState("")
  const [likes, setLikes] = useState("")
  const [followers, setFollowers] = useState("")
  const [hasSfx, setHasSfx] = useState(false)
  const [hasBroll, setHasBroll] = useState(false)
  const [hasMusic, setHasMusic] = useState(false)
  const [avgSecondsPerClip, setAvgSecondsPerClip] = useState("")
  const [hookType, setHookType] = useState("")
  const [contentPillarId, setContentPillarId] = useState("")
  const [contentStyle, setContentStyle] = useState("")

  const [viewsMultiplier, setViewsMultiplier] = useState<"1" | "K" | "M">("M")
  const [likesMultiplier, setLikesMultiplier] = useState<"1" | "K" | "M">("K")
  const [followersMultiplier, setFollowersMultiplier] = useState<"1" | "K" | "M">("K")

  const calculateViralityLevel = (viewsNum: number, followersNum: number): string => {
    if (followersNum === 0) return "dormant"
    const ratio = viewsNum / followersNum
    if (ratio >= 10) return "blockbuster"
    if (ratio >= 5) return "viral"
    if (ratio >= 2) return "breakout"
    if (ratio >= 1) return "steady"
    return "dormant"
  }

  const getViralityColor = (level: string): string => {
    switch (level) {
      case "blockbuster":
        return "text-green-600" // >=10x - green
      case "viral":
        return "text-lime-600" // 5-10x - lime/yellow-green
      case "breakout":
        return "text-yellow-600" // 2-5x - yellow
      case "steady":
        return "text-orange-600" // 1-2x - orange
      case "dormant":
        return "text-red-600" // <1x - red
      default:
        return "text-gray-600"
    }
  }

  const handleThumbnailUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setThumbnailFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setThumbnailUrl(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleAddStyle = async () => {
    if (!newStyle.trim() || !contentPillarId) return

    try {
      const supabase = createBrowserClient()

      const { error } = await supabase.from("content_styles_reference").insert({
        pillar_id: contentPillarId,
        style_name: newStyle.trim(),
        style_value: newStyle.trim().toLowerCase().replace(/\s+/g, "_"),
        description: newStyleDescription.trim() || null,
      })

      if (error) throw error

      // Reload content pillars to get updated styles
      onResearchCreated()
      setContentStyle(newStyle.trim())
      setNewStyle("")
      setNewStyleDescription("")
      setShowAddStyleDialog(false)
    } catch (error) {
      console.error("Error adding style:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const supabase = createBrowserClient()
      const { data: membership } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
        .single()

      if (!membership?.workspace_id) throw new Error("No workspace found")

      console.log("[v0] Views input:", views, "Multiplier:", viewsMultiplier)
      console.log("[v0] Followers input:", followers, "Multiplier:", followersMultiplier)

      const viewsValue = views
        ? Number.parseFloat(views) * (viewsMultiplier === "M" ? 1000000 : viewsMultiplier === "K" ? 1000 : 1)
        : null
      const likesValue =
        Number.parseFloat(likes) * (likesMultiplier === "M" ? 1000000 : likesMultiplier === "K" ? 1000 : 1)
      const followersValue =
        Number.parseFloat(followers) * (followersMultiplier === "M" ? 1000000 : followersMultiplier === "K" ? 1000 : 1)

      console.log("[v0] Calculated views:", viewsValue)
      console.log("[v0] Calculated followers:", followersValue)

      const viralityLevel = viewsValue && followersValue ? calculateViralityLevel(viewsValue, followersValue) : null
      console.log("[v0] Virality level:", viralityLevel)

      const { error } = await supabase.from("research").insert({
        workspace_id: membership.workspace_id,
        platform_id: platformId,
        creator_username: creatorUsername,
        thumbnail_url: thumbnailUrl || null,
        link: link || null,
        posting_date: postingDate
          ? `${postingDate.getFullYear()}-${String(postingDate.getMonth() + 1).padStart(2, "0")}-${String(postingDate.getDate()).padStart(2, "0")}`
          : null,
        hook_type: hookType || null,
        hook: hook || null,
        views: viewsValue,
        likes: likesValue,
        followers: followersValue,
        virality_level: viralityLevel,
        has_sfx: hasSfx,
        has_broll: hasBroll,
        has_music: hasMusic,
        avg_seconds_per_clip: avgSecondsPerClip ? Number.parseFloat(avgSecondsPerClip) : null,
        content_pillar_id: contentPillarId || null,
        content_style: contentStyle || null,
        format: format || null,
      })

      if (error) throw error

      resetForm()
      setOpen(false)
      onResearchCreated()
    } catch (error) {
      console.error("Error creating research:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setPlatformId("")
    setCreatorUsername("")
    setThumbnailUrl("")
    setThumbnailFile(null)
    setLink("")
    setPostingDate(undefined)
    setHook("")
    setViews("")
    setLikes("")
    setFollowers("")
    setHasSfx(false)
    setHasBroll(false)
    setHasMusic(false)
    setAvgSecondsPerClip("")
    setHookType("")
    setContentPillarId("")
    setContentStyle("")
    setFormat("")
    setViewsMultiplier("M")
    setLikesMultiplier("K")
    setFollowersMultiplier("K")
  }

  const getAvailableStyles = (): any[] => {
    if (!contentPillarId) return []

    const selectedPillar = contentPillars.find((p) => p.id === contentPillarId)
    return selectedPillar?.styles || []
  }

  useEffect(() => {
    if (contentPillarId) {
      const availableStyles = getAvailableStyles()
      // Reset style selection when pillar changes
      setContentStyle("")
    }
  }, [contentPillarId])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4 mr-2" />
          Add Research
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle>Deconstruct Viral Content</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Platform *</Label>
              <Select value={platformId} onValueChange={setPlatformId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  {workspacePlatforms.length > 0 ? (
                    workspacePlatforms.map((platform) => (
                      <SelectItem key={platform.id} value={platform.id}>
                        {platform.name}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">No platforms found</div>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Content Format *</Label>
              <Select value={format} onValueChange={setFormat}>
                <SelectTrigger>
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="reel">Reel</SelectItem>
                  <SelectItem value="short">Short</SelectItem>
                  <SelectItem value="long_form">Long Form</SelectItem>
                  <SelectItem value="story">Story</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Creator *</Label>
              <div className="flex items-center">
                <span className="text-muted-foreground mr-1">@</span>
                <Input
                  placeholder="username"
                  value={creatorUsername}
                  onChange={(e) => setCreatorUsername(e.target.value)}
                  className="flex-1"
                  required
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Thumbnail</Label>
            <div
              className="border-2 border-dashed border-border rounded-lg p-1 hover:border-accent transition-colors cursor-pointer"
              onClick={() => document.getElementById("thumbnail-upload")?.click()}
            >
              <input
                id="thumbnail-upload"
                type="file"
                accept="image/*"
                onChange={handleThumbnailUpload}
                className="hidden"
              />
              {thumbnailUrl ? (
                <img
                  src={thumbnailUrl || "/placeholder.svg"}
                  alt="Thumbnail preview"
                  className="w-full max-h-48 object-contain rounded"
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Upload className="size-8 mb-2" />
                  <p className="text-sm">Click to upload or drop screenshot here</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Hook Type</Label>
            <RadioGroup value={hookType} onValueChange={setHookType} className="flex gap-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="visual" id="visual" />
                <Label htmlFor="visual" className="font-normal cursor-pointer">
                  Visual
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="written" id="written" />
                <Label htmlFor="written" className="font-normal cursor-pointer">
                  Written
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="verbal" id="verbal" />
                <Label htmlFor="verbal" className="font-normal cursor-pointer">
                  Verbal
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Input
              placeholder={
                hookType === "written"
                  ? "What text was on screen?"
                  : hookType === "visual"
                    ? "What was visually displayed?"
                    : hookType === "verbal"
                      ? "What did the creator say?"
                      : "Select hook type above"
              }
              value={hook}
              onChange={(e) => setHook(e.target.value)}
              disabled={!hookType}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Link to Video</Label>
              <Input type="url" placeholder="https://..." value={link} onChange={(e) => setLink(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Date of Posting</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal bg-white">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {postingDate ? postingDate.toLocaleDateString() : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-white" align="start">
                  <Calendar mode="single" selected={postingDate} onSelect={setPostingDate} weekStartsOn={1} />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Views</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="0"
                  value={views}
                  onChange={(e) => setViews(e.target.value)}
                  className="flex-1"
                />
                <Select value={viewsMultiplier} onValueChange={(value: "1" | "K" | "M") => setViewsMultiplier(value)}>
                  <SelectTrigger className="w-16">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="K">K</SelectItem>
                    <SelectItem value="M">M</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Likes *</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="0"
                  value={likes}
                  onChange={(e) => setLikes(e.target.value)}
                  required
                  className="flex-1"
                />
                <Select value={likesMultiplier} onValueChange={(value: "1" | "K" | "M") => setLikesMultiplier(value)}>
                  <SelectTrigger className="w-16">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="K">K</SelectItem>
                    <SelectItem value="M">M</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Followers *</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="0"
                  value={followers}
                  onChange={(e) => setFollowers(e.target.value)}
                  required
                  className="flex-1"
                />
                <Select
                  value={followersMultiplier}
                  onValueChange={(value: "1" | "K" | "M") => setFollowersMultiplier(value)}
                >
                  <SelectTrigger className="w-16">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="K">K</SelectItem>
                    <SelectItem value="M">M</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {views && followers && (
            <div className="p-3 bg-accent/10 rounded-lg">
              <p className="text-sm font-medium">
                Virality Level:{" "}
                <span
                  className={getViralityColor(
                    calculateViralityLevel(
                      Number.parseFloat(views) *
                        (viewsMultiplier === "M" ? 1000000 : viewsMultiplier === "K" ? 1000 : 1),
                      Number.parseFloat(followers) *
                        (followersMultiplier === "M" ? 1000000 : followersMultiplier === "K" ? 1000 : 1),
                    ),
                  )}
                >
                  {calculateViralityLevel(
                    Number.parseFloat(views) * (viewsMultiplier === "M" ? 1000000 : viewsMultiplier === "K" ? 1000 : 1),
                    Number.parseFloat(followers) *
                      (followersMultiplier === "M" ? 1000000 : followersMultiplier === "K" ? 1000 : 1),
                  )}
                </span>
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Production Elements</Label>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox id="sfx" checked={hasSfx} onCheckedChange={(checked) => setHasSfx(checked as boolean)} />
                <Label htmlFor="sfx" className="font-normal cursor-pointer">
                  SFX Used
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="broll"
                  checked={hasBroll}
                  onCheckedChange={(checked) => setHasBroll(checked as boolean)}
                />
                <Label htmlFor="broll" className="font-normal cursor-pointer">
                  B-Roll Used
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="music"
                  checked={hasMusic}
                  onCheckedChange={(checked) => setHasMusic(checked as boolean)}
                />
                <Label htmlFor="music" className="font-normal cursor-pointer">
                  Music Used
                </Label>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Average Seconds per Clip (Optional)</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="0.5"
                min="0"
                placeholder="-"
                value={avgSecondsPerClip}
                onChange={(e) => setAvgSecondsPerClip(e.target.value)}
                className="w-32"
              />
              <span className="text-sm text-muted-foreground">seconds</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Content Pillar</Label>
              <Select value={contentPillarId} onValueChange={setContentPillarId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select content pillar" />
                </SelectTrigger>
                <SelectContent>
                  {contentPillars.map((pillar) => (
                    <SelectItem key={pillar.id} value={pillar.id}>
                      {pillar.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Content Style</Label>
              <div className="flex gap-2">
                {getAvailableStyles().length > 0 ? (
                  <>
                    <Select value={contentStyle} onValueChange={setContentStyle} disabled={!contentPillarId}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder={contentPillarId ? "Select style" : "Select pillar first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {getAvailableStyles().map((style) => (
                          <SelectItem key={style.id} value={style.style_value}>
                            {style.style_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setShowAddStyleDialog(true)}
                      disabled={!contentPillarId}
                    >
                      <Plus className="size-4" />
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full bg-transparent"
                    onClick={() => setShowAddStyleDialog(true)}
                    disabled={!contentPillarId}
                  >
                    <Plus className="size-4 mr-2" />
                    Add Style
                  </Button>
                )}
              </div>
            </div>
          </div>

          <Button onClick={handleSubmit} disabled={isLoading} className="w-full">
            {isLoading ? "Saving..." : "Save Research"}
          </Button>
        </div>
      </DialogContent>

      <Dialog open={showAddStyleDialog} onOpenChange={setShowAddStyleDialog}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Content Style</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Style Name *</Label>
              <Input
                placeholder="e.g., Talking Head, Voiceover..."
                value={newStyle}
                onChange={(e) => setNewStyle(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && handleAddStyle()}
              />
            </div>
            <div className="space-y-2">
              <Label>Description (Optional)</Label>
              <Input
                placeholder="Brief description of this style..."
                value={newStyleDescription}
                onChange={(e) => setNewStyleDescription(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAddStyle} className="flex-1" disabled={!newStyle.trim()}>
                Add Style
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddStyleDialog(false)
                  setNewStyle("")
                  setNewStyleDescription("")
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}
