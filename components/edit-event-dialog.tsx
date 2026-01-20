"use client"
import { Calendar, Clock, Trash2 } from "lucide-react"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
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
import type { Creator, Batch, CalendarEvent } from "@/lib/types/database"
import { updateEventTeamMembers } from "@/app/actions/calendar"
import { deleteEvent } from "@/app/actions/calendar" // Import the deleteEvent function

interface EditEventDialogProps {
  event: CalendarEvent
  workspaceId: string
  creators: Creator[]
  batches?: Batch[]
  onEventUpdated: () => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

interface WorkspaceMember {
  id: string
  user_id: string
  user_profiles: {
    first_name: string
    last_name: string
  }
  role: string
}

interface ContentItem {
  id: string
  hook: string
  batch_id: string | null
}

export function EditEventDialog({
  event,
  workspaceId,
  creators,
  batches = [],
  onEventUpdated,
  open,
  onOpenChange,
}: EditEventDialogProps) {
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(false)
  const [userId, setUserId] = useState<string>("")
  const [error, setError] = useState<string>("")
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const [title, setTitle] = useState(event.title)
  const [description, setDescription] = useState(event.description || "")
  const [category, setCategory] = useState(event.category || "")
  const [location, setLocation] = useState(event.location || "")
  const [date, setDate] = useState<Date | undefined>(new Date(event.start_time))

  // Parse existing times
  const startDate = new Date(event.start_time)
  const endDate = new Date(event.end_time)
  const [startHour, setStartHour] = useState((startDate.getHours() % 12 || 12).toString().padStart(2, "0"))
  const [startMinute, setStartMinute] = useState(startDate.getMinutes().toString().padStart(2, "0"))
  const [startPeriod, setStartPeriod] = useState(startDate.getHours() >= 12 ? "PM" : "AM")
  const [endHour, setEndHour] = useState((endDate.getHours() % 12 || 12).toString().padStart(2, "0"))
  const [endMinute, setEndMinute] = useState(endDate.getMinutes().toString().padStart(2, "0"))
  const [endPeriod, setEndPeriod] = useState(endDate.getHours() >= 12 ? "PM" : "AM")

  const [selectedContentId, setSelectedContentId] = useState(event.content_id || "none")
  const [selectedBatchId, setSelectedBatchId] = useState(event.batch_id || "none")
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<string[]>([])

  const [teamMembers, setTeamMembers] = useState<WorkspaceMember[]>([])
  const [contentItems, setContentItems] = useState<ContentItem[]>([])
  const [concurrentEventCount, setConcurrentEventCount] = useState(0)
  const [concurrentEventError, setConcurrentEventError] = useState<string>("")

  useEffect(() => {
    setTitle(event.title)
    setDescription(event.description || "")
    setCategory(event.category || "")
    setLocation(event.location || "")
    setDate(new Date(event.start_time))

    const newStartDate = new Date(event.start_time)
    const newEndDate = new Date(event.end_time)
    setStartHour((newStartDate.getHours() % 12 || 12).toString().padStart(2, "0"))
    setStartMinute(newStartDate.getMinutes().toString().padStart(2, "0"))
    setStartPeriod(newStartDate.getHours() >= 12 ? "PM" : "AM")
    setEndHour((newEndDate.getHours() % 12 || 12).toString().padStart(2, "0"))
    setEndMinute(newEndDate.getMinutes().toString().padStart(2, "0"))
    setEndPeriod(newEndDate.getHours() >= 12 ? "PM" : "AM")

    setSelectedContentId(event.content_id || "none")
    setSelectedBatchId(event.batch_id || "none")
    setError("")
  }, [event])

  useEffect(() => {
    if (open) {
      loadData()
    }
  }, [open])

  const loadData = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) setUserId(user.id)

    console.log("[v0] Loading team members for event:", event.id)
    const { data: eventMembers, error: membersError } = await supabase
      .from("event_team_members")
      .select("user_id")
      .eq("event_id", event.id)

    if (membersError) {
      console.error("[v0] Error loading event team members:", membersError)
    } else if (eventMembers) {
      console.log("[v0] Loaded team members:", eventMembers)
      setSelectedTeamMembers(eventMembers.map((m) => m.user_id))
    }

    const { data: members } = await supabase
      .from("workspace_members")
      .select("id, user_id, role, user_profiles(first_name, last_name)")
      .eq("workspace_id", workspaceId)

    if (members) setTeamMembers(members as any)

    const { data: content } = await supabase
      .from("content")
      .select("id, hook, batch_id")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })

    if (content) setContentItems(content)
  }

  const checkConcurrentEvents = async () => {
    if (!date) {
      setConcurrentEventCount(0)
      setConcurrentEventError("")
      return
    }

    const convert12To24 = (hour: string, period: string) => {
      let h = Number.parseInt(hour)
      if (period === "PM" && h !== 12) h += 12
      if (period === "AM" && h === 12) h = 0
      return h
    }

    const startHour24 = convert12To24(startHour, startPeriod)
    const endHour24 = convert12To24(endHour, endPeriod)

    const startDateTime = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      startHour24,
      Number.parseInt(startMinute),
    )
    const endDateTime = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      endHour24,
      Number.parseInt(endMinute),
    )

    // Query events that overlap with the selected time period, excluding the current event
    const { data: existingEvents, error } = await supabase
      .from("calendar_events")
      .select("id, start_time, end_time")
      .eq("workspace_id", workspaceId)
      .neq("id", event.id) // Exclude current event being edited
      .gte("end_time", startDateTime.toISOString())
      .lte("start_time", endDateTime.toISOString())

    if (error) {
      console.error("[v0] Error checking concurrent events:", error)
      return
    }

    // Count events that actually overlap (more precise check)
    const overlappingEvents = (existingEvents || []).filter((evt) => {
      const eventStart = new Date(evt.start_time)
      const eventEnd = new Date(evt.end_time)
      return eventStart < endDateTime && eventEnd > startDateTime
    })

    // Calculate maximum concurrent events at any 15-minute interval
    const intervals: { time: number; delta: number }[] = []

    // Add start (+1) and end (-1) for each overlapping event
    overlappingEvents.forEach((evt) => {
      intervals.push({ time: new Date(evt.start_time).getTime(), delta: 1 })
      intervals.push({ time: new Date(evt.end_time).getTime(), delta: -1 })
    })

    // Add the event being edited/created
    intervals.push({ time: startDateTime.getTime(), delta: 1 })
    intervals.push({ time: endDateTime.getTime(), delta: -1 })

    // Sort by time
    intervals.sort((a, b) => a.time - b.time)

    // Calculate maximum concurrent count
    let currentCount = 0
    let maxConcurrent = 0
    intervals.forEach((interval) => {
      currentCount += interval.delta
      maxConcurrent = Math.max(maxConcurrent, currentCount)
    })

    setConcurrentEventCount(maxConcurrent)

    if (maxConcurrent > 6) {
      setConcurrentEventError(
        `Maximum of 6 concurrent events reached. At peak time, there would be ${maxConcurrent} concurrent events.`,
      )
    } else {
      setConcurrentEventError("")
    }
  }

  useEffect(() => {
    if (date && open) {
      checkConcurrentEvents()
    }
  }, [date, startHour, startMinute, startPeriod, endHour, endMinute, endPeriod, open])

  const updateStartTime = (hour?: string, minute?: string, period?: string) => {
    const newHour = hour !== undefined ? hour : startHour
    const newMinute = minute !== undefined ? minute : startMinute
    const newPeriod = period !== undefined ? period : startPeriod

    if (hour !== undefined) setStartHour(hour)
    if (minute !== undefined) setStartMinute(minute)
    if (period !== undefined) setStartPeriod(period)

    // Calculate end time as start time + 1 hour
    const convert12To24 = (h: string, p: string) => {
      let hour24 = Number.parseInt(h)
      if (p === "PM" && hour24 !== 12) hour24 += 12
      if (p === "AM" && hour24 === 12) hour24 = 0
      return hour24
    }

    const startHour24 = convert12To24(newHour, newPeriod)
    const startMinutes = startHour24 * 60 + Number.parseInt(newMinute)
    const endMinutes = startMinutes + 60 // Add 1 hour

    const endHour24 = Math.floor(endMinutes / 60) % 24
    const endMin = endMinutes % 60

    const endHour12 = endHour24 % 12 || 12
    const endPer = endHour24 >= 12 ? "PM" : "AM"

    setEndHour(endHour12.toString().padStart(2, "0"))
    setEndMinute(endMin.toString().padStart(2, "0"))
    setEndPeriod(endPer)
  }

  const toggleTeamMember = (userId: string) => {
    setSelectedTeamMembers((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]))
  }

  const handleSubmit = async () => {
    setError("")

    if (!title || !date || !category || selectedTeamMembers.length === 0) {
      setError("Please fill in all required fields and assign at least one team member")
      return
    }

    const convert12To24 = (hour: string, period: string) => {
      let h = Number.parseInt(hour)
      if (period === "PM" && h !== 12) h += 12
      if (period === "AM" && h === 12) h = 0
      return h.toString().padStart(2, "0")
    }

    const startHour24 = convert12To24(startHour, startPeriod)
    const endHour24 = convert12To24(endHour, endPeriod)

    if (!validateTimes()) {
      setError("Start time must be at least 30 minutes before end time")
      return
    }

    if (concurrentEventCount > 6) {
      setError(`Cannot update event: Maximum of 6 concurrent events at this time (${concurrentEventCount} existing)`)
      return
    }

    setIsLoading(true)
    try {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, "0")
      const day = String(date.getDate()).padStart(2, "0")

      const startDateTime = new Date(
        year,
        date.getMonth(),
        date.getDate(),
        Number.parseInt(startHour24),
        Number.parseInt(startMinute),
      )
      const endDateTime = new Date(
        year,
        date.getMonth(),
        date.getDate(),
        Number.parseInt(endHour24),
        Number.parseInt(endMinute),
      )

      const changedFields: any = {}
      const oldValues: any = {}
      const newValues: any = {}

      if (title !== event.title) {
        changedFields.title = true
        oldValues.title = event.title
        newValues.title = title
      }
      if (description !== (event.description || "")) {
        changedFields.description = true
        oldValues.description = event.description
        newValues.description = description
      }
      if (category !== event.category) {
        changedFields.category = true
        oldValues.category = event.category
        newValues.category = category
      }
      if (location !== event.location) {
        changedFields.location = true
        oldValues.location = event.location
        newValues.location = location
      }
      if (selectedContentId !== (event.content_id || "none")) {
        changedFields.content_id = true
        oldValues.content_id = event.content_id
        newValues.content_id = selectedContentId
      }
      if (selectedBatchId !== (event.batch_id || "none")) {
        changedFields.batch_id = true
        oldValues.batch_id = event.batch_id
        newValues.batch_id = selectedBatchId
      }
      if (JSON.stringify(selectedTeamMembers) !== JSON.stringify(event.team_members)) {
        changedFields.team_members = true
        oldValues.team_members = event.team_members
        newValues.team_members = selectedTeamMembers
      }

      const { error: eventError } = await supabase
        .from("calendar_events")
        .update({
          content_id: selectedContentId && selectedContentId !== "none" ? selectedContentId : null,
          batch_id: selectedBatchId && selectedBatchId !== "none" ? selectedBatchId : null,
          title,
          description: description || null,
          category,
          location: location || null,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          assigned_to: selectedTeamMembers.length > 0 ? selectedTeamMembers[0] : null,
        })
        .eq("id", event.id)

      if (eventError) throw eventError

      await supabase.from("event_audit_log").insert({
        event_id: event.id,
        workspace_id: workspaceId,
        user_id: userId,
        action: "updated",
        changed_fields: changedFields,
        old_values: oldValues,
        new_values: newValues,
      })

      const result = await updateEventTeamMembers(event.id, selectedTeamMembers)

      if (!result.success) {
        throw new Error(result.error || "Failed to update team members")
      }

      // Removed calendarCache.clear()

      onOpenChange?.(false)
      onEventUpdated()
    } catch (error: any) {
      console.error("[v0] Error updating event:", error)
      setError(error.message || "Failed to update event")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    setIsLoading(true)
    try {
      const { error: deleteError } = await deleteEvent(event.id)
      if (deleteError) throw deleteError

      // Removed calendarCache.clear()

      onOpenChange?.(false)
      onEventUpdated()
    } catch (error: any) {
      console.error("[v0] Error deleting event:", error)
      setError(error.message || "Failed to delete event")
    } finally {
      setIsLoading(false)
    }
  }

  const hours12 = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, "0"))
  const minutes15 = ["00", "15", "30", "45"]

  const filteredContentItems =
    selectedBatchId && selectedBatchId !== "none"
      ? contentItems.filter((item: any) => item.batch_id === selectedBatchId)
      : contentItems

  const validateTimes = () => {
    const convert12To24 = (hour: string, period: string) => {
      let h = Number.parseInt(hour)
      if (period === "PM" && h !== 12) h += 12
      if (period === "AM" && h === 12) h = 0
      return h
    }

    const startHour24 = convert12To24(startHour, startPeriod)
    const endHour24 = convert12To24(endHour, endPeriod)
    const startMinutes = startHour24 * 60 + Number.parseInt(startMinute)
    const endMinutes = endHour24 * 60 + Number.parseInt(endMinute)

    // Ensure end time is at least 30 minutes after start time
    return endMinutes >= startMinutes + 30
  }

  const getEndTimeError = () => {
    const convert12To24 = (hour: string, period: string) => {
      let h = Number.parseInt(hour)
      if (period === "PM" && h !== 12) h += 12
      if (period === "AM" && h === 12) h = 0
      return h
    }

    const startHour24 = convert12To24(startHour, startPeriod)
    const endHour24 = convert12To24(endHour, endPeriod)
    const startMinutes = startHour24 * 60 + Number.parseInt(startMinute)
    const endMinutes = endHour24 * 60 + Number.parseInt(endMinute)
    const duration = endMinutes - startMinutes

    if (endMinutes <= startMinutes) {
      return "End time must be after start time"
    }
    if (duration < 30) {
      return "Event must be at least 30 minutes long"
    }
    return null
  }

  const isFormValid =
    title && date && category && selectedTeamMembers.length > 0 && validateTimes() && concurrentEventCount <= 6

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="bg-white max-w-2xl max-h-[90vh] overflow-y-auto"
          aria-describedby="edit-event-dialog-description"
        >
          <DialogHeader>
            <DialogTitle>Edit Calendar Event</DialogTitle>
            <p id="edit-event-dialog-description" className="sr-only">
              Edit the details of this calendar event
            </p>
          </DialogHeader>

          <div className="space-y-4">
            {/* Same form structure as CreateEventDialog but with pre-filled values */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Event Category *</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="filming">Filming</SelectItem>
                    <SelectItem value="editing">Editing</SelectItem>
                    <SelectItem value="review">Review</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="deadline">Deadline</SelectItem>
                    <SelectItem value="posting">Posting</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Event Title *</Label>
                <Input placeholder="e.g. Film Day 1 Content" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Additional notes or instructions"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Link to Batch (Optional)</Label>
                <Select value={selectedBatchId} onValueChange={setSelectedBatchId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select batch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No batch linked</SelectItem>
                    {batches.map((batch) => (
                      <SelectItem key={batch.id} value={batch.id}>
                        {batch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Link to Content (Optional)</Label>
                <Select value={selectedContentId} onValueChange={setSelectedContentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select content" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No content linked</SelectItem>
                    {filteredContentItems.map((content: any) => (
                      <SelectItem key={content.id} value={content.id}>
                        {content.hook || "Untitled"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal bg-transparent">
                      <Calendar className="mr-2 h-4 w-4" />
                      {date ? date.toLocaleDateString() : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-white" align="start">
                    <CalendarComponent mode="single" selected={date} onSelect={setDate} weekStartsOn={1} />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Start Time *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal bg-white">
                      <Clock className="mr-2 h-4 w-4" />
                      {`${startHour}:${startMinute} ${startPeriod}`}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-4 bg-white" align="start">
                    <div className="flex gap-2 items-center">
                      <Select value={startHour} onValueChange={(h) => updateStartTime(h, undefined, undefined)}>
                        <SelectTrigger className="w-[70px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          {hours12.map((h) => (
                            <SelectItem key={h} value={h}>
                              {h}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-lg font-semibold">:</span>
                      <Select value={startMinute} onValueChange={(m) => updateStartTime(undefined, m, undefined)}>
                        <SelectTrigger className="w-[70px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          {minutes15.map((m) => (
                            <SelectItem key={m} value={m}>
                              {m}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex gap-1 ml-2">
                        <Button
                          type="button"
                          size="sm"
                          variant={startPeriod === "AM" ? "default" : "outline"}
                          className="w-[50px]"
                          onClick={() => updateStartTime(undefined, undefined, "AM")}
                        >
                          AM
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={startPeriod === "PM" ? "default" : "outline"}
                          className="w-[50px]"
                          onClick={() => updateStartTime(undefined, undefined, "PM")}
                        >
                          PM
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>End Time *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal bg-white">
                      <Clock className="mr-2 h-4 w-4" />
                      {`${endHour}:${endMinute} ${endPeriod}`}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-4 bg-white" align="start">
                    <div className="flex gap-2 items-center">
                      <Select value={endHour} onValueChange={setEndHour}>
                        <SelectTrigger className="w-[70px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          {hours12.map((h) => (
                            <SelectItem key={h} value={h}>
                              {h}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-lg font-semibold">:</span>
                      <Select value={endMinute} onValueChange={setEndMinute}>
                        <SelectTrigger className="w-[70px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          {minutes15.map((m) => (
                            <SelectItem key={m} value={m}>
                              {m}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex gap-1 ml-2">
                        <Button
                          type="button"
                          size="sm"
                          variant={endPeriod === "AM" ? "default" : "outline"}
                          className="w-[50px]"
                          onClick={() => setEndPeriod("AM")}
                        >
                          AM
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={endPeriod === "PM" ? "default" : "outline"}
                          className="w-[50px]"
                          onClick={() => setEndPeriod("PM")}
                        >
                          PM
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
                {getEndTimeError() && <p className="text-sm text-red-600 mt-1">{getEndTimeError()}</p>}
                {concurrentEventError && <p className="text-sm text-red-600">{concurrentEventError}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Location</Label>
              <Input
                placeholder="Studio, Remote, etc."
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Assign Team Members</Label>
              <div className="border rounded-md p-3 max-h-[200px] overflow-y-auto space-y-2">
                {teamMembers.map((member) => (
                  <div key={member.user_id} className="flex items-center gap-2">
                    <Checkbox
                      id={member.user_id}
                      checked={selectedTeamMembers.includes(member.user_id)}
                      onCheckedChange={() => toggleTeamMember(member.user_id)}
                    />
                    <Label htmlFor={member.user_id} className="cursor-pointer flex-1 font-normal">
                      {member.user_profiles?.first_name} {member.user_profiles?.last_name}
                      <span className="text-xs text-muted-foreground ml-2">({member.role})</span>
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>}

            <div className="flex justify-between gap-4">
              <Button
                type="button"
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
                disabled={isLoading}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Event
              </Button>
              <Button
                type="button"
                className="bg-accent text-accent-foreground hover:bg-accent/90"
                onClick={handleSubmit}
                disabled={!isFormValid || isLoading}
              >
                Update Event
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this event? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isLoading}
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
