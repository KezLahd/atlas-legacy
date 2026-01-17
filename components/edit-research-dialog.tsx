"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Upload, Plus, CalendarIcon, Edit, Trash2 } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { Platform } from "@/lib/types/database"

interface EditResearchDialogProps {
  research: any
  workspacePlatforms: Platform[]
  contentPillars: any[]
  onResearchUpdated: () => void
  workspaceId: string
}

export function EditResearchDialog({
  research,
  workspacePlatforms = [],
  contentPillars = [],
  onResearchUpdated,
  workspaceId,
}: EditResearchDialogProps) {
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  useEffect(() => {
    console.log("[v0] EditResearchDialog - workspacePlatforms prop:", workspacePlatforms)
    console.log("[v0] EditResearchDialog - contentPillars prop:", contentPillars)
  }, [workspacePlatforms, contentPillars])

  const [platformId, setPlatformId] = useState("")
  const [creatorUsername, setCreatorUsername] = useState("")
  const [format, setFormat] = useState("")
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [thumbnailUrl, setThumbnailUrl] = useState("")
  const [link, setLink] = useState("")
  const [postingDate, setPostingDate] = useState<Date | undefined>(undefined)
  const [hookType, setHookType] = useState("")
  const [hook, setHook] = useState("")
  const [hasSfx, setHasSfx] = useState(false)
  const [hasBroll, setHasBroll] = useState(false)
  const [hasMusic, setHasMusic] = useState(false)
  const [avgSecondsPerClip, setAvgSecondsPerClip] = useState("")
  const [contentPillarId, setContentPillarId] = useState("")
  const [contentStyle, setContentStyle] = useState("")
  const [showAddStyleDialog, setShowAddStyleDialog] = useState(false)
  const [newStyle, setNewStyle] = useState("")
  const [newStyleDescription, setNewStyleDescription] = useState("")

  useEffect(() => {
    if (open && research) {
      console.log("[v0] EditResearchDialog - Populating with research:", research)

      setPlatformId(research.platform_id || "")
      setFormat(research.format || "")
      setCreatorUsername(research.creator_username || "")
      setThumbnailUrl(research.thumbnail_url || null)
      setLink(research.link || "")
      setPostingDate(research.posting_date ? new Date(research.posting_date) : null)
      setHookType((research.hook_type as "visual" | "written" | "verbal" | "") || "") // Ensure hookType is properly set
      setHook(research.hook || "")
      setHasSfx(research.has_sfx || false)
      setHasBroll(research.has_broll || false)
      setHasMusic(research.has_music || false)
      setAvgSecondsPerClip(research.avg_seconds_per_clip?.toString() || "")
      setContentPillarId(research.content_pillar_id || "")
      setContentStyle(research.content_style || "")
    }
  }, [open, research]) // Fixed infinite loop by only depending on 'open' and 'research', not arrays

  useEffect(() => {
    if (!open || !research) return

    // Check if any field has changed from original research values
    const changed =
      platformId !== research.platform_id ||
      format !== research.format ||
      creatorUsername !== research.creator_username ||
      link !== research.link ||
      (postingDate && new Date(postingDate).toISOString() !== new Date(research.posting_date).toISOString()) ||
      hookType !== research.hook_type ||
      hook !== research.hook ||
      hasSfx !== research.has_sfx ||
      hasBroll !== research.has_broll ||
      hasMusic !== research.has_music ||
      (avgSecondsPerClip !== "" && Number.parseFloat(avgSecondsPerClip) !== research.avg_seconds_per_clip) ||
      contentPillarId !== research.content_pillar_id ||
      contentStyle !== research.content_style ||
      thumbnailFile !== null

    setHasChanges(changed)
  }, [
    open,
    research,
    platformId,
    format,
    creatorUsername,
    link,
    postingDate,
    hookType,
    hook,
    hasSfx,
    hasBroll,
    hasMusic,
    avgSecondsPerClip,
    contentPillarId,
    contentStyle,
    thumbnailFile,
  ])

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

  const getAvailableStyles = () => {
    if (!contentPillarId) return []
    const selectedPillar = contentPillars.find((p) => p.id === contentPillarId)
    return selectedPillar?.content_styles_reference || []
  }

  useEffect(() => {
    if (contentPillarId && !getAvailableStyles().find((s: any) => s.style_value === contentStyle)) {
      setContentStyle("")
    }
  }, [contentPillarId])

  const handleAddStyle = async () => {
    if (!newStyle.trim() || !contentPillarId) return

    const styleValue = newStyle.toLowerCase().replace(/\s+/g, "_")

    const { error } = await supabase.from("content_styles_reference").insert({
      pillar_id: contentPillarId,
      style_name: newStyle,
      style_value: styleValue,
      description: newStyleDescription || null,
    })

    if (!error) {
      setContentStyle(styleValue)
      setNewStyle("")
      setNewStyleDescription("")
      setShowAddStyleDialog(false)
    }
  }

  const getHookPlaceholder = () => {
    switch (hookType) {
      case "visual":
        return "What was visually displayed?"
      case "written":
        return "What text was on screen?"
      case "verbal":
        return "What did the creator say?"
      default:
        return "Select hook type first"
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    let finalThumbnailUrl = thumbnailUrl
    if (thumbnailFile) {
      const fileExt = thumbnailFile.name.split(".").pop()
      const fileName = `${research.id}-${Date.now()}.${fileExt}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("research-thumbnails")
        .upload(fileName, thumbnailFile)

      if (!uploadError && uploadData) {
        const { data: urlData } = supabase.storage.from("research-thumbnails").getPublicUrl(uploadData.path)
        finalThumbnailUrl = urlData.publicUrl
      }
    }

    let formattedDate = null
    if (postingDate) {
      const year = postingDate.getFullYear()
      const month = String(postingDate.getMonth() + 1).padStart(2, "0")
      const day = String(postingDate.getDate()).padStart(2, "0")
      formattedDate = `${year}-${month}-${day}`
    }

    const { error } = await supabase
      .from("research")
      .update({
        platform_id: platformId,
        creator_username: creatorUsername,
        format,
        thumbnail_url: finalThumbnailUrl,
        link,
        posting_date: formattedDate,
        hook_type: hookType,
        hook,
        has_sfx: hasSfx,
        has_broll: hasBroll,
        has_music: hasMusic,
        avg_seconds_per_clip: avgSecondsPerClip ? Number.parseFloat(avgSecondsPerClip) : null,
        content_pillar_id: contentPillarId || null,
        content_style: contentStyle || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", research.id)

    setIsSubmitting(false)

    if (!error) {
      setOpen(false)
      onResearchUpdated()
    }
  }

  const handleDelete = async () => {
    setIsSubmitting(true)

    const { error } = await supabase.from("research").delete().eq("id", research.id)

    setIsSubmitting(false)

    if (!error) {
      setShowDeleteDialog(false)
      setOpen(false)
      onResearchUpdated()
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full justify-start">
            <Edit className="mr-2 size-4" />
            Edit
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle>Edit Research</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="platform">Platform *</Label>
                  <Select value={platformId} onValueChange={setPlatformId} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select platform" />
                    </SelectTrigger>
                    <SelectContent>
                      {workspacePlatforms.map((platform) => (
                        <SelectItem key={platform.id} value={platform.id}>
                          {platform.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="format">Content Format *</Label>
                  <Select value={format} onValueChange={setFormat} required>
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
                  <Label htmlFor="creator">Creator *</Label>
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">@</span>
                    <Input
                      id="creator"
                      value={creatorUsername}
                      onChange={(e) => setCreatorUsername(e.target.value)}
                      placeholder="username"
                      required
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              {/* Thumbnail */}
              <div className="space-y-2">
                <Label>Thumbnail</Label>
                <div
                  onClick={() => document.getElementById("thumbnail-upload-edit")?.click()}
                  className="border-2 border-dashed rounded-lg p-1 flex items-center justify-center cursor-pointer hover:border-accent transition-colors"
                >
                  {thumbnailUrl ? (
                    <img src={thumbnailUrl || "/placeholder.svg"} alt="Thumbnail" className="max-h-32 object-contain" />
                  ) : (
                    <div className="text-center py-4">
                      <Upload className="mx-auto size-8 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">Click to upload thumbnail</p>
                    </div>
                  )}
                </div>
                <input
                  id="thumbnail-upload-edit"
                  type="file"
                  accept="image/*"
                  onChange={handleThumbnailUpload}
                  className="hidden"
                />
              </div>

              {/* Link and Posting Date */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="link">Link to Video</Label>
                  <Input
                    id="link"
                    type="url"
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    placeholder="https://..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Date of Posting</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal bg-transparent">
                        <CalendarIcon className="mr-2 size-4" />
                        {postingDate ? postingDate.toLocaleDateString() : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-white" align="start">
                      <Calendar
                        mode="single"
                        selected={postingDate}
                        onSelect={setPostingDate}
                        initialFocus
                        weekStartsOn={1}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Hook Type */}
              <div className="space-y-2">
                <Label>Hook Type</Label>
                <RadioGroup value={hookType} onValueChange={setHookType}>
                  <div className="flex gap-4">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="visual" id="edit-visual" />
                      <Label htmlFor="edit-visual" className="font-normal cursor-pointer">
                        Visual
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="written" id="edit-written" />
                      <Label htmlFor="edit-written" className="font-normal cursor-pointer">
                        Written
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="verbal" id="edit-verbal" />
                      <Label htmlFor="edit-verbal" className="font-normal cursor-pointer">
                        Verbal
                      </Label>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Input
                  type="text"
                  value={hook}
                  onChange={(e) => setHook(e.target.value)}
                  placeholder={getHookPlaceholder()}
                  disabled={!hookType}
                />
              </div>

              {/* Production Elements */}
              <div className="space-y-2">
                <Label>Production Elements</Label>
                <div className="flex gap-6">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="sfx-edit"
                      checked={hasSfx}
                      onCheckedChange={(checked) => setHasSfx(checked === true)}
                    />
                    <Label htmlFor="sfx-edit" className="font-normal cursor-pointer">
                      SFX Used
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="broll-edit"
                      checked={hasBroll}
                      onCheckedChange={(checked) => setHasBroll(checked === true)}
                    />
                    <Label htmlFor="broll-edit" className="font-normal cursor-pointer">
                      B-Roll Used
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="music-edit"
                      checked={hasMusic}
                      onCheckedChange={(checked) => setHasMusic(checked === true)}
                    />
                    <Label htmlFor="music-edit" className="font-normal cursor-pointer">
                      Music Used
                    </Label>
                  </div>
                </div>
              </div>

              {/* Average Seconds Per Clip */}
              <div className="space-y-2">
                <Label htmlFor="cadence">Average Seconds Per Clip (Optional)</Label>
                <Input
                  id="cadence"
                  type="number"
                  step="0.5"
                  value={avgSecondsPerClip}
                  onChange={(e) => setAvgSecondsPerClip(e.target.value)}
                  placeholder="-"
                />
              </div>

              {/* Content Pillar and Style */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pillar">Content Pillar</Label>
                  <Select value={contentPillarId} onValueChange={setContentPillarId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select pillar" />
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

                <div className="flex gap-2">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="style">Content Style</Label>
                    <Select value={contentStyle} onValueChange={setContentStyle} disabled={!contentPillarId}>
                      <SelectTrigger>
                        <SelectValue placeholder={contentPillarId ? "Select style" : "Select pillar first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {getAvailableStyles().map((style: any) => (
                          <SelectItem key={style.id} value={style.style_value}>
                            {style.style_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={() => setShowAddStyleDialog(true)}
                    disabled={!contentPillarId}
                  >
                    <Plus className="size-4" />
                  </Button>
                </div>
              </div>

              {/* Button Layout */}
              <div className="flex justify-between gap-2">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={isSubmitting}
                >
                  <Trash2 className="mr-2 size-4" />
                  Delete
                </Button>
                <Button
                  type="submit"
                  className="bg-accent hover:bg-accent/90 text-primary"
                  disabled={isSubmitting || !hasChanges}
                >
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Style Dialog */}
      <Dialog open={showAddStyleDialog} onOpenChange={setShowAddStyleDialog}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>Add New Style</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="newStyle">Style Name *</Label>
              <Input
                id="newStyle"
                value={newStyle}
                onChange={(e) => setNewStyle(e.target.value)}
                placeholder="e.g., Talking Head"
              />
            </div>
            <div>
              <Label htmlFor="styleDescription">Description (Optional)</Label>
              <Textarea
                id="styleDescription"
                value={newStyleDescription}
                onChange={(e) => setNewStyleDescription(e.target.value)}
                placeholder="Describe this content style..."
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowAddStyleDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddStyle} disabled={!newStyle.trim()}>
                Add Style
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Research Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this research item? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
