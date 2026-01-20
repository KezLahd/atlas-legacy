"use client"

import type React from "react"
import { Calendar, Clock } from "lucide-react"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus } from "lucide-react"
import type { Creator, Batch } from "@/lib/types/database"

interface CreateEventDialogProps {
  workspaceId: string
  creators: Creator[]
  batches?: Batch[]
  contentId?: string // Pre-selected content
  batchId?: string | null
  onEventCreated: () => void
  trigger?: React.ReactNode // Custom trigger button
  open?: boolean
  onOpenChange?: (open: boolean) => void
  initialDate?: Date // Added initialDate prop to pre-fill date picker
}

export function CreateEventDialog({
  workspaceId,
  creators,
  batches = [],
  contentId,
  batchId,
  onEventCreated,
  trigger,
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
  initialDate,
}: CreateEventDialogProps) {
  const supabase = createClient()
  const [internalOpen, setInternalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [userId, setUserId] = useState<string>("")
  const [error, setError] = useState<string>("")

  const open = externalOpen !== undefined ? externalOpen : internalOpen
  const setOpen = externalOnOpenChange || setInternalOpen

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("")
  const [location, setLocation] = useState("")
  const [date, setDate] = useState<Date | undefined>(initialDate) // Initialize date with initialDate prop if provided
  const [startHour, setStartHour] = useState("09")
  const [startMinute, setStartMinute] = useState("00")
  const [startPeriod, setStartPeriod] = useState("AM")
  const [endHour, setEndHour] = useState("10")
  const [endMinute, setEndMinute] = useState("00")
  const [endPeriod, setEndPeriod] = useState("AM")
  const [selectedContentId, setSelectedContentId] = useState(contentId || "none")
  const [selectedBatchId, setSelectedBatchId] = useState(batchId || "none")
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<string[]>([])

  const [teamMembers, setTeamMembers] = useState<WorkspaceMember[]>([])
  const [contentItems, setContentItems] = useState<ContentItem[]>([])
  const [concurrentEventCount, setConcurrentEventCount] = useState(0)
  const [concurrentEventError, setConcurrentEventError] = useState<string>("")

  useEffect(() => {
    if (contentId) setSelectedContentId(contentId)
  }, [contentId])

  useEffect(() => {
    if (batchId) setSelectedBatchId(batchId)
  }, [batchId])

  useEffect(() => {
    if (initialDate) {
      setDate(initialDate)
    }
  }, [initialDate, open])

  useEffect(() => {
    if (open) {
      loadData()
    }
  }, [open])

  const loadData = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      setUserId(user.id)
      setSelectedTeamMembers([user.id])
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

    // Query events that overlap with the selected time period
    const { data: existingEvents, error } = await supabase
      .from("calendar_events")
      .select("id, start_time, end_time")
      .eq("workspace_id", workspaceId)
      .gte("end_time", startDateTime.toISOString())
      .lte("start_time", endDateTime.toISOString())

    if (error) {
      console.error("[v0] Error checking concurrent events:", error)
      return
    }

    // Count events that actually overlap (more precise check)
    const overlappingEvents = (existingEvents || []).filter((event) => {
      const eventStart = new Date(event.start_time)
      const eventEnd = new Date(event.end_time)
      return eventStart < endDateTime && eventEnd > startDateTime
    })

    setConcurrentEventCount(overlappingEvents.length)

    if (overlappingEvents.length >= 6) {
      setConcurrentEventError(
        `Maximum of 6 concurrent events reached for this time slot (${overlappingEvents.length} existing)`,
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
      setError("Start time must be before end time")
      return
    }

    if (concurrentEventCount >= 6) {
      setError("Cannot create event: Maximum of 6 concurrent events at this time")
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

      const { data: newEvent, error: eventError } = await supabase
        .from("calendar_events")
        .insert({
          workspace_id: workspaceId,
          content_id: selectedContentId && selectedContentId !== "none" ? selectedContentId : null,
          batch_id: selectedBatchId && selectedBatchId !== "none" ? selectedBatchId : null,
          title,
          description: description || null,
          category,
          location: location || null,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          assigned_to: selectedTeamMembers.length > 0 ? selectedTeamMembers[0] : null,
          created_by: userId,
        })
        .select()
        .single()

      if (eventError) throw eventError

      await supabase.from("event_audit_log").insert({
        event_id: newEvent.id,
        workspace_id: workspaceId,
        user_id: userId,
        action: "created",
        new_values: {
          title,
          description,
          category,
          location,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          content_id: selectedContentId && selectedContentId !== "none" ? selectedContentId : null,
          batch_id: selectedBatchId && selectedBatchId !== "none" ? selectedBatchId : null,
          team_members: selectedTeamMembers,
        },
      })

      if (selectedTeamMembers.length > 0) {
        const { error: membersError } = await supabase.from("event_team_members").insert(
          selectedTeamMembers.map((memberId) => ({
            event_id: newEvent.id,
            user_id: memberId,
          })),
        )

        if (membersError) throw membersError
      }

      // Removed calendarCache.clear(workspaceId)

      resetForm()
      setOpen(false)
      onEventCreated()
    } catch (error: any) {
      setError(error.message || "Failed to create event")
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setTitle("")
    setDescription("")
    setCategory("")
    setLocation("")
    setDate(undefined)
    setStartHour("09")
    setStartMinute("00")
    setStartPeriod("AM")
    setEndHour("10")
    setEndMinute("00")
    setEndPeriod("AM")
    setSelectedContentId(contentId || "none")
    setSelectedBatchId(batchId || "none")
    setSelectedTeamMembers([])
    setError("")
    setConcurrentEventError("") // Reset concurrent event error
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
    title && date && category && selectedTeamMembers.length > 0 && validateTimes() && concurrentEventCount < 6

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button>
            <Plus className="size-4 mr-2" />
            Create Event
          </Button>
        </DialogTrigger>
      )}
      <DialogContent
        className="bg-white max-w-2xl max-h-[90vh] overflow-y-auto"
        aria-describedby="event-dialog-description"
      >
        <DialogHeader>
          <DialogTitle>Create Calendar Event</DialogTitle>
          <p id="event-dialog-description" className="sr-only">
            Fill in the details to create a new calendar event
          </p>
        </DialogHeader>

        <div className="space-y-4">
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
                  <CalendarComponent
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    weekStartsOn={1} // Added weekStartsOn prop to start calendar week on Monday
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  />
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
            <Input placeholder="Studio, Remote, etc." value={location} onChange={(e) => setLocation(e.target.value)} />
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

          <Button
            onClick={handleSubmit}
            disabled={isLoading || !isFormValid}
            className="w-full bg-[#89cff0] hover:bg-[#6bb8d9] text-accent-foreground disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Creating..." : "Create Event"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
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
