"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { AppNav } from "@/components/app-nav"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { EditEventDialog } from "@/components/edit-event-dialog"
import { UserAvatar } from "@/components/user-avatar"
import { CreateEventDialog } from "@/components/create-event-dialog"
import { CalendarMemberFilter } from "@/components/calendar-member-filter"
import type { CalendarEvent, Creator } from "@/lib/types/database"
import { cn } from "@/lib/utils"

interface EventWithDetails extends CalendarEvent {
  content: { hook: string } | null
  batch: { name: string } | null
  event_team_members: Array<{
    user_id: string
    user_profiles: {
      first_name: string
      last_name: string
      avatar_storage_path: string | null
      avatar_type: string
      avatar_bg_color: string
      avatar_text_color: string
    }
  }>
}

export default function DailyViewPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [userRole, setUserRole] = useState<string>("")
  const [workspaceId, setWorkspaceId] = useState<string>("")
  const [creators, setCreators] = useState<Creator[]>([])
  const [events, setEvents] = useState<EventWithDetails[]>([])
  const dateParam = searchParams.get("date")
  const [selectedDate, setSelectedDate] = useState<Date>(dateParam ? new Date(dateParam) : new Date())
  const [selectedEvent, setSelectedEvent] = useState<EventWithDetails | null>(null)
  const [showEditEventDialog, setShowEditEventDialog] = useState(false)
  const [editingEvent, setEditingEvent] = useState<EventWithDetails | null>(null)
  const [showCreateEventDialog, setShowCreateEventDialog] = useState(false)
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
  const canFilter = ["owner", "manager", "strategist"].includes(userRole)
  const now = new Date()
  const isToday =
    selectedDate.getDate() === now.getDate() &&
    selectedDate.getMonth() === now.getMonth() &&
    selectedDate.getFullYear() === now.getFullYear()

  const currentTimePosition = isToday ? (now.getHours() * 60 + now.getMinutes()) / 15 : null // Convert to 15-minute blocks

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (workspaceId && userRole) {
      loadEvents()
    }
  }, [workspaceId, selectedDate, userRole, creators, selectedMemberId])

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
      .select("workspace_id, role")
      .eq("user_id", authUser.id)
      .single()

    if (!membership) {
      router.push("/onboarding")
      return
    }

    setWorkspaceId(membership.workspace_id)
    setUserRole(membership.role)

    // Load creators
    const { data: creatorsData } = await supabase
      .from("creators")
      .select("*")
      .eq("workspace_id", membership.workspace_id)
      .order("name")

    if (creatorsData) setCreators(creatorsData)
    
    // Load team members if user can filter
    if (["owner", "manager", "strategist"].includes(membership.role)) {
      const { data: membersData } = await supabase
        .from("workspace_members")
        .select(`
          user_id,
          user_profiles!inner(
            id,
            first_name,
            last_name,
            email,
            avatar_storage_path,
            avatar_type,
            avatar_bg_color,
            avatar_text_color
          )
        `)
        .eq("workspace_id", membership.workspace_id)
      
      if (membersData) {
        const members = membersData
          .filter((m) => m.user_profiles)
          .map((m) => ({
            id: m.user_profiles.id,
            first_name: m.user_profiles.first_name,
            last_name: m.user_profiles.last_name,
            email: m.user_profiles.email,
            avatar_storage_path: m.user_profiles.avatar_storage_path,
            avatar_type: m.user_profiles.avatar_type,
            avatar_bg_color: m.user_profiles.avatar_bg_color,
            avatar_text_color: m.user_profiles.avatar_text_color,
          }))
        setTeamMembers(members)
      }
    }
  }

  const loadEvents = async () => {
    const workspaceId = await getWorkspaceId()
    if (!workspaceId) return

    console.log("[v0] Loading events for workspace:", workspaceId)
    console.log("[v0] Selected date:", selectedDate.toISOString())

    const startOfDay = new Date(selectedDate)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(selectedDate)
    endOfDay.setHours(23, 59, 59, 999)

    const { data } = await supabase
      .from("calendar_events")
      .select(
        `
        *,
        content(hook),
        batch:batches(name),
        event_team_members(user_id)
      `,
      )
      .eq("workspace_id", workspaceId)
      .gte("start_time", startOfDay.toISOString())
      .lte("start_time", endOfDay.toISOString())
      .order("start_time", { ascending: true })

    if (data) {
      // Apply role-based filtering
      let filteredEvents = data
      console.log("[v0] Loaded events for daily dashboard, role:", userRole, "count:", data.length)

      // Creators: only see events assigned to them, created by them, or where they are on the team
      if (userRole === "creator") {
        filteredEvents = data.filter((event: any) => {
          const isAssignedToCreator = event.assigned_to === user?.id
          const isCreatedByCreator = event.created_by === user?.id
          const isOnTeam = event.event_team_members?.some(
            (tm: { user_id: string }) => tm.user_id === user?.id,
          )
          return isAssignedToCreator || isCreatedByCreator || isOnTeam
        })
      }
      // Owner/manager/strategist: can filter by member, otherwise see all
      else if (selectedMemberId && ["owner", "manager", "strategist"].includes(userRole)) {
        filteredEvents = data.filter((event: any) => {
          const isAssignedToMember = event.assignee_id === selectedMemberId
          const isCreatedByMember = event.created_by === selectedMemberId
          const isOnTeam = event.event_team_members?.some(
            (tm: { user_id: string }) => tm.user_id === selectedMemberId,
          )
          return isAssignedToMember || isCreatedByMember || isOnTeam
        })
      }
      // Editors / viewers: see all (view-only)

      console.log("[v0] Daily filtered events for", userRole, ":", filteredEvents.length)

      const userIds = filteredEvents.flatMap(
        (event) => event.event_team_members?.map((tm: any) => tm.user_id) || [],
      )
      const uniqueUserIds = [...new Set(userIds)]

      const { data: profiles } = await supabase
        .from("user_profiles")
        .select("id, first_name, last_name, avatar_storage_path, avatar_type, avatar_bg_color, avatar_text_color")
        .in("id", uniqueUserIds)

      console.log("[v0] Fetched profiles:", profiles)

      const profileMap = new Map(profiles?.map((p) => [p.id, p]) || [])

      console.log("[v0] Profile map:", Object.fromEntries(profileMap))

      const eventsWithProfiles = filteredEvents.map((event) => ({
        ...event,
        event_team_members:
          event.event_team_members?.map((tm: any) => ({
            ...tm,
            user_profiles: profileMap.get(tm.user_id) || null,
          })) || [],
      }))

      setEvents(eventsWithProfiles as EventWithDetails[])
    }
  }

  const getWorkspaceId = async () => {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()
    if (!authUser) {
      router.push("/auth/login")
      return
    }

    const { data: membership } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", authUser.id)
      .single()

    if (!membership) {
      router.push("/onboarding")
      return
    }

    return membership.workspace_id
  }

  const categoryColors: Record<string, { bgClass: string; textClass: string; borderClass: string }> = {
    filming: { bgClass: "bg-pink-100", textClass: "text-pink-700", borderClass: "border-pink-200" },
    editing: { bgClass: "bg-blue-100", textClass: "text-blue-700", borderClass: "border-blue-200" },
    review: { bgClass: "bg-orange-100", textClass: "text-orange-700", borderClass: "border-orange-200" },
    meeting: { bgClass: "bg-purple-100", textClass: "text-purple-700", borderClass: "border-purple-200" },
    deadline: { bgClass: "bg-red-100", textClass: "text-red-700", borderClass: "border-red-200" },
    posting: { bgClass: "bg-green-100", textClass: "text-green-700", borderClass: "border-green-200" },
  }

  const getCategoryColors = (category: string) => {
    return (
      categoryColors[category] || {
        bgClass: "bg-purple-100",
        textClass: "text-purple-700",
        borderClass: "border-purple-200",
      }
    )
  }

  const getWeekStart = (date: Date) => {
    const day = date.getDay()
    const diff = date.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(date)
    monday.setDate(diff)
    return monday
  }

  const previousDay = () => {
    const newDate = new Date(selectedDate)
    newDate.setDate(selectedDate.getDate() - 1)
    setSelectedDate(newDate)
  }

  const nextDay = () => {
    const newDate = new Date(selectedDate)
    newDate.setDate(selectedDate.getDate() + 1)
    setSelectedDate(newDate)
  }

  const generateTimeSlots = () => {
    const slots = []
    for (let hour = 0; hour < 24; hour++) {
      slots.push({
        hour,
        minute: 0,
        label: new Date(2000, 0, 1, hour, 0).toLocaleTimeString("en-US", {
          hour: "numeric",
          hour12: true,
        }),
      })
    }
    return slots
  }

  const getEventStyle = (event: EventWithDetails) => {
    const startTime = new Date(event.start_time)
    const endTime = new Date(event.end_time)

    const startHour = startTime.getHours()
    const startMinutes = startTime.getMinutes()
    const endHour = endTime.getHours()
    const endMinutes = endTime.getMinutes()

    const startPosition = (startHour * 60 + startMinutes) / 15 // Convert to 15-minute blocks
    const endPosition = (endHour * 60 + endMinutes) / 15
    const durationInBlocks = Math.max(endPosition - startPosition, 2) // Minimum 2 blocks (30 minutes)

    return {
      top: `${startPosition}rem`, // 1rem per 15-minute block
      height: `${durationInBlocks}rem`, // 2rem for 30 mins, 4rem for 1 hour, 5rem for 75 mins
    }
  }

  const getEventsWithColumns = () => {
    const sortedEvents = [...events].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())

    const eventsWithColumns: Array<EventWithDetails & { column: number; columnWidth: number; leftOffset: number }> = []

    for (const event of sortedEvents) {
      const eventStart = new Date(event.start_time).getTime()
      const eventEnd = new Date(event.end_time).getTime()

      // Find all events that overlap with this event
      const overlappingEvents = eventsWithColumns.filter((existing) => {
        const existingStart = new Date(existing.start_time).getTime()
        const existingEnd = new Date(existing.end_time).getTime()
        return existingStart < eventEnd && existingEnd > eventStart
      })

      // Find first available column
      const occupiedColumns = new Set(overlappingEvents.map((e) => e.column))
      let assignedColumn = 0
      while (occupiedColumns.has(assignedColumn) && assignedColumn < 6) {
        assignedColumn++
      }

      if (assignedColumn >= 6) {
        console.warn(`[v0] Event ${event.id} exceeds 6 column limit`)
        continue
      }

      // Add event with temporary width/offset (will be recalculated)
      eventsWithColumns.push({
        ...event,
        column: assignedColumn,
        columnWidth: 0, // Placeholder
        leftOffset: 0, // Placeholder
      })
    }

    // Now recalculate widths and offsets for all events based on their actual overlaps
    for (let i = 0; i < eventsWithColumns.length; i++) {
      const event = eventsWithColumns[i]
      const eventStart = new Date(event.start_time).getTime()
      const eventEnd = new Date(event.end_time).getTime()

      // Find all events that overlap with this event
      const overlappingEvents = eventsWithColumns.filter((existing) => {
        const existingStart = new Date(existing.start_time).getTime()
        const existingEnd = new Date(existing.end_time).getTime()
        return existingStart < eventEnd && existingEnd > eventStart
      })

      // Total concurrent is all overlapping events including this one
      const totalConcurrent = overlappingEvents.length

      // Each event gets equal width
      const columnWidth = 100 / totalConcurrent

      // Calculate left offset based on column number
      const leftOffset = event.column * columnWidth

      // Update event with correct width and offset
      eventsWithColumns[i] = {
        ...event,
        columnWidth,
        leftOffset,
      }
    }

    return eventsWithColumns
  }

  const eventsWithColumns = getEventsWithColumns()

  const timeSlots = generateTimeSlots()

  useEffect(() => {
    const container = document.getElementById("timeline-container")
    if (container) {
      const scrollPosition = 9 * 4 * 16
      container.scrollTop = scrollPosition
    }
  }, [])

  const handleEventClick = (event: EventWithDetails) => {
    setEditingEvent(event)
    setShowEditEventDialog(true)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppNav userEmail={user?.email} />

      <main className="container mx-auto p-6 space-y-6 flex-1">
        <div className="flex flex-col gap-3">
          {/* Desktop: Back button separate */}
          <div className="hidden sm:flex items-center gap-4">
            <Button
              variant="default"
              size="sm"
              onClick={() => router.push(`/dashboard/weekly?date=${selectedDate.toISOString()}`)}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <ArrowLeft className="size-4 mr-2" />
              Back to Week View
            </Button>
          </div>

          {/* Title and navigation row */}
          <div className="flex items-center justify-between w-full gap-2">
            {/* Mobile: Back button on left */}
            <Button
              variant="default"
              size="sm"
              onClick={() => router.push(`/dashboard/weekly?date=${selectedDate.toISOString()}`)}
              className="sm:hidden bg-primary text-primary-foreground hover:bg-primary/90 px-2 flex-shrink-0"
            >
              <ArrowLeft className="size-4" />
            </Button>

            <Button variant="outline" size="sm" onClick={previousDay} className="px-2 bg-transparent flex-shrink-0">
              <ChevronLeft className="size-4" />
            </Button>
            
            <h1 className="text-base sm:text-lg md:text-3xl font-bold text-center flex-1">
              {isToday
                ? "Today"
                : selectedDate.toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
            </h1>
            
            <Button variant="outline" size="sm" onClick={nextDay} className="px-2 bg-transparent flex-shrink-0">
              <ChevronRight className="size-4" />
            </Button>
          </div>

          {/* Filter and create button row */}
          <div className="flex items-center gap-2 w-full sm:w-auto sm:self-end">
            {canFilter && teamMembers.length > 0 && (
              <CalendarMemberFilter
                members={teamMembers}
                selectedMemberId={selectedMemberId}
                onMemberChange={setSelectedMemberId}
              />
            )}
            <Button
              className="bg-accent text-accent-foreground hover:bg-accent/80 transition-colors flex-1 sm:flex-none"
              onClick={() => setShowCreateEventDialog(true)}
            >
              <Plus className="size-4 mr-2" />
              <span className="hidden sm:inline">Create</span>
              <span className="sm:hidden">New</span>
            </Button>
          </div>
        </div>

        <div className="relative">
          <div className="h-[600px] overflow-y-auto border rounded-lg bg-white" id="timeline-container">
            <div className="relative" style={{ height: `${24 * 4}rem` }}>
              {timeSlots.map((slot) => {
                const slotIsPast = isToday && now.getHours() > slot.hour
                return (
                  <div key={slot.hour} className="relative">
                    <div
                      className={`absolute w-full border-b border-gray-300 ${slotIsPast ? "opacity-50" : ""}`}
                      style={{ top: `${slot.hour * 4}rem`, height: "4rem" }}
                    >
                      <div className="flex h-full">
                        <div className="w-20 flex-shrink-0 text-sm text-muted-foreground pt-1 px-2 bg-gray-50">
                          {slot.label}
                        </div>
                        <div className="flex-1 relative">
                          <div className="absolute top-8 left-0 right-0 border-t border-gray-200" />
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}

              {currentTimePosition !== null && (
                <div
                  className="absolute left-20 right-0 flex items-center z-20"
                  style={{ top: `${currentTimePosition}rem` }}
                >
                  <div className="size-3 rounded-full bg-accent flex-shrink-0 -ml-1.5" />
                  <div className="h-0.5 bg-accent flex-1" />
                </div>
              )}

              <div className="absolute left-20 right-0 top-0 bottom-0">
                {eventsWithColumns.map((event) => {
                  const style = getEventStyle(event)
                  const isPast = new Date(event.end_time) < now
                  const durationMinutes =
                    (new Date(event.end_time).getTime() - new Date(event.start_time).getTime()) / (1000 * 60)
                  const isShortEvent = durationMinutes < 45
                  const categoryColors = getCategoryColors(event.category as string)

                  return (
                    <div
                      key={event.id}
                      onClick={() => handleEventClick(event)}
                      className={cn(
                        "absolute rounded-lg p-2 cursor-pointer transition-all",
                        "hover:ring-2 hover:ring-accent/50 hover:z-10",
                        categoryColors.bgClass,
                        categoryColors.borderClass,
                        categoryColors.textClass,
                        isPast && "opacity-50 line-through",
                      )}
                      style={{
                        top: style.top,
                        height: style.height,
                        left: `${event.leftOffset}%`,
                        width: `calc(${event.columnWidth}% - 4px)`,
                        zIndex: 10,
                      }}
                    >
                      {(() => {
                        const startTime = new Date(event.start_time)
                        const endTime = new Date(event.end_time)
                        const durationMinutes = (endTime.getTime() - startTime.getTime()) / 1000 / 60

                        if (durationMinutes < 45) {
                          return (
                            <div className="flex items-center justify-between gap-1 h-full">
                              <div className="truncate text-xs font-medium flex-1">
                                <span className="font-semibold">{event.title}</span>
                                {event.description && <span>: {event.description}</span>}
                              </div>
                              <span className={`text-[10px] px-1 py-0.5 rounded ${categoryColors.bgClass}`}>
                                {event.category}
                              </span>
                            </div>
                          )
                        }

                        return (
                          <div className="flex flex-col h-full relative">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold truncate">{event.title}</p>
                              </div>
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap ${categoryColors.bgClass}`}
                              >
                                {event.category}
                              </span>
                            </div>

                            <div className="mt-auto flex items-end justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                {event.description && (
                                  <p className="text-xs text-gray-600 truncate">{event.description}</p>
                                )}
                              </div>
                              {event.event_team_members && event.event_team_members.length > 0 && (
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <div className="flex -space-x-1">
                                    {event.event_team_members.slice(0, 3).map((member: any) => {
                                      return (
                                        <UserAvatar
                                          key={member.user_id}
                                          profile={{
                                            id: member.user_profiles?.id || member.user_id,
                                            first_name: member.user_profiles?.first_name || "",
                                            last_name: member.user_profiles?.last_name || "",
                                            avatar_storage_path: member.user_profiles?.avatar_storage_path || null,
                                            avatar_type: member.user_profiles?.avatar_type || "initials",
                                            avatar_bg_color: member.user_profiles?.avatar_bg_color,
                                            avatar_text_color: member.user_profiles?.avatar_text_color,
                                          }}
                                          size="sm"
                                        />
                                      )
                                    })}
                                  </div>
                                  {event.event_team_members.length > 3 && (
                                    <span className="text-[10px] text-gray-600">
                                      +{event.event_team_members.length - 3}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </main>

      {showCreateEventDialog && workspaceId && creators && (
        <CreateEventDialog
          workspaceId={workspaceId}
          creators={creators}
          batches={[]}
          onEventCreated={() => {
            loadEvents()
            setShowCreateEventDialog(false)
          }}
          open={showCreateEventDialog}
          onOpenChange={setShowCreateEventDialog}
          initialDate={selectedDate}
        />
      )}

      {showEditEventDialog && editingEvent && (
        <EditEventDialog
          event={editingEvent}
          workspaceId={workspaceId}
          creators={creators}
          onEventUpdated={() => {
            setShowEditEventDialog(false)
            loadEvents()
          }}
          onEventDeleted={() => {
            setShowEditEventDialog(false)
            loadEvents()
          }}
          open={showEditEventDialog}
          onOpenChange={setShowEditEventDialog}
        />
      )}

      <Footer />
    </div>
  )
}
