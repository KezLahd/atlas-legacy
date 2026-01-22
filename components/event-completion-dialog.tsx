"use client"

import { Input } from "@/components/ui/input"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { CalendarEvent } from "@/lib/types/database"
import { createClient } from "@/lib/supabase/client"
import { Calendar, Clock } from "lucide-react"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Time picker arrays matching create event dialog
const hours12 = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, "0"))
const minutes15 = ["00", "15", "30", "45"]

interface PendingEvent extends CalendarEvent {
  event_completion_tracking: Array<{
    id: string
    status: string
  }>
}

const categoryColors: Record<string, { bg: string, text: string }> = {
  filming: { bg: 'bg-pink-100', text: 'text-pink-800' },
  editing: { bg: 'bg-blue-100', text: 'text-blue-800' },
  posting: { bg: 'bg-green-100', text: 'text-green-800' },
  review: { bg: 'bg-orange-100', text: 'text-orange-800' }
}

export function EventCompletionDialog() {
  const [pendingEvents, setPendingEvents] = useState<PendingEvent[]>([])
  const [currentEventIndex, setCurrentEventIndex] = useState(0)
  const [open, setOpen] = useState(false)
  const [isRescheduling, setIsRescheduling] = useState(false)
  const [rescheduleDate, setRescheduleDate] = useState<Date | undefined>()
  const [rescheduleStartHour, setRescheduleStartHour] = useState("")
  const [rescheduleStartMinute, setRescheduleStartMinute] = useState("")
  const [rescheduleStartPeriod, setRescheduleStartPeriod] = useState("AM")
  const [rescheduleEndHour, setRescheduleEndHour] = useState("")
  const [rescheduleEndMinute, setRescheduleEndMinute] = useState("")
  const [rescheduleEndPeriod, setRescheduleEndPeriod] = useState("PM")
  const pathname = usePathname()
  const supabase = createClient()

  // Reload pending events on every page navigation or mount
  useEffect(() => {
    loadPendingEvents()
  }, [pathname])

  // Also check periodically in case user stays on same page
  useEffect(() => {
    const interval = setInterval(() => {
      loadPendingEvents()
    }, 60000) // Check every minute

    return () => clearInterval(interval)
  }, [])

  const loadPendingEvents = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Get events that have passed and need completion confirmation
    const { data: events, error } = await supabase
      .from("calendar_events")
      .select(`
        *,
        event_completion_tracking!inner(id, status, dismissed_at),
        event_team_members!inner(user_id)
      `)
      .eq("event_team_members.user_id", user.id)
      .eq("event_completion_tracking.status", "pending")
      .is("event_completion_tracking.dismissed_at", null)
      .in("category", ["filming", "editing", "posting", "review"])
      .lt("end_time", new Date().toISOString())
      .order("end_time", { ascending: false })

    if (error) {
      console.error("[v0] Error loading pending events:", error)
      return
    }

    if (events && events.length > 0) {
      setPendingEvents(events as PendingEvent[])
      setOpen(true)
    }
  }

  const handleReschedule = () => {
    const event = pendingEvents[currentEventIndex]
    const startDate = new Date(event.start_time)
    const endDate = new Date(event.end_time)
    
    // Pre-populate reschedule fields with current event data
    setRescheduleDate(startDate)
    setRescheduleStartHour((startDate.getHours() % 12 || 12).toString().padStart(2, "0"))
    setRescheduleStartMinute(startDate.getMinutes().toString().padStart(2, "0"))
    setRescheduleStartPeriod(startDate.getHours() >= 12 ? "PM" : "AM")
    setRescheduleEndHour((endDate.getHours() % 12 || 12).toString().padStart(2, "0"))
    setRescheduleEndMinute(endDate.getMinutes().toString().padStart(2, "0"))
    setRescheduleEndPeriod(endDate.getHours() >= 12 ? "PM" : "AM")
    setIsRescheduling(true)
  }

  const handleSaveReschedule = async () => {
    const event = pendingEvents[currentEventIndex]
    if (!event || !rescheduleDate) return

    // Convert times to 24-hour format
    let startHour24 = Number.parseInt(rescheduleStartHour)
    if (rescheduleStartPeriod === "PM" && startHour24 !== 12) startHour24 += 12
    if (rescheduleStartPeriod === "AM" && startHour24 === 12) startHour24 = 0

    let endHour24 = Number.parseInt(rescheduleEndHour)
    if (rescheduleEndPeriod === "PM" && endHour24 !== 12) endHour24 += 12
    if (rescheduleEndPeriod === "AM" && endHour24 === 12) endHour24 = 0

    // Create new datetime objects
    const newStartTime = new Date(rescheduleDate)
    newStartTime.setHours(startHour24, Number.parseInt(rescheduleStartMinute), 0, 0)

    const newEndTime = new Date(rescheduleDate)
    newEndTime.setHours(endHour24, Number.parseInt(rescheduleEndMinute), 0, 0)

    // Update the event with new times
    const { error: updateError } = await supabase
      .from("calendar_events")
      .update({
        start_time: newStartTime.toISOString(),
        end_time: newEndTime.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", event.id)

    if (updateError) {
      console.error("[v0] Error rescheduling event:", updateError)
      return
    }

    // Update tracking status to rescheduled
    const trackingId = event.event_completion_tracking[0]?.id
    if (trackingId) {
      await supabase
        .from("event_completion_tracking")
        .update({
          status: 'rescheduled',
          updated_at: new Date().toISOString()
        })
        .eq("id", trackingId)
    }

    // Reset reschedule mode and move to next event
    setIsRescheduling(false)
    if (currentEventIndex < pendingEvents.length - 1) {
      setCurrentEventIndex(currentEventIndex + 1)
    } else {
      setOpen(false)
      setPendingEvents([])
      setCurrentEventIndex(0)
    }
  }

  const handleCompletion = async () => {
    const event = pendingEvents[currentEventIndex]
    if (!event) return

    const trackingId = event.event_completion_tracking[0]?.id
    if (!trackingId) return

    // Update completion status
    const { error: updateError } = await supabase
      .from("event_completion_tracking")
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", trackingId)

    if (updateError) {
      console.error("[v0] Error updating completion status:", updateError)
      return
    }

    // If completed and has content_id, update content stage
    if (event.content_id && event.category) {
      const stageMapping: Record<string, string> = {
        filming: 'shot',
        editing: 'edited',
        review: 'approved',
        posting: 'posted'
      }

      const newStage = stageMapping[event.category]
      if (newStage) {
        await supabase
          .from("content")
          .update({ production_stage: newStage, updated_at: new Date().toISOString() })
          .eq("id", event.content_id)
      }
    }

    // Move to next event or close dialog
    if (currentEventIndex < pendingEvents.length - 1) {
      setCurrentEventIndex(currentEventIndex + 1)
    } else {
      setOpen(false)
      setPendingEvents([])
      setCurrentEventIndex(0)
    }
  }

  if (!open || pendingEvents.length === 0) return null

  const currentEvent = pendingEvents[currentEventIndex]
  if (!currentEvent) return null

  const eventStartDate = new Date(currentEvent.start_time)
  const eventEndDate = new Date(currentEvent.end_time)
  const categoryColor = categoryColors[currentEvent.category] || { bg: '', text: '' }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      // Prevent closing dialog by clicking outside or ESC
      // User must explicitly complete or reschedule
      if (!isOpen) return
      setOpen(isOpen)
    }}>
      <DialogContent className="sm:max-w-[500px] bg-white">
        <DialogHeader>
          <DialogTitle>Event Completion Confirmation</DialogTitle>
          <DialogDescription>
            Please confirm if this {currentEvent.category} event was completed.
            {pendingEvents.length > 1 && ` (${currentEventIndex + 1} of ${pendingEvents.length})`}
          </DialogDescription>
        </DialogHeader>

        {!isRescheduling ? (
          <>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">{currentEvent.title}</h3>
                {currentEvent.description && (
                  <p className="text-sm text-muted-foreground">{currentEvent.description}</p>
                )}
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="size-4" />
                  <span>{eventStartDate.toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="size-4" />
                  <span>
                    {eventStartDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - {eventEndDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              <div className={`rounded-lg border p-3 ${categoryColor.bg}`}>
                <p className="text-sm font-medium">
                  Category: <span className={`capitalize font-semibold ${categoryColor.text}`}>{currentEvent.category}</span>
                </p>
              </div>
            </div>

            <DialogFooter className="flex gap-2 sm:gap-2">
              <Button
                variant="outline"
                onClick={handleReschedule}
                className="flex-1 bg-transparent"
              >
                Need to Reschedule
              </Button>
              <Button
                onClick={handleCompletion}
                className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
              >
                Mark as Completed
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">{currentEvent.title}</h3>
                <p className="text-sm text-muted-foreground">Update the date and time for this event</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left bg-white">
                        <Calendar className="mr-2 size-4" />
                        {rescheduleDate ? rescheduleDate.toLocaleDateString() : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent mode="single" selected={rescheduleDate} onSelect={setRescheduleDate} />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Start Time</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal bg-white">
                          <Clock className="mr-2 h-4 w-4" />
                          {`${rescheduleStartHour}:${rescheduleStartMinute} ${rescheduleStartPeriod}`}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-4 bg-white" align="start">
                        <div className="flex gap-2 items-center">
                          <Select value={rescheduleStartHour} onValueChange={setRescheduleStartHour}>
                            <SelectTrigger className="w-[70px] bg-white">
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
                          <Select value={rescheduleStartMinute} onValueChange={setRescheduleStartMinute}>
                            <SelectTrigger className="w-[70px] bg-white">
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
                              variant={rescheduleStartPeriod === "AM" ? "default" : "outline"}
                              className="w-[50px]"
                              onClick={() => setRescheduleStartPeriod("AM")}
                            >
                              AM
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant={rescheduleStartPeriod === "PM" ? "default" : "outline"}
                              className="w-[50px]"
                              onClick={() => setRescheduleStartPeriod("PM")}
                            >
                              PM
                            </Button>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>End Time</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal bg-white">
                          <Clock className="mr-2 h-4 w-4" />
                          {`${rescheduleEndHour}:${rescheduleEndMinute} ${rescheduleEndPeriod}`}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-4 bg-white" align="start">
                        <div className="flex gap-2 items-center">
                          <Select value={rescheduleEndHour} onValueChange={setRescheduleEndHour}>
                            <SelectTrigger className="w-[70px] bg-white">
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
                          <Select value={rescheduleEndMinute} onValueChange={setRescheduleEndMinute}>
                            <SelectTrigger className="w-[70px] bg-white">
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
                              variant={rescheduleEndPeriod === "AM" ? "default" : "outline"}
                              className="w-[50px]"
                              onClick={() => setRescheduleEndPeriod("AM")}
                            >
                              AM
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant={rescheduleEndPeriod === "PM" ? "default" : "outline"}
                              className="w-[50px]"
                              onClick={() => setRescheduleEndPeriod("PM")}
                            >
                              PM
                            </Button>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="flex gap-2 sm:gap-2">
              <Button
                variant="outline"
                onClick={() => setIsRescheduling(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveReschedule}
                className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
              >
                Save Changes
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
