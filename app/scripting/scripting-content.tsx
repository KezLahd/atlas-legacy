"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { updateContentScript } from "@/app/actions/content"
import { AppNav } from "@/components/app-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Footer } from "@/components/footer"
import { Save, CheckCircle, ChevronLeft } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface ContentItem {
  id: string
  hook: string
  production_stage: string
  format: string | null
  creators?: { name: string }
  content_content_pillars?: Array<{ content_pillars: { name: string } }>
  content_platforms?: Array<{ platforms: { name: string } }>
}

interface ScriptScene {
  id: string
  scene_number: number
  audio_script: string
  visuals: string
}

export default function ScriptingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const contentId = searchParams.get("content")
  const supabase = createClient()

  const [user, setUser] = useState<any>(null)
  const [workspaceId, setWorkspaceId] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  const [selectedContentId, setSelectedContentId] = useState<string>(contentId || "")
  const [availableContent, setAvailableContent] = useState<ContentItem[]>([])
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null)

  // Script fields
  const [hook, setHook] = useState("")
  const [scenes, setScenes] = useState<ScriptScene[]>([])
  const [bRoll, setBRoll] = useState("")
  const [cta, setCta] = useState("")

  const [availableBRoll, setAvailableBRoll] = useState<Array<{ id: string; name: string }>>([])
  const [selectedBRoll, setSelectedBRoll] = useState<string[]>([])
  const [availableSFX, setAvailableSFX] = useState<Array<{ id: string; name: string }>>([])
  const [selectedSFX, setSelectedSFX] = useState<string[]>([])

  // Dialog states for B-roll and SFX
  const [showBRollDialog, setShowBRollDialog] = useState(false)
  const [showSFXDialog, setShowSFXDialog] = useState(false)
  const [newBRollName, setNewBRollName] = useState("")
  const [newBRollDescription, setNewBRollDescription] = useState("")
  const [newSFXName, setNewSFXName] = useState("")
  const [newSFXDescription, setNewSFXDescription] = useState("")

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (selectedContentId) {
      loadContentDetails(selectedContentId)
    }
  }, [selectedContentId])

  const loadData = async () => {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()
    if (!authUser) {
      router.push("/auth/login")
      return
    }
    setUser(authUser)

    const { data: membership } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", authUser.id)
      .single()

    if (!membership) {
      router.push("/onboarding")
      return
    }

    setWorkspaceId(membership.workspace_id)

    // Load all content in idea or scripted stage
    const { data: contentList } = await supabase
      .from("content")
      .select(
        `
        id,
        hook,
        production_stage,
        format,
        creators!inner(name, workspace_id),
        content_content_pillars(content_pillars(name)),
        content_platforms(platforms(name))
      `,
      )
      .eq("creators.workspace_id", membership.workspace_id)
      .in("production_stage", ["idea", "scripted"])
      .order("updated_at", { ascending: false })

    if (contentList) {
      setAvailableContent(contentList as ContentItem[])
    }

    const { data: bRollList } = await supabase
      .from("broll_reference")
      .select("id, name")
      .eq("workspace_id", membership.workspace_id)
      .order("name")

    const { data: sfxList } = await supabase.from("sfx_reference").select("id, name").order("name")

    if (bRollList) setAvailableBRoll(bRollList)
    if (sfxList) setAvailableSFX(sfxList)

    setIsLoading(false)
  }

  const loadContentDetails = async (id: string) => {
    const { data } = await supabase
      .from("content")
      .select(
        `
        *,
        creators(name),
        content_content_pillars(content_pillars(name)),
        content_platforms(platforms(name))
      `,
      )
      .eq("id", id)
      .maybeSingle()

    if (data) {
      setSelectedContent(data)
      setHook(data.hook || "")
      const { data: scenesData } = await supabase
        .from("script_scenes")
        .select("*")
        .eq("content_id", id)
        .order("scene_number", { ascending: true })

      if (scenesData && scenesData.length > 0) {
        setScenes(scenesData)
      } else {
        // Initialize with one empty scene
        setScenes([{ id: "", scene_number: 1, audio_script: "", visuals: "" }])
      }
      setCta(data.cta || "")
      setIsEditing(data.production_stage === "idea")
    }
  }

  const handleEdit = async () => {
    if (!selectedContentId) return

    setIsSaving(true)
    const result = await updateContentScript(selectedContentId, {
      production_stage: "idea",
    })

    setIsSaving(false)

    if (result.error) {
      console.error("[v0] Error editing script:", result.error)
      alert("Failed to edit script. Please try again.")
      return
    }

    setIsEditing(true)
    await loadContentDetails(selectedContentId)
  }

  const handleSave = async () => {
    if (!selectedContentId) return

    setIsSaving(true)

    // Save basic fields
    const result = await updateContentScript(selectedContentId, {
      hook,
      cta,
      production_stage: "idea",
    })

    if (result.error) {
      setIsSaving(false)
      console.error("[v0] Error saving script:", result.error)
      alert("Failed to save script. Please try again.")
      return
    }

    // First, delete existing scenes
    await supabase.from("script_scenes").delete().eq("content_id", selectedContentId)

    // Then insert new scenes
    const scenesToInsert = scenes.map((scene) => ({
      content_id: selectedContentId,
      scene_number: scene.scene_number,
      audio_script: scene.audio_script,
      visuals: scene.visuals,
    }))

    const { error: scenesError } = await supabase.from("script_scenes").insert(scenesToInsert)

    if (scenesError) {
      console.error("[v0] Error saving scenes:", scenesError)
      alert("Failed to save scenes. Please try again.")
    }

    setIsSaving(false)
    await loadContentDetails(selectedContentId)
  }

  const handleFinalise = async () => {
    if (!selectedContentId) return

    setIsSaving(true)

    // Save basic fields
    const result = await updateContentScript(selectedContentId, {
      hook,
      cta,
      production_stage: "scripted",
    })

    if (result.error) {
      setIsSaving(false)
      console.error("[v0] Error finalising script:", result.error)
      alert("Failed to finalise script. Please try again.")
      return
    }

    await supabase.from("script_scenes").delete().eq("content_id", selectedContentId)

    const scenesToInsert = scenes.map((scene) => ({
      content_id: selectedContentId,
      scene_number: scene.scene_number,
      audio_script: scene.audio_script,
      visuals: scene.visuals,
    }))

    const { error: scenesError } = await supabase.from("script_scenes").insert(scenesToInsert)

    if (scenesError) {
      console.error("[v0] Error saving scenes:", scenesError)
      alert("Failed to save scenes. Please try again.")
    }

    setIsSaving(false)
    setIsEditing(false)
    await loadContentDetails(selectedContentId)
  }

  // Scene management functions
  const addScene = () => {
    const newSceneNumber = scenes.length + 1
    setScenes([...scenes, { id: "", scene_number: newSceneNumber, audio_script: "", visuals: "" }])
  }

  const updateScene = (index: number, field: "audio_script" | "visuals", value: string) => {
    const updatedScenes = [...scenes]
    updatedScenes[index][field] = value
    setScenes(updatedScenes)
  }

  const deleteScene = (index: number) => {
    if (scenes.length === 1) return // Keep at least one scene
    const updatedScenes = scenes.filter((_, i) => i !== index)
    // Renumber scenes
    updatedScenes.forEach((scene, i) => {
      scene.scene_number = i + 1
    })
    setScenes(updatedScenes)
  }

  const toggleBRoll = (id: string) => {
    setSelectedBRoll((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]))
  }

  const toggleSFX = (id: string) => {
    setSelectedSFX((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]))
  }

  const handleAddBRoll = async () => {
    if (!newBRollName.trim() || !workspaceId || !user) return

    const { data, error } = await supabase
      .from("broll_reference")
      .insert({
        workspace_id: workspaceId,
        user_id: user.id,
        name: newBRollName.trim(),
        description: newBRollDescription.trim() || null,
      })
      .select()

    if (error) {
      console.error("[v0] Error adding B-roll:", error)
      alert("Failed to add B-roll. Please try again.")
      return
    }

    // Refresh the B-roll list
    const { data: bRollList } = await supabase
      .from("broll_reference")
      .select("id, name")
      .eq("workspace_id", workspaceId)
      .order("name")

    if (bRollList) setAvailableBRoll(bRollList)

    setNewBRollName("")
    setNewBRollDescription("")
    setShowBRollDialog(false)
  }

  const handleAddSFX = async () => {
    if (!newSFXName.trim() || !workspaceId || !user) return

    const { data, error } = await supabase
      .from("sfx_reference")
      .insert({
        workspace_id: workspaceId,
        user_id: user.id,
        name: newSFXName.trim(),
        description: newSFXDescription.trim() || null,
      })
      .select()

    if (error) {
      console.error("[v0] Error adding SFX:", error)
      alert("Failed to add SFX. Please try again.")
      return
    }

    // Refresh the SFX list
    const { data: sfxList } = await supabase.from("sfx_reference").select("id, name").order("name")

    if (sfxList) setAvailableSFX(sfxList)

    setNewSFXName("")
    setNewSFXDescription("")
    setShowSFXDialog(false)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppNav userEmail={user?.email} />

      <main className="container mx-auto p-6 flex-1 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.push("/content")} className="h-9 w-9 p-0">
              <ChevronLeft className="size-5" />
            </Button>
            <h1 className="text-2xl font-semibold">Scripting</h1>
          </div>

          {selectedContentId && (
            <div className="flex gap-2">
              {!isEditing && selectedContent?.production_stage === "scripted" ? (
                <Button onClick={handleEdit} variant="outline" size="sm">
                  Edit
                </Button>
              ) : (
                <>
                  <Button onClick={handleSave} disabled={isSaving} variant="outline" size="sm">
                    <Save className="size-4 mr-2" />
                    Save
                  </Button>
                  <Button onClick={handleFinalise} disabled={isSaving} size="sm">
                    <CheckCircle className="size-4 mr-2" />
                    Finalise
                  </Button>
                </>
              )}
            </div>
          )}
        </div>

        {selectedContentId && selectedContent ? (
          <>
            <Card className="bg-white shadow-sm p-0 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-100 rounded-t-lg">
                    <th className="text-left font-semibold px-4 py-3 text-sm rounded-tl-lg">Title</th>
                    <th className="text-left font-semibold px-4 py-3 text-sm">Stage</th>
                    <th className="text-left font-semibold px-4 py-3 text-sm">Creator</th>
                    <th className="text-left font-semibold px-4 py-3 text-sm">Pillar</th>
                    <th className="text-left font-semibold px-4 py-3 text-sm">Platforms</th>
                    <th className="text-left font-semibold px-4 py-3 text-sm rounded-tr-lg">Format</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-4 py-3 font-medium">
                      <div className="space-y-1">
                        <p>{selectedContent.hook || "Untitled Content"}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        className={
                          selectedContent.production_stage === "idea"
                            ? "bg-red-100 text-red-800 border-red-200"
                            : "bg-orange-100 text-orange-800 border-orange-200"
                        }
                        variant="outline"
                      >
                        {selectedContent.production_stage === "idea" ? "Scripting" : "Scripted"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">{selectedContent.creators?.name || "-"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        {selectedContent.content_content_pillars?.map((ccp: any, idx: number) => (
                          <span key={idx} className="text-xs">
                            {ccp.content_pillars.name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {selectedContent.content_platforms?.map((cp: any, idx: number) => {
                          const platformName = cp.platforms.name.toLowerCase()
                          let iconPath = ""

                          if (platformName.includes("youtube")) {
                            iconPath = "/icons/youtube.svg"
                          } else if (platformName === "tiktok") {
                            iconPath = "/icons/tiktok.svg"
                          } else if (platformName === "instagram") {
                            iconPath = "/icons/instagram.svg"
                          } else if (platformName === "x" || platformName === "twitter") {
                            iconPath = "/icons/x.svg"
                          } else if (platformName === "linkedin") {
                            iconPath = "/icons/linkedin.svg"
                          } else if (platformName === "facebook") {
                            iconPath = "/icons/facebook.svg"
                          }

                          return iconPath ? (
                            <img
                              key={idx}
                              src={iconPath || "/placeholder.svg"}
                              alt={cp.platforms.name}
                              className="size-5"
                            />
                          ) : (
                            <span key={idx} className="text-xs">
                              {cp.platforms.name}
                            </span>
                          )
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-3 capitalize">{selectedContent.format || "-"}</td>
                  </tr>
                </tbody>
              </table>
            </Card>

            <Card className="bg-white shadow-sm">
              <CardContent className="px-5 py-2 space-y-2">
                <div className="flex items-center gap-3">
                  <Label className="font-bold text-sm whitespace-nowrap">Hook/Title:</Label>
                  <Input
                    placeholder="Enter hook or title..."
                    value={hook}
                    onChange={(e) => setHook(e.target.value)}
                    disabled={!isEditing}
                    className="text-xl font-semibold border-0 border-b border-accent rounded-none px-0 focus-visible:ring-0 focus-visible:border-accent flex-1"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="font-bold text-sm">Main Script:</Label>
                    {isEditing && (
                      <Button onClick={addScene} variant="outline" size="sm" className="h-7 text-xs bg-transparent">
                        + Add Scene
                      </Button>
                    )}
                  </div>

                  <div className="rounded-lg border border-border overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left font-semibold px-4 py-3 text-sm w-12 border-0">#</th>
                          <th className="text-left font-semibold px-4 py-3 text-sm w-1/2 bg-primary text-white border-l border-r border-t border-border">
                            Audio (What to say)
                          </th>
                          <th className="text-left font-semibold px-4 py-3 text-sm w-1/2 bg-accent/20 text-primary border-r border-t border-border">
                            Visuals (What to show)
                          </th>
                          {isEditing && <th className="w-12 border-0"></th>}
                        </tr>
                      </thead>
                      <tbody>
                        {scenes.map((scene, index) => (
                          <tr key={index}>
                            <td className="px-4 py-3 text-sm font-medium text-muted-foreground align-top border-0">
                              {scene.scene_number}
                            </td>
                            <td className="px-4 py-3 align-top border-l border-r border-b border-t border-border">
                              <Textarea
                                placeholder="Enter what the creator should say..."
                                value={scene.audio_script}
                                onChange={(e) => updateScene(index, "audio_script", e.target.value)}
                                disabled={!isEditing}
                                className="min-h-[80px] text-base leading-relaxed border-0 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none resize-none p-0 text-primary font-medium bg-transparent"
                              />
                            </td>
                            <td className="px-4 py-3 bg-white align-top border-r border-b border-t border-border">
                              <Textarea
                                placeholder="Describe what's happening in this scene..."
                                value={scene.visuals}
                                onChange={(e) => updateScene(index, "visuals", e.target.value)}
                                disabled={!isEditing}
                                className="min-h-[80px] text-base leading-relaxed border-0 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none resize-none p-0 bg-transparent"
                                style={{ color: "hsl(var(--accent) / 0.9)" }}
                              />
                            </td>
                            {isEditing && (
                              <td className="px-2 py-3 align-top border-0">
                                <Button
                                  onClick={() => deleteScene(index)}
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  disabled={scenes.length === 1}
                                >
                                  <span className="text-2xl font-bold">×</span>
                                </Button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Label className="font-bold text-sm whitespace-nowrap">CTA:</Label>
                  <Input
                    placeholder="Call to action..."
                    value={cta}
                    onChange={(e) => setCta(e.target.value)}
                    disabled={!isEditing}
                    className="text-sm border-0 border-b border-accent rounded-none px-0 pb-2 focus-visible:ring-0 focus-visible:border-accent flex-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-6 pt-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-bold">B-Roll</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs bg-transparent"
                        disabled={!isEditing}
                        onClick={() => setShowBRollDialog(true)}
                      >
                        + Add B-Roll
                      </Button>
                    </div>
                    <div className="min-h-[120px]">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                        {availableBRoll.map((item) => (
                          <div key={item.id} className="flex items-center gap-2">
                            <Checkbox
                              id={`broll-${item.id}`}
                              checked={selectedBRoll.includes(item.id)}
                              onCheckedChange={() => toggleBRoll(item.id)}
                              disabled={!isEditing}
                              className="size-4"
                            />
                            <Label htmlFor={`broll-${item.id}`} className="cursor-pointer text-sm flex-1">
                              {item.name}
                            </Label>
                          </div>
                        ))}
                      </div>
                      {availableBRoll.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-4">No B-roll available</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-bold">SFX</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs bg-transparent"
                        disabled={!isEditing}
                        onClick={() => setShowSFXDialog(true)}
                      >
                        + Add SFX
                      </Button>
                    </div>
                    <div className="min-h-[120px]">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                        {availableSFX.map((item) => (
                          <div key={item.id} className="flex items-center gap-2">
                            <Checkbox
                              id={`sfx-${item.id}`}
                              checked={selectedSFX.includes(item.id)}
                              onCheckedChange={() => toggleSFX(item.id)}
                              disabled={!isEditing}
                              className="size-4"
                            />
                            <Label htmlFor={`sfx-${item.id}`} className="cursor-pointer text-sm flex-1">
                              {item.name}
                            </Label>
                          </div>
                        ))}
                      </div>
                      {availableSFX.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-4">No SFX available</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card className="bg-white shadow-sm">
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">Select a piece of content to start scripting</p>
            </CardContent>
          </Card>
        )}
      </main>

      {/* B-roll dialog */}
      <Dialog open={showBRollDialog} onOpenChange={setShowBRollDialog}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>Add B-Roll</DialogTitle>
            <DialogDescription>Add a new B-roll item to your workspace library.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="broll-name">Name *</Label>
              <Input
                id="broll-name"
                placeholder="e.g., City Skyline"
                value={newBRollName}
                onChange={(e) => setNewBRollName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="broll-description">Description</Label>
              <Textarea
                id="broll-description"
                placeholder="Optional description..."
                value={newBRollDescription}
                onChange={(e) => setNewBRollDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBRollDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddBRoll} disabled={!newBRollName.trim()}>
              Add B-Roll
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SFX dialog */}
      <Dialog open={showSFXDialog} onOpenChange={setShowSFXDialog}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>Add SFX</DialogTitle>
            <DialogDescription>Add a new sound effect to the SFX library.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="sfx-name">Name *</Label>
              <Input
                id="sfx-name"
                placeholder="e.g., Whoosh"
                value={newSFXName}
                onChange={(e) => setNewSFXName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sfx-description">Description</Label>
              <Textarea
                id="sfx-description"
                placeholder="Optional description..."
                value={newSFXDescription}
                onChange={(e) => setNewSFXDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSFXDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddSFX} disabled={!newSFXName.trim()}>
              Add SFX
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  )
}
