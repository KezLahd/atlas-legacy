"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { AppNav } from "@/components/app-nav"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { CreateEventDialog } from "@/components/create-event-dialog"
import type { CalendarEvent, Creator } from "@/lib/types/database"

interface EventWithDetails extends CalendarEvent {
  content: { hook: string } | null
  calendar_invitees: Array<{ email: string }>
}

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [workspaceId, setWorkspaceId] = useState<string>("")
  const [workspaceName, setWorkspaceName] = useState<string>("")
  const [events, setEvents] = useState<EventWithDetails[]>([])
  const [creators, setCreators] = useState<Creator[]>([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (workspaceId) {
      loadEvents()
    }
  }, [workspaceId, currentDate])

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
      .select("workspace_id, workspaces(name)")
      .eq("user_id", authUser.id)
      .single()

    if (!membership) {
      router.push("/onboarding")
      return
    }

    setWorkspaceId(membership.workspace_id)
    setWorkspaceName(membership.workspaces?.name || "")

    // Load creators
    const { data: creatorsData } = await supabase
      .from("creators")
      .select("*")
      .eq("workspace_id", membership.workspace_id)
      .order("name")

    if (creatorsData) setCreators(creatorsData)
    setLoading(false)
  }

  const loadEvents = async () => {
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)

    const { data } = await supabase
      .from("calendar_events")
      .select(
        `
        *,
        content(hook),
        calendar_invitees(email)
      `,
      )
      .eq("workspace_id", workspaceId)
      .gte("start_time", startOfMonth.toISOString())
      .lte("start_time", endOfMonth.toISOString())
      .order("start_time", { ascending: true })

    if (data) setEvents(data as EventWithDetails[])
  }

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    let startingDayOfWeek = firstDay.getDay() - 1
    if (startingDayOfWeek === -1) startingDayOfWeek = 6 // Sunday becomes last day

    const days = []
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i)
    }
    return days
  }

  const getEventsForDay = (day: number) => {
    return events.filter((event) => {
      const eventDate = new Date(event.start_time)
      return (
        eventDate.getDate() === day &&
        eventDate.getMonth() === currentDate.getMonth() &&
        eventDate.getFullYear() === currentDate.getFullYear()
      )
    })
  }

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]

  const isToday = (day: number) => {
    const today = new Date()
    return (
      day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    )
  }

  const isPast = (day: number) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
    return dayDate < today
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppNav userEmail={user?.email} />

      <main className="container mx-auto p-6 space-y-8 flex-1">
        <div>
          <h1 className="text-3xl font-bold">{loading ? "Content Calendar" : `${workspaceName}'s Content Calendar`}</h1>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <Button variant="outline" size="icon" onClick={previousMonth}>
              <ChevronLeft className="size-4" />
            </Button>
            {/* Reduced month/year font size from text-4xl to text-2xl so it's smaller than page title */}
            <h2 className="text-2xl font-bold flex-1 text-center">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <Button variant="outline" size="icon" onClick={nextMonth}>
              <ChevronRight className="size-4" />
            </Button>
            <CreateEventDialog workspaceId={workspaceId} creators={creators} onEventCreated={() => loadEvents()} />
          </div>

          <div className="grid grid-cols-7 gap-2">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
              <div key={day} className="text-center text-sm font-semibold text-muted-foreground py-2">
                {day}
              </div>
            ))}
            {getDaysInMonth().map((day, index) => {
              const dayEvents = day ? getEventsForDay(day) : []
              const today = day && isToday(day)
              const past = day && isPast(day)

              return (
                <div
                  key={index}
                  className={`min-h-32 rounded-lg p-3 transition-colors ${
                    !day
                      ? "bg-transparent"
                      : today
                        ? "bg-blue-50 border-2 border-blue-500 ring-2 ring-blue-200 hover:bg-blue-100"
                        : past
                          ? "bg-white/60 border border-muted-foreground/20 opacity-60 hover:opacity-80"
                          : "bg-white border border-border hover:bg-accent"
                  }`}
                >
                  {day && (
                    <>
                      <div
                        className={`text-sm font-semibold mb-2 ${
                          today ? "text-blue-600 font-bold text-lg" : past ? "text-muted-foreground" : "text-foreground"
                        }`}
                      >
                        {day}
                      </div>
                      <div className="space-y-1">
                        {dayEvents.slice(0, 2).map((event) => (
                          <div
                            key={event.id}
                            className="text-xs p-1.5 bg-primary/10 text-primary rounded truncate hover:bg-primary/20 cursor-pointer"
                            title={event.title}
                          >
                            {new Date(event.start_time).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}{" "}
                            {event.title}
                          </div>
                        ))}
                        {dayEvents.length > 2 && (
                          <div className="text-xs text-muted-foreground pl-1.5">+{dayEvents.length - 2} more</div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
