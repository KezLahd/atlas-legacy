"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { AppNav } from "@/components/app-nav"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ChevronLeft, ChevronRight, Calendar, Clock } from "lucide-react"
import type { CalendarEvent } from "@/lib/types/database"
import { HoverCard, HoverCardTrigger } from "@/components/ui/hover-card"
import { Card, CardContent } from "@/components/ui/card"

interface EventWithDetails extends CalendarEvent {
  content: { hook: string } | null
  batch: { name: string } | null
  event_team_members: Array<{ user_id: string; user_profiles: { first_name: string; last_name: string } }>
}

export default function WeeklyViewPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [workspaceId, setWorkspaceId] = useState<string>("")
  const [events, setEvents] = useState<EventWithDetails[]>([])
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
    if (workspaceId) {
      loadEvents()
    }
  }, [workspaceId, weekStart])

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
  }

  const loadEvents = async () => {
    const workspaceId = await getWorkspaceId()
    if (!workspaceId) return

    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)

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
      const userIds = data.flatMap((event) => event.event_team_members?.map((tm: any) => tm.user_id) || [])
      const uniqueUserIds = [...new Set(userIds)]

      const { data: profiles } = await supabase
        .from("user_profiles")
        .select("id, first_name, last_name")
        .in("id", uniqueUserIds)

      const profileMap = new Map(profiles?.map((p) => [p.id, p]) || [])

      const eventsWithProfiles = data.map((event) => ({
        ...event,
        event_team_members:
          event.event_team_members?.map((tm: any) => ({
            ...tm,
            user_profiles: profileMap.get(tm.user_id),
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
        <div className="flex items-center gap-4">
          <Button
            className="bg-accent text-accent-foreground hover:bg-accent/90"
            onClick={() => router.push("/dashboard")}
          >
            <ArrowLeft className="size-4 mr-2" />
            Back to Month View
          </Button>

          <div className="flex items-center gap-4 flex-1 justify-center">
            <Button variant="outline" size="icon" onClick={previousWeek}>
              <ChevronLeft className="size-4" />
            </Button>
            <h1 className="text-3xl font-bold">
              Week of {weekStart.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </h1>
            <Button variant="outline" size="icon" onClick={nextWeek}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-6 space-y-6">
            {weekDays.map((day) => {
              const dayEvents = getEventsForDate(day)
              const isPast = day < new Date(new Date().setHours(0, 0, 0, 0))
              const isToday =
                day.getDate() === new Date().getDate() &&
                day.getMonth() === new Date().getMonth() &&
                day.getFullYear() === new Date().getFullYear()

              return (
                <div key={day.toISOString()} className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex items-center gap-2 ${
                        isToday ? "text-accent-dark font-semibold" : isPast ? "text-muted-foreground opacity-60" : ""
                      }`}
                    >
                      <Calendar className="size-4" />
                      <h3 className="text-lg font-medium">
                        {day.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                      </h3>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/dashboard/daily?date=${day.toISOString()}`)}
                    >
                      View Day <ChevronRight className="size-4 ml-1" />
                    </Button>
                  </div>

                  {dayEvents.length === 0 ? (
                    <p className={`text-sm ${isPast ? "text-muted-foreground opacity-60" : "text-muted-foreground"}`}>
                      No events scheduled
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {dayEvents.map((event) => {
                        const colors = getCategoryColor(event.category)
                        const eventDate = new Date(event.start_time)
                        const endDate = new Date(event.end_time)
                        const eventIsPast = endDate < new Date()

                        return (
                          <HoverCard key={event.id} openDelay={200}>
                            <HoverCardTrigger asChild>
                              <div
                                className={`p-3 rounded-md border cursor-pointer hover:shadow-sm transition-shadow ${
                                  colors.bg
                                } ${colors.border} ${eventIsPast ? "opacity-50" : ""}`}
                                onClick={() => {
                                  setEditingEvent(event)
                                  setShowEditEventDialog(true)
                                }}
                              >
                                <div className="flex items-center gap-2 text-sm">
                                  <Clock className="size-4" />
                                  <span className={eventIsPast ? "line-through" : ""}>
                                    {eventDate.toLocaleTimeString("en-US", {
                                      hour: "numeric",
                                      minute: "2-digit",
                                      hour12: true,
                                    })}{" "}
                                    | <span className="font-semibold">{event.title}</span>
                                  </span>
                                </div>
                              </div>
                            </HoverCardTrigger>
                            {/* HoverCardContent can be added here if needed */}
                          </HoverCard>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  )
}
