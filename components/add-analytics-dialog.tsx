"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus } from "lucide-react"
import type { Platform } from "@/lib/types/database"

interface AddAnalyticsDialogProps {
  contentId: string
  onAnalyticsAdded: () => void
}

export function AddAnalyticsDialog({ contentId, onAnalyticsAdded }: AddAnalyticsDialogProps) {
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [platforms, setPlatforms] = useState<Platform[]>([])

  const [platformId, setPlatformId] = useState("")
  const [views, setViews] = useState("")
  const [watchTime, setWatchTime] = useState("")
  const [completionRate, setCompletionRate] = useState("")
  const [saves, setSaves] = useState("")
  const [shares, setShares] = useState("")
  const [follows, setFollows] = useState("")
  const [hookRetention, setHookRetention] = useState("")
  const [dropOffTimestamp, setDropOffTimestamp] = useState("")

  useEffect(() => {
    if (open) {
      loadPlatforms()
    }
  }, [open])

  const loadPlatforms = async () => {
    const { data } = await supabase.from("platforms").select("*").order("name")
    if (data) setPlatforms(data)
  }

  const handleSubmit = async () => {
    if (!platformId) {
      alert("Please select a platform")
      return
    }

    setIsLoading(true)
    try {
      await supabase.from("analytics").insert({
        content_id: contentId,
        platform_id: platformId,
        views: views ? Number.parseInt(views) : null,
        watch_time: watchTime ? Number.parseInt(watchTime) : null,
        completion_rate: completionRate ? Number.parseFloat(completionRate) : null,
        saves: saves ? Number.parseInt(saves) : null,
        shares: shares ? Number.parseInt(shares) : null,
        follows: follows ? Number.parseInt(follows) : null,
        hook_retention: hookRetention ? Number.parseFloat(hookRetention) : null,
        drop_off_timestamp: dropOffTimestamp ? Number.parseInt(dropOffTimestamp) : null,
      })

      resetForm()
      setOpen(false)
      onAnalyticsAdded()
    } catch (error: any) {
      alert(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setPlatformId("")
    setViews("")
    setWatchTime("")
    setCompletionRate("")
    setSaves("")
    setShares("")
    setFollows("")
    setHookRetention("")
    setDropOffTimestamp("")
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="size-3 mr-1" />
          Add Analytics
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Analytics Data</DialogTitle>
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Views</Label>
              <Input type="number" placeholder="10000" value={views} onChange={(e) => setViews(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Watch Time (seconds)</Label>
              <Input type="number" placeholder="45" value={watchTime} onChange={(e) => setWatchTime(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Completion Rate (%)</Label>
              <Input
                type="number"
                step="0.1"
                placeholder="75.5"
                value={completionRate}
                onChange={(e) => setCompletionRate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Hook Retention (%)</Label>
              <Input
                type="number"
                step="0.1"
                placeholder="85.2"
                value={hookRetention}
                onChange={(e) => setHookRetention(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Saves</Label>
              <Input type="number" placeholder="250" value={saves} onChange={(e) => setSaves(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Shares</Label>
              <Input type="number" placeholder="120" value={shares} onChange={(e) => setShares(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Follows</Label>
              <Input type="number" placeholder="45" value={follows} onChange={(e) => setFollows(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Drop-off Timestamp (seconds)</Label>
            <Input
              type="number"
              placeholder="30"
              value={dropOffTimestamp}
              onChange={(e) => setDropOffTimestamp(e.target.value)}
            />
          </div>

          <Button onClick={handleSubmit} disabled={isLoading} className="w-full">
            {isLoading ? "Saving..." : "Save Analytics"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
