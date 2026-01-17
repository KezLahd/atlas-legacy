"use client"

import type React from "react"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TrendingUp } from "lucide-react"

interface UpdateResearchMetricsDialogProps {
  research: any
  onMetricsUpdated: () => void
}

export function UpdateResearchMetricsDialog({ research, onMetricsUpdated }: UpdateResearchMetricsDialogProps) {
  const supabase = createClient()
  const [open, setOpen] = useState(false)

  const formatValueForDisplay = (value: number, multiplier: string) => {
    if (multiplier === "M") {
      return (value / 1000000).toFixed(1)
    } else if (multiplier === "K") {
      return Math.round(value / 1000).toString()
    } else {
      return Math.round(value).toString()
    }
  }

  const [views, setViews] = useState(
    research.views ? formatValueForDisplay(research.views, research.views >= 1000000 ? "M" : "K") : "",
  )
  const [viewsMultiplier, setViewsMultiplier] = useState(research.views >= 1000000 ? "M" : "K")
  const [likes, setLikes] = useState(
    research.likes ? formatValueForDisplay(research.likes, research.likes >= 1000000 ? "M" : "K") : "",
  )
  const [likesMultiplier, setLikesMultiplier] = useState(research.likes >= 1000000 ? "M" : "K")
  const [followers, setFollowers] = useState(
    research.followers ? formatValueForDisplay(research.followers, research.followers >= 1000000 ? "M" : "K") : "",
  )
  const [followersMultiplier, setFollowersMultiplier] = useState(research.followers >= 1000000 ? "M" : "K")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const calculateViralityLevel = (totalViews: number, totalFollowers: number) => {
    if (totalFollowers === 0) return "dormant"
    const ratio = totalViews / totalFollowers
    if (ratio >= 10) return "blockbuster"
    if (ratio >= 5) return "viral"
    if (ratio >= 2) return "breakout"
    if (ratio >= 1) return "steady"
    return "dormant"
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    const viewsValue =
      Number.parseFloat(views) * (viewsMultiplier === "M" ? 1000000 : viewsMultiplier === "K" ? 1000 : 1)
    const likesValue =
      Number.parseFloat(likes) * (likesMultiplier === "M" ? 1000000 : likesMultiplier === "K" ? 1000 : 1)
    const followersValue =
      Number.parseFloat(followers) * (followersMultiplier === "M" ? 1000000 : followersMultiplier === "K" ? 1000 : 1)

    const viralityLevel = calculateViralityLevel(viewsValue, followersValue)

    // Store old metrics in trends table before updating
    const { error: trendsError } = await supabase.from("research_trends").insert({
      research_id: research.id,
      views: research.views || 0,
      likes: research.likes || 0,
      followers: research.followers || 0,
      recorded_at: new Date().toISOString(),
    })

    // Update research with new metrics
    const { error: updateError } = await supabase
      .from("research")
      .update({
        views: viewsValue,
        likes: likesValue,
        followers: followersValue,
        virality_level: viralityLevel,
        updated_at: new Date().toISOString(),
      })
      .eq("id", research.id)

    setIsSubmitting(false)

    if (!updateError && !trendsError) {
      setOpen(false)
      onMetricsUpdated()
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <TrendingUp className="size-4" />
          Update Metrics
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl bg-white py-6">
        <DialogHeader>
          <DialogTitle>Update Performance Metrics</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="views">Views</Label>
                <div className="flex gap-2">
                  <Input
                    id="views"
                    type="number"
                    step={viewsMultiplier === "M" ? "0.1" : "1"}
                    value={views}
                    onChange={(e) => setViews(e.target.value)}
                    placeholder="1.5"
                    required
                    className="flex-[2]"
                  />
                  <Select value={viewsMultiplier} onValueChange={setViewsMultiplier}>
                    <SelectTrigger className="flex-[1]">
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
                <Label htmlFor="likes">Likes</Label>
                <div className="flex gap-2">
                  <Input
                    id="likes"
                    type="number"
                    step={likesMultiplier === "M" ? "0.1" : "1"}
                    value={likes}
                    onChange={(e) => setLikes(e.target.value)}
                    placeholder="50"
                    required
                    className="flex-[2]"
                  />
                  <Select value={likesMultiplier} onValueChange={setLikesMultiplier}>
                    <SelectTrigger className="flex-[1]">
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
                <Label htmlFor="followers">Followers</Label>
                <div className="flex gap-2">
                  <Input
                    id="followers"
                    type="number"
                    step={followersMultiplier === "M" ? "0.1" : "1"}
                    value={followers}
                    onChange={(e) => setFollowers(e.target.value)}
                    placeholder="100"
                    required
                    className="flex-[2]"
                  />
                  <Select value={followersMultiplier} onValueChange={setFollowersMultiplier}>
                    <SelectTrigger className="flex-[1]">
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

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-accent hover:bg-accent/90" disabled={isSubmitting}>
                {isSubmitting ? "Updating..." : "Update Metrics"}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
