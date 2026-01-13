"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus } from "lucide-react"
import type { Platform } from "@/lib/types/database"

interface CreateResearchDialogProps {
  workspaceId: string
  platforms: Platform[]
  onResearchCreated: () => void
}

export function CreateResearchDialog({ workspaceId, platforms, onResearchCreated }: CreateResearchDialogProps) {
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const [platformId, setPlatformId] = useState("")
  const [link, setLink] = useState("")
  const [creatorNiche, setCreatorNiche] = useState("")
  const [hook, setHook] = useState("")
  const [scriptBreakdown, setScriptBreakdown] = useState("")
  const [soundDesign, setSoundDesign] = useState("")
  const [music, setMusic] = useState("")
  const [cadence, setCadence] = useState("")
  const [bRoll, setBRoll] = useState("")
  const [style, setStyle] = useState("")
  const [whyItWorked, setWhyItWorked] = useState("")

  const handleSubmit = async () => {
    if (!platformId) {
      alert("Please select a platform")
      return
    }

    setIsLoading(true)
    try {
      await supabase.from("research").insert({
        workspace_id: workspaceId,
        platform_id: platformId,
        link: link || null,
        creator_niche: creatorNiche || null,
        hook: hook || null,
        script_breakdown: scriptBreakdown || null,
        sound_design: soundDesign || null,
        music: music || null,
        cadence: cadence || null,
        b_roll: bRoll || null,
        style: style || null,
        why_it_worked: whyItWorked || null,
      })

      resetForm()
      setOpen(false)
      onResearchCreated()
    } catch (error: any) {
      alert(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setPlatformId("")
    setLink("")
    setCreatorNiche("")
    setHook("")
    setScriptBreakdown("")
    setSoundDesign("")
    setMusic("")
    setCadence("")
    setBRoll("")
    setStyle("")
    setWhyItWorked("")
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4 mr-2" />
          Add Research
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Deconstruct Viral Content</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Platform *</Label>
            <Select value={platformId} onValueChange={setPlatformId}>
              <SelectTrigger>
                <SelectValue placeholder="Select platform" />
              </SelectTrigger>
              <SelectContent>
                {platforms.map((platform) => (
                  <SelectItem key={platform.id} value={platform.id}>
                    {platform.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Link</Label>
            <Input placeholder="https://..." value={link} onChange={(e) => setLink(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Creator / Niche</Label>
            <Input
              placeholder="@username or niche"
              value={creatorNiche}
              onChange={(e) => setCreatorNiche(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Hook</Label>
            <Input placeholder="Opening line or visual" value={hook} onChange={(e) => setHook(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Script Breakdown</Label>
            <Textarea
              placeholder="Break down the script and structure"
              rows={4}
              value={scriptBreakdown}
              onChange={(e) => setScriptBreakdown(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Sound Design</Label>
              <Input placeholder="SFX used" value={soundDesign} onChange={(e) => setSoundDesign(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Music</Label>
              <Input placeholder="Track or style" value={music} onChange={(e) => setMusic(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Cadence</Label>
            <Input placeholder="Pacing and rhythm" value={cadence} onChange={(e) => setCadence(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>B-roll</Label>
            <Input placeholder="Visual elements" value={bRoll} onChange={(e) => setBRoll(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Style</Label>
            <Input placeholder="Overall style" value={style} onChange={(e) => setStyle(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Why It Worked</Label>
            <Textarea
              placeholder="Key insights on why this content was successful"
              rows={4}
              value={whyItWorked}
              onChange={(e) => setWhyItWorked(e.target.value)}
            />
          </div>

          <Button onClick={handleSubmit} disabled={isLoading} className="w-full">
            {isLoading ? "Saving..." : "Save Research"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
