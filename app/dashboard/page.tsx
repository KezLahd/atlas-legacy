"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { createClient } from "@/lib/supabase/client"
import { AppNav } from "@/components/app-nav"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Copy, Check } from "lucide-react"
import { CreateEventDialog } from "@/components/create-event-dialog"
import { EditEventDialog } from "@/components/edit-event-dialog"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import type { CalendarEvent, Creator, Batch } from "@/lib/types/database"

interface EventWithDetails extends CalendarEvent {
  content: { hook: string } | null
  batch: { name: string } | null
  event_team_members: Array<{ user_id: string; user_profiles: { first_name: string; last_name: string } }>
}

function DashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [workspaceId, setWorkspaceId] = useState<string>("")
  const [workspaceName, setWorkspaceName] = useState<string>("")
  const [events, setEvents] = useState<EventWithDetails[]>([])
  const [creators, setCreators] = useState<Creator[]>([])
  const [batches, setBatches] = useState<Batch[]>([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set())
  const [editingEvent, setEditingEvent] = useState<EventWithDetails | null>(null)
  const [showEditEventDialog, setShowEditEventDialog] = useState(false)
  const [showReferralCodesDialog, setShowReferralCodesDialog] = useState(false)
  const [referralCodes, setReferralCodes] = useState<Array<{ role: string; referral_code: string }>>([])
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [referralCodeView, setReferralCodeView] = useState<"team" | "creator">("team")

  useEffect(() => {
    loadData()
    // Redirect to weekly view on mobile screens
    const isMobile = window.innerWidth < 768
    if (isMobile) {
      const today = new Date()
      router.push(`/dashboard/weekly?date=${today.toISOString()}`)
    }
  }, [])

  useEffect(() => {
    if (workspaceId) {
      loadEvents()
    }
  }, [workspaceId, currentDate])

  useEffect(() => {
    // Check if we should show referral codes dialog
    const showCodes = searchParams.get("showReferralCodes")
    if (showCodes === "true" && workspaceId) {
      loadReferralCodes()
      // Remove query parameter from URL
      router.replace("/dashboard", { scroll: false })
    }
  }, [workspaceId, searchParams, router])

  const loadReferralCodes = async () => {
    if (!workspaceId) return
    
    // Wait a moment for referral codes to be generated
    await new Promise((resolve) => setTimeout(resolve, 500))
    
    const { data: codesData } = await supabase
      .from("workspace_referral_codes")
      .select("role, referral_code")
      .eq("workspace_id", workspaceId)
      .order("role")

    if (codesData && codesData.length > 0) {
      setReferralCodes(codesData)
      setShowReferralCodesDialog(true)
    }
  }

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const handleCloseReferralCodesDialog = () => {
    setShowReferralCodesDialog(false)
  }

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
    setLoading(false)
  }

  const loadEvents = async () => {
    const workspaceId = await getWorkspaceId()
    if (!workspaceId) return

    console.log("[v0] Loading events for workspace:", workspaceId)

    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)

    const { data, error } = await supabase
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
      .gte("start_time", startOfMonth.toISOString())
      .lte("start_time", endOfMonth.toISOString())
      .order("start_time", { ascending: true })

    if (error) {
      console.error("[v0] Error loading events:", error.message)
    } else {
      console.log("[v0] Loaded events:", data?.length)

      if (data) {
        // Fetch user profiles separately for team members
        const userIds = data.flatMap((event) => event.event_team_members?.map((tm: any) => tm.user_id) || [])
        const uniqueUserIds = [...new Set(userIds)]

        const { data: profiles } = await supabase
          .from("user_profiles")
          .select("id, first_name, last_name")
          .in("id", uniqueUserIds)

        // Map profiles to team members
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
  }

  const getWorkspaceId = async () => {
    // Placeholder for logic to get workspaceId
    // This should be replaced with actual implementation
    return workspaceId
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

  const getWeeksInMonth = () => {
    const days = getDaysInMonth()
    const weeks = []
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7))
    }
    return weeks
  }

  const getEventsForDay = (day: number) => {
    return events.filter((event) => {
      const eventDate = new Date(event.start_time)
      const localDay = eventDate.getDate()
      const localMonth = eventDate.getMonth()
      const localYear = eventDate.getFullYear()

      return localDay === day && localMonth === currentDate.getMonth() && localYear === currentDate.getFullYear()
    })
  }

  const getWeekNumber = (date: Date) => {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1)
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
  }

  const openWeekView = (day: number) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
    router.push(`/dashboard/weekly?date=${date.toISOString()}`)
  }

  const handleWeekRowClick = (e: React.MouseEvent, week: (number | null)[]) => {
    // Find first valid day in the week
    const firstDay = week.find((day) => day !== null)
    if (firstDay) {
      openWeekView(firstDay)
    }
  }

  const openDayView = (day: number) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
    router.push(`/dashboard/daily?date=${date.toISOString()}`)
  }

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

  const categoryColors: Record<string, { bg: string; text: string; border: string; filledBg: string; filledText: string }> = {
    filming: { bg: "bg-pink-100", text: "text-pink-700", border: "border-pink-200", filledBg: "bg-pink-500", filledText: "text-white" },
    editing: { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-200", filledBg: "bg-blue-500", filledText: "text-white" },
    review: { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-200", filledBg: "bg-orange-500", filledText: "text-white" },
    meeting: { bg: "bg-purple-100", text: "text-purple-700", border: "border-purple-200", filledBg: "bg-purple-500", filledText: "text-white" },
    deadline: { bg: "bg-red-100", text: "text-red-700", border: "border-red-200", filledBg: "bg-red-500", filledText: "text-white" },
    posting: { bg: "bg-green-100", text: "text-green-700", border: "border-green-200", filledBg: "bg-green-500", filledText: "text-white" },
  }

  const getCategoryColor = (category: string) => {
    return categoryColors[category] || { bg: "bg-purple-100", text: "text-purple-700", border: "border-purple-200" }
  }

  const toggleDayExpansion = (day: number) => {
    const newExpanded = new Set(expandedDays)
    if (newExpanded.has(day)) {
      newExpanded.delete(day)
    } else {
      newExpanded.add(day)
    }
    setExpandedDays(newExpanded)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppNav userEmail={user?.email} />

      <main className="container mx-auto p-6 space-y-8 flex-1">
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <Button variant="outline" size="icon" onClick={previousMonth}>
              <ChevronLeft className="size-4" />
            </Button>
            <h2 className="text-2xl font-bold flex-1 text-center">
              {currentDate.toLocaleString("default", { month: "long" })} {currentDate.getFullYear()}
            </h2>
            <Button variant="outline" size="icon" onClick={nextMonth}>
              <ChevronRight className="size-4" />
            </Button>
            <CreateEventDialog
              workspaceId={workspaceId}
              creators={creators}
              batches={batches}
              onEventCreated={() => loadEvents()}
              trigger={<Button className="bg-accent text-accent-foreground hover:bg-accent/90">Create Event</Button>}
            />
          </div>

          <div className="grid grid-cols-7 gap-2 pl-10">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
              <div key={day} className="text-center text-sm font-semibold text-muted-foreground py-1">
                {day}
              </div>
            ))}
          </div>

          <div className="space-y-2">
            {getWeeksInMonth().map((week, weekIndex) => {
              // Get week number for the first valid day in the week
              const firstDay = week.find((day) => day !== null)
              const weekNumber = firstDay
                ? getWeekNumber(new Date(currentDate.getFullYear(), currentDate.getMonth(), firstDay))
                : null

              return (
                <div key={weekIndex} className="flex gap-2">
                  {/* Week number button on the left */}
                  <button
                    onClick={() => firstDay && openWeekView(firstDay)}
                    className="flex-shrink-0 w-8 self-stretch flex items-center justify-center text-xs font-semibold text-muted-foreground hover:text-accent hover:bg-accent/10 rounded transition-colors"
                    title={`View week ${weekNumber}`}
                  >
                    {weekNumber || ""}
                  </button>

                  {/* Removed hover effect and onClick from grid container */}
                  <div className="grid grid-cols-7 gap-x-2 flex-1">
                    {week.map((day, dayIndex) => {
                      const dayEvents = day ? getEventsForDay(day) : []
                      const today = day && isToday(day)
                      const past = day && isPast(day)
                      const isExpanded = day ? expandedDays.has(day) : false
                      const visibleCount = isExpanded ? dayEvents.length : Math.min(4, dayEvents.length)
                      const hasMore = dayEvents.length > 4

                      return (
                        <div
                          key={`${weekIndex}-${dayIndex}`}
                          data-day-card
                          className={`min-h-32 rounded-lg p-3 transition-colors ${
                            !day
                              ? "bg-transparent"
                              :                             today
                              ? "border-2 ring-2 bg-accent/30 border-accent ring-accent/40 hover:bg-accent/40 cursor-pointer"
                                : past
                                  ? "bg-white/60 border border-muted-foreground/20 opacity-60 hover:opacity-80 cursor-pointer"
                                  : "bg-white border border-border hover:bg-accent cursor-pointer"
                          }`}
                          onClick={(e) => {
                            e.stopPropagation()
                            day && openDayView(day)
                          }}
                        >
                          {day && (
                            <>
                              <div
                                className={`text-sm font-semibold mb-2 ${
                                  today ? "font-bold text-lg" : past ? "text-muted-foreground" : "text-foreground"
                                }`}
                                style={today ? { color: "var(--theme-accent-dark)" } : undefined}
                              >
                                {day}
                              </div>
                              <div className="space-y-1">
                                {dayEvents.slice(0, visibleCount).map((event) => {
                                  const colors = getCategoryColor(event.category || "")
                                  const eventDate = new Date(event.start_time)
                                  const isEventPast = eventDate < new Date()

                                  return (
                                    <HoverCard key={event.id} openDelay={200}>
                                      <HoverCardTrigger asChild>
                                        <div
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            setEditingEvent(event)
                                            setShowEditEventDialog(true)
                                          }}
                                          className={`text-xs p-1.5 rounded truncate cursor-pointer border ${
                                            today
                                              ? `${colors.filledBg} ${colors.filledText} border-transparent`
                                              : isEventPast
                                                ? `${colors.bg} ${colors.text} ${colors.border} opacity-50 line-through`
                                                : `${colors.bg} ${colors.text} ${colors.border}`
                                          }`}
                                        >
                                          {new Date(event.start_time).toLocaleTimeString([], {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                            hour12: false,
                                          })}{" "}
                                          | <span className="font-semibold">{event.title}</span>
                                        </div>
                                      </HoverCardTrigger>
                                      <HoverCardContent className="w-80 bg-white" side="top" align="start">
                                        <div className="space-y-3">
                                          <div className="flex items-center justify-between">
                                            <div className="text-sm font-semibold text-muted-foreground">
                                              {new Date(event.start_time).toLocaleDateString("en-US", {
                                                weekday: "short",
                                                year: "numeric",
                                                month: "short",
                                                day: "numeric",
                                              })}
                                            </div>
                                            <div
                                              className={`px-3 py-1 rounded-full text-xs capitalize ${
                                                today
                                                  ? `${getCategoryColor(event.category || "").filledBg} ${getCategoryColor(event.category || "").filledText} border-transparent`
                                                  : `${getCategoryColor(event.category || "").bg} ${getCategoryColor(event.category || "").text} ${getCategoryColor(event.category || "").border} border`
                                              }`}
                                            >
                                              {event.category}
                                            </div>
                                          </div>

                                          <div className="flex gap-3">
                                            {/* Left column: Times */}
                                            <div className="flex flex-col justify-between">
                                              <div className="text-sm font-medium">
                                                {new Date(event.start_time).toLocaleTimeString([], {
                                                  hour: "2-digit",
                                                  minute: "2-digit",
                                                  hour12: false,
                                                })}
                                              </div>
                                              <div className="text-sm font-medium">
                                                {new Date(event.end_time).toLocaleTimeString([], {
                                                  hour: "2-digit",
                                                  minute: "2-digit",
                                                  hour12: false,
                                                })}
                                              </div>
                                            </div>

                                            {/* Center: Vertical line */}
                                            <div className="w-0.5 bg-border" />

                                            {/* Right: Event metadata */}
                                            <div className="flex-1 space-y-2">
                                              <div className="font-semibold text-base">{event.title}</div>
                                              {event.description && (
                                                <div className="text-xs text-muted-foreground leading-relaxed">
                                                  {event.description}
                                                </div>
                                              )}
                                              {event.location && (
                                                <div className="text-sm">
                                                  <span className="font-semibold">Location:</span> {event.location}
                                                </div>
                                              )}
                                              {event.content && (
                                                <div className="text-sm">
                                                  <span className="font-semibold">Content:</span> {event.content.hook}
                                                </div>
                                              )}
                                              {event.batch && (
                                                <div className="text-sm">
                                                  <span className="font-semibold">Batch:</span> {event.batch.name}
                                                </div>
                                              )}
                                              {event.event_team_members && event.event_team_members.length > 0 && (
                                                <div className="text-sm">
                                                  <span className="font-semibold">Team:</span>{" "}
                                                  {event.event_team_members
                                                    .map((m) =>
                                                      `${m.user_profiles?.first_name || ""} ${m.user_profiles?.last_name || ""}`.trim(),
                                                    )
                                                    .filter(Boolean)
                                                    .join(", ")}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      </HoverCardContent>
                                    </HoverCard>
                                  )
                                })}
                                {hasMore && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      toggleDayExpansion(day)
                                    }}
                                    className="text-xs text-primary hover:text-primary/80 pl-1.5 flex items-center gap-1 transition-colors"
                                  >
                                    {isExpanded ? (
                                      <>
                                        <ChevronUp className="size-3" />
                                        Hide
                                      </>
                                    ) : (
                                      <>
                                        <ChevronDown className="size-3" />
                                        Show {dayEvents.length - 4} more
                                      </>
                                    )}
                                  </button>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </main>

      <Footer />

      {editingEvent && (
        <EditEventDialog
          event={editingEvent} // Changed from eventId={editingEvent.id} to event={editingEvent} to match component interface
          workspaceId={workspaceId}
          creators={creators}
          open={showEditEventDialog}
          onOpenChange={setShowEditEventDialog}
          onEventUpdated={() => loadEvents()}
        />
      )}

      {/* Referral Codes Dialog for Team/Manager */}
      <Dialog open={showReferralCodesDialog} onOpenChange={setShowReferralCodesDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {referralCodeView === "team" ? "Team Member Referral Codes" : "Creator Referral Code"}
            </DialogTitle>
            <DialogDescription>
              {referralCodeView === "team"
                ? "Share these codes with your team members. They'll use them when signing up to join your workspace."
                : "Share this code with creators. They'll use it when signing up to join your workspace as a creator."}
            </DialogDescription>
          </DialogHeader>
          
          {/* Toggle between Team and Creator */}
          <div className="flex items-center gap-2 p-1 bg-muted rounded-lg">
            <Button
              variant={referralCodeView === "team" ? "default" : "ghost"}
              size="sm"
              onClick={() => setReferralCodeView("team")}
              className="flex-1"
            >
              Team Members
            </Button>
            <Button
              variant={referralCodeView === "creator" ? "default" : "ghost"}
              size="sm"
              onClick={() => setReferralCodeView("creator")}
              className="flex-1"
            >
              Creator
            </Button>
          </div>

          <div className="space-y-4 py-4">
            {referralCodes.length > 0 ? (
              referralCodeView === "team" ? (
                <Accordion type="single" collapsible className="w-full">
                  {referralCodes
                    .filter((code) => code.role !== "owner" && code.role !== "creator")
                    .map((refCode) => (
                      <AccordionItem key={refCode.role} value={refCode.role} className="border-none">
                        <AccordionTrigger className="capitalize hover:no-underline">
                          {refCode.role}
                        </AccordionTrigger>
                        <AccordionContent className="pt-2">
                          <div className="flex items-center gap-2 p-3 bg-accent/10 border border-accent/20 rounded-lg">
                            <code className="flex-1 font-mono text-sm font-semibold text-accent bg-background px-3 py-2 rounded border border-accent/30">
                              {refCode.referral_code}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopyCode(refCode.referral_code)}
                              className="h-9 w-9 p-0 hover:bg-accent/20"
                            >
                              {copiedCode === refCode.referral_code ? (
                                <Check className="size-4 text-green-600 dark:text-green-400" />
                              ) : (
                                <Copy className="size-4 text-muted-foreground" />
                              )}
                            </Button>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                </Accordion>
              ) : (
                referralCodes
                  .filter((code) => code.role === "creator")
                  .map((refCode) => (
                    <div key={refCode.role} className="space-y-2">
                      <div className="flex items-center gap-2 p-3 bg-accent/10 border border-accent/20 rounded-lg">
                        <code className="flex-1 font-mono text-sm font-semibold text-accent bg-background px-3 py-2 rounded border border-accent/30">
                          {refCode.referral_code}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyCode(refCode.referral_code)}
                          className="h-9 w-9 p-0 hover:bg-accent/20"
                        >
                          {copiedCode === refCode.referral_code ? (
                            <Check className="size-4 text-green-600 dark:text-green-400" />
                          ) : (
                            <Copy className="size-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))
              )
            ) : (
              <p className="text-sm text-muted-foreground">Loading referral codes...</p>
            )}
          </div>
          <DialogFooter>
            <Button onClick={handleCloseReferralCodesDialog} className="w-full">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DashboardContent />
    </Suspense>
  )
}
