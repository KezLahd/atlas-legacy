"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus, X } from "lucide-react"
import type { Creator } from "@/lib/types/database"

interface CreateEventDialogProps {
  workspaceId: string
  creators: Creator[]
  onEventCreated: () => void
}

export function CreateEventDialog({ workspaceId, creators, onEventCreated }: CreateEventDialogProps) {
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [userId, setUserId] = useState<string>("")

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [invitees, setInvitees] = useState<string[]>([])
  const [newInvitee, setNewInvitee] = useState("")

  useEffect(() => {
    loadUser()
  }, [])

  const loadUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) setUserId(user.id)
  }

  const addInvitee = () => {
    if (newInvitee.trim() && !invitees.includes(newInvitee.trim())) {
      setInvitees([...invitees, newInvitee.trim()])
      setNewInvitee("")
    }
  }

  const removeInvitee = (email: string) => {
    setInvitees(invitees.filter((e) => e !== email))
  }

  const handleSubmit = async () => {
    if (!title.trim() || !startTime || !endTime) {
      alert("Please fill in all required fields")
      return
    }

    setIsLoading(true)
    try {
      // Create event
      const { data: newEvent, error: eventError } = await supabase
        .from("calendar_events")
        .insert({
          workspace_id: workspaceId,
          title,
          description: description || null,
          start_time: startTime,
          end_time: endTime,
          created_by: userId,
        })
        .select()
        .single()

      if (eventError) throw eventError

      // Add invitees
      for (const email of invitees) {
        await supabase.from("calendar_invitees").insert({
          event_id: newEvent.id,
          email,
        })
      }

      resetForm()
      setOpen(false)
      onEventCreated()
    } catch (error: any) {
      alert(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setTitle("")
    setDescription("")
    setStartTime("")
    setEndTime("")
    setInvitees([])
    setNewInvitee("")
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4 mr-2" />
          Create Event
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Calendar Event</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Title *</Label>
            <Input placeholder="Production Day" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              placeholder="What's this event about?"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Time *</Label>
              <Input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>End Time *</Label>
              <Input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Invitees</Label>
            <div className="flex gap-2">
              <Input
                placeholder="email@example.com"
                value={newInvitee}
                onChange={(e) => setNewInvitee(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    addInvitee()
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={addInvitee}>
                Add
              </Button>
            </div>
            {invitees.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {invitees.map((email) => (
                  <div key={email} className="flex items-center gap-1 px-2 py-1 bg-secondary rounded text-sm">
                    {email}
                    <button type="button" onClick={() => removeInvitee(email)} className="ml-1">
                      <X className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button onClick={handleSubmit} disabled={isLoading} className="w-full">
            {isLoading ? "Creating..." : "Create Event"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
