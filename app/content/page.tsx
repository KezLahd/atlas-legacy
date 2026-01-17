"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { AppNav } from "@/components/app-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Calendar, Search, ChevronDown, ChevronRight, FileText, Pencil } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CreateContentDialog } from "@/components/create-content-dialog"
import { CreateEventDialog } from "@/components/create-event-dialog"
import { Footer } from "@/components/footer"
import { EditContentDialog } from "@/components/edit-content-dialog"
import type { Content, Creator, ProductionStage, Batch } from "@/lib/types/database"
import { CreateBatchDialog } from "@/components/create-batch-dialog"
import { EditBatchDialog } from "@/components/edit-batch-dialog"
import React from "react"

interface ContentWithDetails extends Content {
  creators: { name: string }
  content_platforms: Array<{ platforms: { name: string } }>
  content_content_pillars: Array<{ content_pillars: { name: string } }>
  four_hs: { name: string } | null
  batches: { name: string } | null
  series: { name: string } | null
  created_by_user: { first_name: string; last_name: string } | null
  updated_by_user: { first_name: string; last_name: string } | null
  content_types: { id: string; name: string; icon: string } | null
  script_scenes: Array<{ scene_number: number; audio_script: string; visuals: string }>
  created_by_profile: { first_name: string; last_name: string } | null
  updated_by_profile: { first_name: string; last_name: string } | null
}

interface CalendarEvent {
  id: string
  title: string
  start_time: string
  end_time: string
  category: string
  content_id: string
}

export default function ContentPage() {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [workspaceId, setWorkspaceId] = useState<string>("")
  const [content, setContent] = useState<ContentWithDetails[]>([])
  const [creators, setCreators] = useState<Creator[]>([])
  const [batches, setBatches] = useState<Batch[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [workspaceType, setWorkspaceType] = useState<string>("")
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [showScheduleDialog, setShowScheduleDialog] = useState<boolean>(false)
  const [schedulingContentId, setSchedulingContentId] = useState<string>("")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [selectedBatch, setSelectedBatch] = useState<string>("all")
  const [selectedCreator, setSelectedCreator] = useState<string>("all")
  const [selectedStage, setSelectedStage] = useState<string>("all")
  const [selectedFormat, setSelectedFormat] = useState<string>("all")
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([])

  useEffect(() => {
    loadData()
  }, [])

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

    const { data: workspaceData } = await supabase
      .from("workspaces")
      .select("workspace_type")
      .eq("id", membership.workspace_id)
      .single()

    if (workspaceData) {
      setWorkspaceType(workspaceData.workspace_type)
    }

    const [creatorsRes, batchesRes] = await Promise.all([
      supabase.from("creators").select("*").eq("workspace_id", membership.workspace_id).order("name"),
      supabase
        .from("batches")
        .select("*")
        .eq("workspace_id", membership.workspace_id)
        .order("created_at", { ascending: false }),
    ])

    if (creatorsRes.data) setCreators(creatorsRes.data)
    if (batchesRes.data) setBatches(batchesRes.data)

    await loadContent(membership.workspace_id)
    await loadCalendarEvents(membership.workspace_id)
  }

  const loadContent = async (workspaceId: string) => {
    setIsLoading(true)
    console.log("[v0] Loading content for workspace:", workspaceId)
    const { data, error } = await supabase
      .from("content")
      .select(
        `
        *,
        creators!inner(id, name),
        content_types(id, name, icon),
        four_hs(id, name),
        content_content_pillars(
          id,
          content_pillars(id, name)
        ),
        content_platforms(
          id,
          platforms(id, name)
        ),
        batches(id, name),
        script_scenes(
          id,
          scene_number,
          audio_script,
          visuals
        )
      `,
      )
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })

    console.log("[v0] Content query result:", { data, error, count: data?.length || 0 })
    if (error) {
      console.error("[v0] Error loading content:", error)
      setIsLoading(false)
      return
    }

    if (data && data.length > 0) {
      // Fetch user profiles for created_by and updated_by
      const userIds = [...new Set([...data.map((c) => c.created_by), ...data.map((c) => c.updated_by)].filter(Boolean))]

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("user_profiles")
          .select("id, first_name, last_name")
          .in("id", userIds)

        // Map profiles to content items
        const contentWithProfiles = data.map((item) => ({
          ...item,
          created_by_profile: profiles?.find((p) => p.id === item.created_by),
          updated_by_profile: profiles?.find((p) => p.id === item.updated_by),
        }))

        setContent(contentWithProfiles as ContentWithDetails[])
      } else {
        setContent(data as ContentWithDetails[])
      }
    }
    setIsLoading(false)
  }

  const loadCalendarEvents = async (workspaceId: string) => {
    const { data, error } = await supabase
      .from("calendar_events")
      .select("id, title, start_time, end_time, category, content_id")
      .eq("workspace_id", workspaceId)
      .order("start_time", { ascending: true })

    if (error) {
      console.error("[v0] Error loading calendar events:", error)
      return
    }

    if (data) {
      setCalendarEvents(data)
    }
  }

  const filteredContent = content.filter((item) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesSearch =
        item.hook?.toLowerCase().includes(query) ||
        item.creators?.name?.toLowerCase().includes(query) ||
        item.content_content_pillars?.some((ccp) => ccp.content_pillars.name.toLowerCase().includes(query)) ||
        item.content_platforms?.some((cp) => cp.platforms.name.toLowerCase().includes(query)) ||
        item.format?.toLowerCase().includes(query) ||
        item.production_stage?.toLowerCase().includes(query)

      if (!matchesSearch) return false
    }

    // Batch filter
    if (selectedBatch !== "all" && item.batch_id !== selectedBatch) {
      return false
    }

    // Creator filter
    if (selectedCreator !== "all" && item.creator_id !== selectedCreator) {
      return false
    }

    // Stage filter
    if (selectedStage !== "all" && item.production_stage !== selectedStage) {
      return false
    }

    // Format filter
    if (selectedFormat !== "all" && item.format !== selectedFormat) {
      return false
    }

    return true
  })

  const groupedContent = () => {
    const batchGroups: Record<string, ContentWithDetails[]> = {}
    const unbatched: ContentWithDetails[] = []

    filteredContent.forEach((item) => {
      if (item.batch_id) {
        if (!batchGroups[item.batch_id]) {
          batchGroups[item.batch_id] = []
        }
        batchGroups[item.batch_id].push(item)
      } else {
        unbatched.push(item)
      }
    })

    return { batchGroups, unbatched }
  }

  const { batchGroups, unbatched } = groupedContent()

  const getStageColor = (stage: ProductionStage) => {
    const colors = {
      idea: "bg-red-100 text-red-800 border-red-200",
      scripted: "bg-orange-100 text-orange-800 border-orange-200",
      approved: "bg-yellow-100 text-yellow-800 border-yellow-200",
      scheduled: "bg-lime-100 text-lime-800 border-lime-200",
      shot: "bg-green-100 text-green-800 border-green-200",
      edited: "bg-emerald-100 text-emerald-800 border-emerald-200",
      posted: "bg-teal-100 text-teal-800 border-teal-200",
    }
    return colors[stage] || "bg-gray-100 text-gray-800"
  }

  const getCategoryColor = (category: string) => {
    const categoryColors: Record<string, { bg: string; text: string; border: string }> = {
      filming: { bg: "bg-pink-100", text: "text-pink-700", border: "border-pink-200" },
      editing: { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-200" },
      meeting: { bg: "bg-purple-100", text: "text-purple-700", border: "border-purple-200" },
      deadline: { bg: "bg-red-100", text: "text-red-700", border: "border-red-200" },
      posting: { bg: "bg-green-100", text: "text-green-700", border: "border-green-200" },
    }
    return categoryColors[category] || { bg: "bg-purple-100", text: "text-purple-700", border: "border-purple-200" }
  }

  const formatEventTime = (startTime: string, endTime: string) => {
    const start = new Date(startTime)
    const end = new Date(endTime)
    const formatTime = (date: Date) => {
      const hours = date.getHours().toString().padStart(2, "0")
      const minutes = date.getMinutes().toString().padStart(2, "0")
      return `${hours}:${minutes}`
    }
    return `${formatTime(start)} - ${formatTime(end)}`
  }

  const formatEventDate = (dateTime: string) => {
    const date = new Date(dateTime)
    const day = date.getDate().toString().padStart(2, "0")
    const month = (date.getMonth() + 1).toString().padStart(2, "0")
    return `${day}/${month}`
  }

  const getPlatformBadgeStyle = (platformName: string) => {
    const config: Record<string, string> = {
      youtube: "bg-red-50 text-red-700 border-red-600",
      tiktok: "bg-gradient-to-br from-cyan-50 via-pink-50 to-black/5 text-black border-black",
      instagram: "bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 text-pink-700 border-pink-500",
      twitter: "bg-black/5 text-black border-black",
      x: "bg-black/5 text-black border-black",
      linkedin: "bg-blue-50 text-blue-800 border-blue-700",
      facebook: "bg-blue-50 text-blue-700 border-blue-600",
    }
    return config[platformName.toLowerCase()] || "bg-gray-50 text-gray-700 border-gray-400"
  }

  const getPlatformIcon = (platformName: string) => {
    const icons: Record<string, string> = {
      youtube: "/icons/youtube.svg",
      tiktok: "/icons/tiktok.svg",
      instagram: "/icons/instagram.svg",
      x: "/icons/x.svg",
      twitter: "/icons/x.svg",
      linkedin: "/icons/linkedin.svg",
      facebook: "/icons/facebook.svg",
    }
    return icons[platformName.toLowerCase()] || ""
  }

  const toggleExpanded = (contentId: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(contentId)) {
        newSet.delete(contentId)
      } else {
        newSet.add(contentId)
      }
      return newSet
    })
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppNav userEmail={user?.email} />

      <main className="container mx-auto p-6 space-y-6 flex-1">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Content</h1>
            <p className="text-muted-foreground">Plan, script, and manage your content pipeline</p>
          </div>
          <div className="flex gap-2">
            <CreateBatchDialog workspaceId={workspaceId} creators={creators} onBatchCreated={() => loadData()} />
            <CreateContentDialog
              workspaceId={workspaceId}
              creators={creators}
              onContentCreated={() => loadContent(workspaceId)}
              workspaceType={workspaceType}
            />
          </div>
        </div>

        <Card className="shadow-sm">
          <CardContent className="pt-3 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Search bar - left aligned, increased width */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search by title, creator, pillar, platform, format..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Filter buttons - right aligned, reduced width, wraps when needed */}
              <div className="flex flex-wrap gap-2 justify-end">
                <Select value={selectedBatch} onValueChange={setSelectedBatch}>
                  <SelectTrigger className="w-[130px] hover:bg-accent/20 transition-colors">
                    <SelectValue placeholder="Batch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Batches</SelectItem>
                    {batches.map((batch) => (
                      <SelectItem key={batch.id} value={batch.id}>
                        {batch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedCreator} onValueChange={setSelectedCreator}>
                  <SelectTrigger className="w-[130px] hover:bg-accent/20 transition-colors">
                    <SelectValue placeholder="Creator" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Creators</SelectItem>
                    {creators.map((creator) => (
                      <SelectItem key={creator.id} value={creator.id}>
                        {creator.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedStage} onValueChange={setSelectedStage}>
                  <SelectTrigger className="w-[130px] hover:bg-accent/20 transition-colors">
                    <SelectValue placeholder="Stage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stages</SelectItem>
                    <SelectItem value="idea">Idea</SelectItem>
                    <SelectItem value="scripted">Scripted</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="shot">Shot</SelectItem>
                    <SelectItem value="edited">Edited</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="posted">Posted</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={selectedFormat} onValueChange={setSelectedFormat}>
                  <SelectTrigger className="w-[130px] hover:bg-accent/20 transition-colors">
                    <SelectValue placeholder="Format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Formats</SelectItem>
                    <SelectItem value="reel">Reel</SelectItem>
                    <SelectItem value="post">Post</SelectItem>
                    <SelectItem value="story">Story</SelectItem>
                    <SelectItem value="carousel">Carousel</SelectItem>
                    <SelectItem value="short">Short</SelectItem>
                    <SelectItem value="long_video">Long Video</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Table Section */}
            {isLoading ? (
              <div className="py-12 text-center">
                <p className="text-muted-foreground">Loading content...</p>
              </div>
            ) : filteredContent.length > 0 ? (
              <div className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-accent hover:bg-accent">
                      <TableHead className="font-semibold w-8 text-white"></TableHead>
                      <TableHead className="font-semibold text-white">Title</TableHead>
                      <TableHead className="font-semibold text-white">Stage</TableHead>
                      <TableHead className="font-semibold text-white">Creator</TableHead>
                      <TableHead className="font-semibold text-white">Created By</TableHead>
                      <TableHead className="font-semibold text-white">Pillar</TableHead>
                      <TableHead className="font-semibold text-white">Platforms</TableHead>
                      <TableHead className="font-semibold text-white">Format</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batches.map((batch) => {
                      const batchContent = batchGroups[batch.id] || []
                      const formatBatchDateRange = (batch: any) => {
                        if (!batch.start_date || !batch.end_date) return ""

                        const start = new Date(batch.start_date)
                        const end = new Date(batch.end_date)
                        const startMonth = start.toLocaleString("en-US", { month: "long" })
                        const endMonth = end.toLocaleString("en-US", { month: "long" })

                        // If same month, just show month name
                        if (startMonth === endMonth && start.getFullYear() === end.getFullYear()) {
                          return ` (${startMonth})`
                        }
                        // If different months, show range
                        return ` (${startMonth} - ${endMonth})`
                      }

                      return (
                        <React.Fragment key={batch.id}>
                          {/* Batch header row with edit button */}
                          <TableRow className="bg-accent/5 hover:bg-accent/5">
                            <TableCell colSpan={7} className="font-semibold text-sm py-2">
                              {batch.name}
                              {formatBatchDateRange(batch)}
                            </TableCell>
                            <TableCell className="py-2 text-right">
                              <EditBatchDialog batch={batch} creators={creators} onBatchUpdated={() => loadData()} />
                            </TableCell>
                          </TableRow>
                          {/* Content rows for this batch */}
                          {batchContent.length > 0 ? (
                            batchContent.map((item) => {
                              const isExpanded = expandedRows.has(item.id)
                              const contentEvents = calendarEvents.filter((event) => event.content_id === item.id)

                              return (
                                <React.Fragment key={item.id}>
                                  <TableRow
                                    className="cursor-pointer hover:bg-accent/10 transition-colors"
                                    onClick={() => toggleExpanded(item.id)}
                                  >
                                    <TableCell>
                                      <Button variant="ghost" size="sm" className="p-0 h-6 w-6">
                                        {isExpanded ? (
                                          <ChevronDown className="size-4" />
                                        ) : (
                                          <ChevronRight className="size-4" />
                                        )}
                                      </Button>
                                    </TableCell>
                                    <TableCell className="font-medium">
                                      <div className="space-y-1">
                                        <p>{item.hook || "Untitled Content"}</p>
                                        {(item.series || item.batches) && (
                                          <p className="text-xs text-muted-foreground">
                                            {item.series?.name && `${item.series.name}`}
                                            {item.series && item.batches && " • "}
                                            {item.batches?.name}
                                          </p>
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <Badge className={getStageColor(item.production_stage)} variant="outline">
                                        {item.production_stage}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>{item.creators?.name}</TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                      {item.created_by_profile
                                        ? `${item.created_by_profile.first_name} ${item.created_by_profile.last_name}`
                                        : "Unknown"}
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex flex-col gap-1">
                                        {item.content_content_pillars?.map((ccp, idx) => (
                                          <span key={idx} className="text-xs">
                                            {ccp.content_pillars.name}
                                          </span>
                                        ))}
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex flex-wrap gap-2">
                                        {item.content_platforms?.map((cp, idx) => {
                                          const platformName = cp.platforms.name.toLowerCase()
                                          let iconPath = ""

                                          if (platformName.includes("youtube")) {
                                            iconPath = "/icons/youtube.svg"
                                          } else if (platformName === "tiktok") {
                                            iconPath = "/icons/tiktok.svg"
                                          } else if (platformName === "instagram") {
                                            iconPath = "/icons/instagram.svg"
                                          } else if (platformName === "x" || platformName === "twitter") {
                                            iconPath = "/icons/x.svg"
                                          } else if (platformName === "linkedin") {
                                            iconPath = "/icons/linkedin.svg"
                                          } else if (platformName === "facebook") {
                                            iconPath = "/icons/facebook.svg"
                                          }

                                          return iconPath ? (
                                            <img
                                              key={idx}
                                              src={iconPath || "/placeholder.svg"}
                                              alt={cp.platforms.name}
                                              className="size-5"
                                            />
                                          ) : (
                                            <span key={idx} className="text-xs">
                                              {cp.platforms.name}
                                            </span>
                                          )
                                        })}
                                      </div>
                                    </TableCell>
                                    <TableCell className="capitalize">{item.format}</TableCell>
                                  </TableRow>
                                  {isExpanded && (
                                    <TableRow className="hover:bg-transparent">
                                      <TableCell
                                        colSpan={8}
                                        className="bg-accent/5 hover:bg-accent/10 transition-colors p-0"
                                      >
                                        <div className="p-6">
                                          <h4 className="font-semibold text-lg mb-4">
                                            Additional Details for "{item.hook || "Untitled Content"}"
                                          </h4>

                                          {/* Scripting - Full Width Top Section */}
                                          <Card className="mb-4 py-0">
                                            <CardContent className="px-4 py-4 space-y-3">
                                              <div className="flex items-center justify-between">
                                                <h5 className="font-semibold">Scripting</h5>
                                                <Button
                                                  size="sm"
                                                  variant="outline"
                                                  className="gap-1.5 bg-white"
                                                  onClick={(e) => {
                                                    e.stopPropagation()
                                                    router.push(`/scripting?content=${item.id}`)
                                                  }}
                                                >
                                                  <FileText className="size-4" />
                                                  <span className="text-xs">Script</span>
                                                </Button>
                                              </div>
                                              <div className="text-sm">
                                                {item.script_scenes && item.script_scenes.length > 0 ? (
                                                  <div className="border rounded-md overflow-hidden">
                                                    <Table>
                                                      <TableHeader>
                                                        <TableRow className="bg-accent hover:bg-accent">
                                                          <TableHead className="w-12 text-center text-white font-semibold">
                                                            #
                                                          </TableHead>
                                                          <TableHead className="text-white font-semibold bg-primary">
                                                            Audio (What to say)
                                                          </TableHead>
                                                          <TableHead className="text-white font-semibold bg-accent/20 text-primary">
                                                            Visuals (What to show)
                                                          </TableHead>
                                                        </TableRow>
                                                      </TableHeader>
                                                      <TableBody>
                                                        {item.script_scenes
                                                          .sort((a, b) => a.scene_number - b.scene_number)
                                                          .map((scene) => (
                                                            <TableRow key={scene.id} className="hover:bg-transparent">
                                                              <TableCell className="text-center text-muted-foreground font-medium">
                                                                {scene.scene_number}
                                                              </TableCell>
                                                              <TableCell className="border-l border-r border-border">
                                                                <p className="text-primary whitespace-pre-wrap">
                                                                  {scene.audio_script || "-"}
                                                                </p>
                                                              </TableCell>
                                                              <TableCell className="border-r border-border">
                                                                <p className="text-[hsl(var(--theme-accent-dark))] whitespace-pre-wrap">
                                                                  {scene.visuals || "-"}
                                                                </p>
                                                              </TableCell>
                                                            </TableRow>
                                                          ))}
                                                      </TableBody>
                                                    </Table>
                                                  </div>
                                                ) : (
                                                  <p className="text-muted-foreground text-sm">
                                                    No scenes created yet. Click "Script" to add scenes.
                                                  </p>
                                                )}
                                              </div>
                                              {item.cta && (
                                                <div className="pt-2">
                                                  <span className="text-muted-foreground font-semibold">CTA:</span>
                                                  <p className="mt-1">{item.cta}</p>
                                                </div>
                                              )}
                                              {((item.selected_broll && item.selected_broll.length > 0) ||
                                                (item.selected_sfx && item.selected_sfx.length > 0)) && (
                                                <div className="grid grid-cols-2 gap-4 pt-2">
                                                  {item.selected_broll && item.selected_broll.length > 0 && (
                                                    <div>
                                                      <span className="text-muted-foreground font-semibold">
                                                        B-Roll:
                                                      </span>
                                                      <p className="mt-1 text-muted-foreground text-xs">
                                                        {item.selected_broll.length} items
                                                      </p>
                                                    </div>
                                                  )}
                                                  {item.selected_sfx && item.selected_sfx.length > 0 && (
                                                    <div>
                                                      <span className="text-muted-foreground font-semibold">SFX:</span>
                                                      <p className="mt-1 text-muted-foreground text-xs">
                                                        {item.selected_sfx.length} items
                                                      </p>
                                                    </div>
                                                  )}
                                                </div>
                                              )}
                                            </CardContent>
                                          </Card>

                                          <div className="grid grid-cols-2 gap-4">
                                            {/* Content Details - Left Column */}
                                            <Card className="py-0">
                                              <CardContent className="px-4 py-4 space-y-2">
                                                <div className="flex items-center justify-between">
                                                  <h5 className="font-semibold">Content Details</h5>
                                                  <EditContentDialog
                                                    contentId={item.id}
                                                    workspaceId={workspaceId}
                                                    creators={creators}
                                                    onContentUpdated={() => loadContent(workspaceId)}
                                                    workspaceType={workspaceType}
                                                    trigger={
                                                      <Button size="sm" variant="outline" className="gap-1.5 bg-white">
                                                        <Pencil className="size-4" />
                                                        <span className="text-xs">Edit</span>
                                                      </Button>
                                                    }
                                                  />
                                                </div>
                                                <div className="space-y-2 text-sm">
                                                  <div>
                                                    <span className="text-muted-foreground">Content Style:</span>{" "}
                                                    <span className="font-medium">
                                                      {item.style
                                                        ? item.style
                                                            .split("_")
                                                            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                                                            .join(" ")
                                                        : "-"}
                                                    </span>
                                                  </div>
                                                  <div>
                                                    <span className="text-muted-foreground">4H Framework:</span>{" "}
                                                    <span className="font-medium">{item.four_hs?.name || "-"}</span>
                                                  </div>
                                                  {item.content_content_pillars?.[0]?.content_pillars?.name ===
                                                    "Storytelling" && (
                                                    <div>
                                                      <span className="text-muted-foreground">Storytelling Type:</span>{" "}
                                                      <span className="font-medium">
                                                        {item.storytelling_format || "-"}
                                                      </span>
                                                    </div>
                                                  )}
                                                  <div>
                                                    <span className="text-muted-foreground">Framework Day:</span>{" "}
                                                    <span className="font-medium">
                                                      {item.content_types
                                                        ? `${item.content_types.id} ${item.content_types.name} ${item.content_types.icon}`
                                                        : "-"}
                                                    </span>
                                                  </div>
                                                  <div>
                                                    <span className="text-muted-foreground">Created:</span>{" "}
                                                    <span className="font-medium">
                                                      {item.created_at
                                                        ? new Date(item.created_at).toLocaleString("en-AU", {
                                                            day: "2-digit",
                                                            month: "2-digit",
                                                            year: "numeric",
                                                            hour: "2-digit",
                                                            minute: "2-digit",
                                                            hour12: false,
                                                          })
                                                        : "-"}
                                                    </span>
                                                  </div>
                                                  <div>
                                                    <span className="text-muted-foreground">Last Updated:</span>{" "}
                                                    <span className="font-medium">
                                                      {item.updated_at
                                                        ? new Date(item.updated_at).toLocaleString("en-AU", {
                                                            day: "2-digit",
                                                            month: "2-digit",
                                                            year: "numeric",
                                                            hour: "2-digit",
                                                            minute: "2-digit",
                                                            hour12: false,
                                                          })
                                                        : "-"}
                                                    </span>
                                                  </div>
                                                  {item.updated_by_profile && (
                                                    <div>
                                                      <span className="text-muted-foreground">Updated By:</span>{" "}
                                                      <span className="font-medium">
                                                        {item.updated_by_profile.first_name}{" "}
                                                        {item.updated_by_profile.last_name}
                                                      </span>
                                                    </div>
                                                  )}
                                                </div>
                                              </CardContent>
                                            </Card>

                                            {/* Scheduled Events - Right Column */}
                                            <Card className="py-0">
                                              <CardContent className="px-4 py-4">
                                                <div className="flex items-center justify-between">
                                                  <h5 className="font-semibold">Scheduled Events</h5>
                                                  <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="gap-1.5 bg-white"
                                                    onClick={() => {
                                                      setSchedulingContentId(item.id)
                                                      setShowScheduleDialog(true)
                                                    }}
                                                  >
                                                    <Calendar className="size-4" />
                                                    <span className="text-xs">Schedule</span>
                                                  </Button>
                                                </div>
                                                {contentEvents.length > 0 ? (
                                                  <div className="mt-3 space-y-2">
                                                    <Table>
                                                      <TableHeader>
                                                        <TableRow className="bg-accent hover:bg-accent">
                                                          <TableHead className="text-xs h-8 py-1 text-white">
                                                            Date
                                                          </TableHead>
                                                          <TableHead className="text-xs h-8 py-1 text-white">
                                                            Time
                                                          </TableHead>
                                                          <TableHead className="text-xs h-8 py-1 text-white">
                                                            Title
                                                          </TableHead>
                                                          <TableHead className="text-xs h-8 py-1 text-white">
                                                            Category
                                                          </TableHead>
                                                        </TableRow>
                                                      </TableHeader>
                                                      <TableBody>
                                                        {contentEvents.map((event) => {
                                                          const colors = getCategoryColor(event.category)
                                                          const eventEnd = new Date(event.end_time)
                                                          const isPast = eventEnd < new Date()

                                                          return (
                                                            <TableRow
                                                              key={event.id}
                                                              className={`${colors.bg} ${colors.border} border ${isPast ? "opacity-50" : ""}`}
                                                            >
                                                              <TableCell
                                                                className={`text-xs py-2 ${colors.text} ${isPast ? "line-through" : ""}`}
                                                              >
                                                                {formatEventDate(event.start_time)}
                                                              </TableCell>
                                                              <TableCell
                                                                className={`text-xs py-2 ${colors.text} ${isPast ? "line-through" : ""}`}
                                                              >
                                                                {formatEventTime(event.start_time, event.end_time)}
                                                              </TableCell>
                                                              <TableCell
                                                                className={`text-xs py-2 ${colors.text} font-medium ${isPast ? "line-through" : ""}`}
                                                              >
                                                                {event.title}
                                                              </TableCell>
                                                              <TableCell className={`text-xs py-2`}>
                                                                <Badge
                                                                  className={`${colors.bg} ${colors.text} ${colors.border} ${isPast ? "line-through" : ""}`}
                                                                  variant="outline"
                                                                >
                                                                  {event.category}
                                                                </Badge>
                                                              </TableCell>
                                                            </TableRow>
                                                          )
                                                        })}
                                                      </TableBody>
                                                    </Table>
                                                  </div>
                                                ) : (
                                                  <div className="space-y-2 text-sm">
                                                    <p className="text-muted-foreground text-xs">
                                                      No scheduled events yet
                                                    </p>
                                                  </div>
                                                )}
                                              </CardContent>
                                            </Card>
                                          </div>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  )}
                                </React.Fragment>
                              )
                            })
                          ) : (
                            <TableRow>
                              <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-4">
                                No content in this batch yet
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      )
                    })}

                    {/* Unbatched content section */}
                    {unbatched.length > 0 && (
                      <>
                        <TableRow className="bg-accent/5 hover:bg-accent/5">
                          <TableCell colSpan={8} className="font-semibold text-sm py-2">
                            Unbatched Content
                          </TableCell>
                        </TableRow>
                        {unbatched.map((item) => {
                          const isExpanded = expandedRows.has(item.id)
                          const contentEvents = calendarEvents.filter((event) => event.content_id === item.id)

                          return (
                            <React.Fragment key={item.id}>
                              <TableRow
                                className="cursor-pointer hover:bg-accent/10 transition-colors"
                                onClick={() => toggleExpanded(item.id)}
                              >
                                <TableCell>
                                  <Button variant="ghost" size="sm" className="p-0 h-6 w-6">
                                    {isExpanded ? (
                                      <ChevronDown className="size-4" />
                                    ) : (
                                      <ChevronRight className="size-4" />
                                    )}
                                  </Button>
                                </TableCell>
                                <TableCell className="font-medium">
                                  <div className="space-y-1">
                                    <p>{item.hook || "Untitled Content"}</p>
                                    {(item.series || item.batches) && (
                                      <p className="text-xs text-muted-foreground">
                                        {item.series?.name && `${item.series.name}`}
                                        {item.series && item.batches && " • "}
                                        {item.batches?.name}
                                      </p>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge className={getStageColor(item.production_stage)} variant="outline">
                                    {item.production_stage}
                                  </Badge>
                                </TableCell>
                                <TableCell>{item.creators?.name}</TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {item.created_by_profile
                                    ? `${item.created_by_profile.first_name} ${item.created_by_profile.last_name}`
                                    : "Unknown"}
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-col gap-1">
                                    {item.content_content_pillars?.map((ccp, idx) => (
                                      <span key={idx} className="text-xs">
                                        {ccp.content_pillars.name}
                                      </span>
                                    ))}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-wrap gap-2">
                                    {item.content_platforms?.map((cp, idx) => {
                                      const platformName = cp.platforms.name.toLowerCase()
                                      let iconPath = ""

                                      if (platformName.includes("youtube")) {
                                        iconPath = "/icons/youtube.svg"
                                      } else if (platformName === "tiktok") {
                                        iconPath = "/icons/tiktok.svg"
                                      } else if (platformName === "instagram") {
                                        iconPath = "/icons/instagram.svg"
                                      } else if (platformName === "x" || platformName === "twitter") {
                                        iconPath = "/icons/x.svg"
                                      } else if (platformName === "linkedin") {
                                        iconPath = "/icons/linkedin.svg"
                                      } else if (platformName === "facebook") {
                                        iconPath = "/icons/facebook.svg"
                                      }

                                      return iconPath ? (
                                        <img
                                          key={idx}
                                          src={iconPath || "/placeholder.svg"}
                                          alt={cp.platforms.name}
                                          className="size-5"
                                        />
                                      ) : (
                                        <span key={idx} className="text-xs">
                                          {cp.platforms.name}
                                        </span>
                                      )
                                    })}
                                  </div>
                                </TableCell>
                                <TableCell className="capitalize">{item.format}</TableCell>
                              </TableRow>
                              {isExpanded && (
                                <TableRow className="hover:bg-transparent">
                                  <TableCell
                                    colSpan={8}
                                    className="bg-accent/5 hover:bg-accent/10 transition-colors p-0"
                                  >
                                    <div className="p-6">
                                      <h4 className="font-semibold text-lg mb-4">
                                        Additional Details for "{item.hook || "Untitled Content"}"
                                      </h4>

                                      {/* Scripting - Full Width Top Section */}
                                      <Card className="mb-4 py-0">
                                        <CardContent className="px-4 py-4 space-y-3">
                                          <div className="flex items-center justify-between">
                                            <h5 className="font-semibold">Scripting</h5>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className="gap-1.5 bg-white"
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                router.push(`/scripting?content=${item.id}`)
                                              }}
                                            >
                                              <FileText className="size-4" />
                                              <span className="text-xs">Script</span>
                                            </Button>
                                          </div>
                                          <div className="text-sm">
                                            {item.script_scenes && item.script_scenes.length > 0 ? (
                                              <div className="border rounded-md overflow-hidden">
                                                <Table>
                                                  <TableHeader>
                                                    <TableRow className="bg-accent hover:bg-accent">
                                                      <TableHead className="w-12 text-center text-white font-semibold">
                                                        #
                                                      </TableHead>
                                                      <TableHead className="text-white font-semibold bg-primary">
                                                        Audio (What to say)
                                                      </TableHead>
                                                      <TableHead className="text-white font-semibold bg-accent/20 text-primary">
                                                        Visuals (What to show)
                                                      </TableHead>
                                                    </TableRow>
                                                  </TableHeader>
                                                  <TableBody>
                                                    {item.script_scenes
                                                      .sort((a, b) => a.scene_number - b.scene_number)
                                                      .map((scene) => (
                                                        <TableRow key={scene.id} className="hover:bg-transparent">
                                                          <TableCell className="text-center text-muted-foreground font-medium">
                                                            {scene.scene_number}
                                                          </TableCell>
                                                          <TableCell className="border-l border-r border-border">
                                                            <p className="text-primary whitespace-pre-wrap">
                                                              {scene.audio_script || "-"}
                                                            </p>
                                                          </TableCell>
                                                          <TableCell className="border-r border-border">
                                                            <p className="text-[hsl(var(--theme-accent-dark))] whitespace-pre-wrap">
                                                              {scene.visuals || "-"}
                                                            </p>
                                                          </TableCell>
                                                        </TableRow>
                                                      ))}
                                                  </TableBody>
                                                </Table>
                                              </div>
                                            ) : (
                                              <p className="text-muted-foreground text-sm">
                                                No scenes created yet. Click "Script" to add scenes.
                                              </p>
                                            )}
                                          </div>
                                          {item.cta && (
                                            <div className="pt-2">
                                              <span className="text-muted-foreground font-semibold">CTA:</span>
                                              <p className="mt-1">{item.cta}</p>
                                            </div>
                                          )}
                                          {((item.selected_broll && item.selected_broll.length > 0) ||
                                            (item.selected_sfx && item.selected_sfx.length > 0)) && (
                                            <div className="grid grid-cols-2 gap-4 pt-2">
                                              {item.selected_broll && item.selected_broll.length > 0 && (
                                                <div>
                                                  <span className="text-muted-foreground font-semibold">B-Roll:</span>
                                                  <p className="mt-1 text-muted-foreground text-xs">
                                                    {item.selected_broll.length} items
                                                  </p>
                                                </div>
                                              )}
                                              {item.selected_sfx && item.selected_sfx.length > 0 && (
                                                <div>
                                                  <span className="text-muted-foreground font-semibold">SFX:</span>
                                                  <p className="mt-1 text-muted-foreground text-xs">
                                                    {item.selected_sfx.length} items
                                                  </p>
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </CardContent>
                                      </Card>

                                      <div className="grid grid-cols-2 gap-4">
                                        {/* Content Details - Left Column */}
                                        <Card className="py-0">
                                          <CardContent className="px-4 py-4 space-y-2">
                                            <div className="flex items-center justify-between">
                                              <h5 className="font-semibold">Content Details</h5>
                                              <EditContentDialog
                                                contentId={item.id}
                                                workspaceId={workspaceId}
                                                creators={creators}
                                                onContentUpdated={() => loadContent(workspaceId)}
                                                workspaceType={workspaceType}
                                                trigger={
                                                  <Button size="sm" variant="outline" className="gap-1.5 bg-white">
                                                    <Pencil className="size-4" />
                                                    <span className="text-xs">Edit</span>
                                                  </Button>
                                                }
                                              />
                                            </div>
                                            <div className="space-y-2 text-sm">
                                              <div>
                                                <span className="text-muted-foreground">Content Style:</span>{" "}
                                                <span className="font-medium">
                                                  {item.style
                                                    ? item.style
                                                        .split("_")
                                                        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                                                        .join(" ")
                                                    : "-"}
                                                </span>
                                              </div>
                                              <div>
                                                <span className="text-muted-foreground">4H Framework:</span>{" "}
                                                <span className="font-medium">{item.four_hs?.name || "-"}</span>
                                              </div>
                                              {item.content_content_pillars?.[0]?.content_pillars?.name ===
                                                "Storytelling" && (
                                                <div>
                                                  <span className="text-muted-foreground">Storytelling Type:</span>{" "}
                                                  <span className="font-medium">{item.storytelling_format || "-"}</span>
                                                </div>
                                              )}
                                              <div>
                                                <span className="text-muted-foreground">Framework Day:</span>{" "}
                                                <span className="font-medium">
                                                  {item.content_types
                                                    ? `${item.content_types.id} ${item.content_types.name} ${item.content_types.icon}`
                                                    : "-"}
                                                </span>
                                              </div>
                                              <div>
                                                <span className="text-muted-foreground">Created:</span>{" "}
                                                <span className="font-medium">
                                                  {item.created_at
                                                    ? new Date(item.created_at).toLocaleString("en-AU", {
                                                        day: "2-digit",
                                                        month: "2-digit",
                                                        year: "numeric",
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                        hour12: false,
                                                      })
                                                    : "-"}
                                                </span>
                                              </div>
                                              <div>
                                                <span className="text-muted-foreground">Last Updated:</span>{" "}
                                                <span className="font-medium">
                                                  {item.updated_at
                                                    ? new Date(item.updated_at).toLocaleString("en-AU", {
                                                        day: "2-digit",
                                                        month: "2-digit",
                                                        year: "numeric",
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                        hour12: false,
                                                      })
                                                    : "-"}
                                                </span>
                                              </div>
                                              {item.updated_by_profile && (
                                                <div>
                                                  <span className="text-muted-foreground">Updated By:</span>{" "}
                                                  <span className="font-medium">
                                                    {item.updated_by_profile.first_name}{" "}
                                                    {item.updated_by_profile.last_name}
                                                  </span>
                                                </div>
                                              )}
                                            </div>
                                          </CardContent>
                                        </Card>

                                        {/* Scheduled Events - Right Column */}
                                        <Card className="py-0">
                                          <CardContent className="px-4 py-4">
                                            <div className="flex items-center justify-between">
                                              <h5 className="font-semibold">Scheduled Events</h5>
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                className="gap-1.5 bg-white"
                                                onClick={() => {
                                                  setSchedulingContentId(item.id)
                                                  setShowScheduleDialog(true)
                                                }}
                                              >
                                                <Calendar className="size-4" />
                                                <span className="text-xs">Schedule</span>
                                              </Button>
                                            </div>
                                            {contentEvents.length > 0 ? (
                                              <div className="mt-3 space-y-2">
                                                <Table>
                                                  <TableHeader>
                                                    <TableRow className="bg-accent hover:bg-accent">
                                                      <TableHead className="text-xs h-8 py-1 text-white">
                                                        Date
                                                      </TableHead>
                                                      <TableHead className="text-xs h-8 py-1 text-white">
                                                        Time
                                                      </TableHead>
                                                      <TableHead className="text-xs h-8 py-1 text-white">
                                                        Title
                                                      </TableHead>
                                                      <TableHead className="text-xs h-8 py-1 text-white">
                                                        Category
                                                      </TableHead>
                                                    </TableRow>
                                                  </TableHeader>
                                                  <TableBody>
                                                    {contentEvents.map((event) => {
                                                      const colors = getCategoryColor(event.category)
                                                      const eventEnd = new Date(event.end_time)
                                                      const isPast = eventEnd < new Date()

                                                      return (
                                                        <TableRow
                                                          key={event.id}
                                                          className={`${colors.bg} ${colors.border} border ${isPast ? "opacity-50" : ""}`}
                                                        >
                                                          <TableCell
                                                            className={`text-xs py-2 ${colors.text} ${isPast ? "line-through" : ""}`}
                                                          >
                                                            {formatEventDate(event.start_time)}
                                                          </TableCell>
                                                          <TableCell
                                                            className={`text-xs py-2 ${colors.text} ${isPast ? "line-through" : ""}`}
                                                          >
                                                            {formatEventTime(event.start_time, event.end_time)}
                                                          </TableCell>
                                                          <TableCell
                                                            className={`text-xs py-2 ${colors.text} font-medium ${isPast ? "line-through" : ""}`}
                                                          >
                                                            {event.title}
                                                          </TableCell>
                                                          <TableCell className={`text-xs py-2`}>
                                                            <Badge
                                                              className={`${colors.bg} ${colors.text} ${colors.border} ${isPast ? "line-through" : ""}`}
                                                              variant="outline"
                                                            >
                                                              {event.category}
                                                            </Badge>
                                                          </TableCell>
                                                        </TableRow>
                                                      )
                                                    })}
                                                  </TableBody>
                                                </Table>
                                              </div>
                                            ) : (
                                              <div className="space-y-2 text-sm">
                                                <p className="text-muted-foreground text-xs">No scheduled events yet</p>
                                              </div>
                                            )}
                                          </CardContent>
                                        </Card>
                                      </div>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )}
                            </React.Fragment>
                          )
                        })}
                      </>
                    )}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="py-12 text-center">
                <p className="text-muted-foreground mb-4">"No content yet. Create your first piece!"</p>
                <CreateContentDialog
                  workspaceId={workspaceId}
                  creators={creators}
                  onContentCreated={() => loadContent(workspaceId)}
                  workspaceType={workspaceType}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Footer />

      {showScheduleDialog && (
        <CreateEventDialog
          workspaceId={workspaceId}
          open={showScheduleDialog}
          onOpenChange={setShowScheduleDialog}
          initialContentId={schedulingContentId}
        />
      )}
    </div>
  )
}
