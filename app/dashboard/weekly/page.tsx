"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { AppNav } from "@/components/app-nav"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ChevronLeft, ChevronRight, Calendar, Clock, Plus } from "lucide-react"
import { CreateEventDialog } from "@/components/create-event-dialog"
import type { CalendarEvent, Creator, Batch } from "@/lib/types/database"
import { HoverCard, HoverCardTrigger } from "@/components/ui/hover-card"
import { Card, CardContent } from "@/components/ui/card"

interface EventWithDetails extends CalendarEvent {
  content: { hook: string } | null
  batch: { name: string } | null
  event_team_members: Array<{ user_id: string; user_profiles: { first_name: string; last_name: string } }>
  category?: string
  location?: string
}

export default function WeeklyViewPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [userRole, setUserRole] = useState<string>("")
  const [workspaceId, setWorkspaceId] = useState<string>("")
  const [events, setEvents] = useState<EventWithDetails[]>([])
  const [creators, setCreators] = useState<Creator[]>([])
  const [batches, setBatches] = useState<Batch[]>([])
  const [weekStart, setWeekStart] = useState<Date>(() => {
    const dateParam = searchParams.get("date")
    if (dateParam) {
      const date = new Date(dateParam)
      const day = date.getDay()
      const diff = date.getDate() - day + (day === 0 ? -6 : 1)
      const monday = new Date(date)
      monday.setDate(diff)
      return monday
    }
    return new Date()
  })
  const [editingEvent, setEditingEvent] = useState<EventWithDetails | null>(null)
  const [showEditEventDialog, setShowEditEventDialog] = useState<boolean>(false)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (workspaceId && userRole) {
      loadEvents()
    }
  }, [workspaceId, weekStart, userRole, creators])

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

    // Load creators and batches
    const [creatorsRes, batchesRes] = await Promise.all([
      supabase
        .from("creators")
        .select("*")
        .eq("workspace_id", membership.workspace_id)
        .order("name"),
      supabase
        .from("batches")
        .select("*")
        .eq("workspace_id", membership.workspace_id)
        .order("created_at", { ascending: false }),
    ])

    if (creatorsRes.data) setCreators(creatorsRes.data)
    if (batchesRes.data) setBatches(batchesRes.data)
  }

  const loadEvents = async () => {
    const workspaceId = await getWorkspaceId()
    if (!workspaceId) return

    // Include all events from start of weekStart to end of the following Sunday
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 7) // Go to next Monday
    weekEnd.setHours(0, 0, 0, 0) // Start of next Monday
    weekEnd.setMilliseconds(-1) // End of Sunday

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
      .gte("start_time", weekStart.toISOString())
      .lte("start_time", weekEnd.toISOString())
      .order("start_time", { ascending: true })

    if (data) {
      // Apply role-based filtering
      let filteredEvents = data
      console.log("[v0] Loaded events for weekly dashboard, role:", userRole, "count:", data.length)

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
      // Editors / viewers: currently see all (view-only). Owner/manager/strategist: see all.

      console.log("[v0] Weekly filtered events for", userRole, ":", filteredEvents.length)

      const userIds = filteredEvents.flatMap(
        (event: any) => event.event_team_members?.map((tm: { user_id: string }) => tm.user_id) || [],
      )
      const uniqueUserIds = [...new Set(userIds)]

      const { data: profiles } = await supabase
        .from("user_profiles")
        .select("id, first_name, last_name")
        .in("id", uniqueUserIds)

      const profileMap = new Map(profiles?.map((p: { id: string; first_name: string; last_name: string }) => [p.id, p]) || [])

      const eventsWithProfiles = filteredEvents.map((event: any) => ({
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
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", user?.id)
      .single()

    return membership?.workspace_id
  }

  const isCurrentWeek = () => {
    const today = new Date()
    const currentWeekStart = new Date(today)
    const day = today.getDay()
    const diff = today.getDate() - day + (day === 0 ? -6 : 1)
    currentWeekStart.setDate(diff)
    currentWeekStart.setHours(0, 0, 0, 0)

    const weekStartMidnight = new Date(weekStart)
    weekStartMidnight.setHours(0, 0, 0, 0)

    return currentWeekStart.getTime() === weekStartMidnight.getTime()
  }

  const getEventsForDate = (date: Date) => {
    return events.filter((event) => {
      const eventDate = new Date(event.start_time)
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      )
    })
  }

  const weekDays = []
  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStart)
    day.setDate(weekStart.getDate() + i)
    weekDays.push(day)
  }

  const categoryColors: Record<string, { bg: string; text: string; border: string }> = {
    filming: { bg: "bg-pink-100", text: "text-pink-800", border: "border-pink-300" },
    editing: { bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-300" },
    review: { bg: "bg-orange-100", text: "text-orange-800", border: "border-orange-300" },
    meeting: { bg: "bg-green-100", text: "text-green-800", border: "border-green-300" },
    deadline: { bg: "bg-red-100", text: "text-red-800", border: "border-red-300" },
    posting: { bg: "bg-yellow-100", text: "text-yellow-800", border: "border-yellow-300" },
  }

  const getCategoryColor = (category: string) => {
    return categoryColors[category] || { bg: "bg-purple-100", text: "text-purple-700", border: "border-purple-300" }
  }

  // Navigation functions for previous/next week
  const previousWeek = () => {
    const newWeekStart = new Date(weekStart)
    newWeekStart.setDate(weekStart.getDate() - 7)
    setWeekStart(newWeekStart)
  }

  const nextWeek = () => {
    const newWeekStart = new Date(weekStart)
    newWeekStart.setDate(weekStart.getDate() + 7)
    setWeekStart(newWeekStart)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppNav userEmail={user?.email} />

      <main className="container mx-auto p-6 space-y-8 flex-1">
        <div className="flex flex-col gap-4">
          {/* Desktop: Back to Month View + Create Event buttons */}
          <div className="hidden sm:flex items-center justify-between">
            <Button
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => router.push("/dashboard")}
            >
              <ArrowLeft className="size-4 mr-2" />
              Back to Month View
            </Button>

            <CreateEventDialog
              workspaceId={workspaceId}
              creators={creators}
              batches={batches}
              onEventCreated={() => loadEvents()}
              trigger={<Button className="bg-accent text-accent-foreground hover:bg-accent/90"><Plus className="size-4 mr-2" />Create</Button>}
            />
          </div>

          {/* Mobile + Desktop: Week navigation with Create Event button on same row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4 flex-1">
              <Button variant="outline" size="icon" onClick={previousWeek}>
                <ChevronLeft className="size-4" />
              </Button>
              <h1 className="text-lg sm:text-3xl font-bold text-center flex-1">
                {isCurrentWeek() ? "This Week" : `Week of ${weekStart.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`}
              </h1>
              <Button variant="outline" size="icon" onClick={nextWeek}>
                <ChevronRight className="size-4" />
              </Button>
            </div>

            {/* Mobile: Create Event button on the right */}
            <div className="sm:hidden ml-4">
              <CreateEventDialog
                workspaceId={workspaceId}
                creators={creators}
                batches={batches}
                onEventCreated={() => loadEvents()}
                trigger={<Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90"><Plus className="size-4 mr-2" />Create</Button>}
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {weekDays.map((day) => {
            const dayEvents = getEventsForDate(day)
            const isPast = day < new Date(new Date().setHours(0, 0, 0, 0))
            const isToday =
              day.getDate() === new Date().getDate() &&
              day.getMonth() === new Date().getMonth() &&
              day.getFullYear() === new Date().getFullYear()
            const isFuture = !isPast && !isToday

            return (
              <Card
                key={day.toISOString()}
                className={`transition-all duration-200 cursor-pointer py-0 ${
                  isToday
                    ? "border-2 ring-2 bg-accent/30 border-accent ring-accent/40 hover:bg-accent/40"
                    : isPast
                      ? "bg-white/60 border border-muted-foreground/20 opacity-60 hover:opacity-80"
                      : "bg-white border border-border hover:bg-accent"
                }`}
                onClick={() => router.push(`/dashboard/daily?date=${day.toISOString()}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Calendar className="size-5" />
                    <h3 className={`text-lg sm:text-xl font-medium ${
                      isToday ? "text-accent-dark font-semibold" : isPast ? "text-muted-foreground opacity-60" : ""
                    }`}>
                      {day.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                    </h3>
                  </div>

                  {dayEvents.length === 0 ? (
                    <div className="text-center py-6">
                      <Calendar className="size-12 mx-auto text-muted-foreground/50 mb-2" />
                      <p className={`text-base ${isPast ? "text-muted-foreground opacity-60" : "text-muted-foreground"}`}>
                        No events scheduled
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-2">
                      {dayEvents.map((event) => {
                        const colors = getCategoryColor(event.category || 'meeting')
                        const eventDate = new Date(event.start_time)
                        const endDate = new Date(event.end_time)
                        const eventIsPast = endDate < new Date()

                        return (
                          <HoverCard key={event.id} openDelay={200}>
                            <HoverCardTrigger asChild>
                              <div
                                className={`p-4 rounded-lg border cursor-pointer hover:shadow-md transition-all duration-200 relative ${
                                  colors.bg
                                } ${colors.border} ${eventIsPast ? "opacity-60" : ""} hover:scale-[1.02]`}
                                onClick={() => {
                                  setEditingEvent(event)
                                  setShowEditEventDialog(true)
                                }}
                              >
                                {/* Category badge - top right */}
                                <div className="absolute top-2 right-2">
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text} ${colors.border}`}>
                                    {event.category || 'meeting'}
                                  </span>
                                </div>

                                <div className="pr-20">
                                  {/* Time row */}
                                  <div className="flex items-center gap-1.5 mb-2">
                                    <Clock className="size-4 text-muted-foreground" />
                                    <span className={`text-sm font-medium ${eventIsPast ? "line-through" : ""}`}>
                                      {eventDate.toLocaleTimeString("en-US", {
                                        hour: "numeric",
                                        minute: "2-digit",
                                        hour12: true,
                                      })}
                                      {event.end_time && (
                                        <span className="text-muted-foreground">
                                          {" - "}
                                          {new Date(event.end_time).toLocaleTimeString("en-US", {
                                            hour: "numeric",
                                            minute: "2-digit",
                                            hour12: true,
                                          })}
                                        </span>
                                      )}
                                    </span>
                                  </div>

                                  {/* Title and Description row */}
                                  <div className="mb-1">
                                    <span className={`font-bold text-base ${eventIsPast ? "line-through" : ""}`}>
                                      {event.title}
                                    </span>
                                    {event.description && (
                                      <span className="text-sm text-muted-foreground ml-2">
                                        : {event.description}
                                      </span>
                                    )}
                                  </div>

                                  {/* Location row */}
                                  {event.location && (
                                    <div className="text-sm text-muted-foreground">
                                      📍 {event.location}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </HoverCardTrigger>
                            {/* HoverCardContent can be added here if needed */}
                          </HoverCard>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </main>

      <Footer />
    </div>
  )
}
