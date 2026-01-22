"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { AppNav } from "@/components/app-nav"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, ChevronDown, ChevronRight, CopyPlus } from "lucide-react"
import { ComposedChart, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { CreateResearchDialog } from "@/components/create-research-dialog"
import { EditResearchDialog } from "@/components/edit-research-dialog"
import { UpdateResearchMetricsDialog } from "@/components/update-research-metrics-dialog"
import { CreateContentDialog } from "@/components/create-content-dialog"
import type { Research, Platform, Creator } from "@/lib/types/database"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import Loading from "./loading"

interface ResearchWithDetails extends Research {
  platforms: { id: string; name: string }
  content_pillars: { id: string; name: string } | null
}

export default function ResearchPage() {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [workspaceId, setWorkspaceId] = useState<string>("")
  const [research, setResearch] = useState<ResearchWithDetails[]>([])
  const [workspacePlatforms, setWorkspacePlatforms] = useState<Platform[]>([])
  const [contentPillars, setContentPillars] = useState<any[]>([])
  const [creators, setCreators] = useState<Creator[]>([])
  const [workspaceType, setWorkspaceType] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [showTemplatiseDialog, setShowTemplatiseDialog] = useState(false)
  const [templatisingResearch, setTemplatisingResearch] = useState<ResearchWithDetails | null>(null)
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [selectedVirality, setSelectedVirality] = useState<string>("all")
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all")
  const [selectedPillar, setSelectedPillar] = useState<string>("all")
  const [selectedHookType, setSelectedHookType] = useState<string>("all")
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [trendData, setTrendData] = useState<Record<string, any[]>>({})

  const searchParams = useSearchParams()

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

    // Load workspace type
    const { data: workspaceData } = await supabase
      .from("workspaces")
      .select("workspace_type")
      .eq("id", membership.workspace_id)
      .single()

    if (workspaceData) {
      setWorkspaceType(workspaceData.workspace_type)
    }

    // Load creators
    const { data: creatorsData } = await supabase
      .from("creators")
      .select("*")
      .eq("workspace_id", membership.workspace_id)
      .order("name")

    if (creatorsData) {
      setCreators(creatorsData)
    }

    const creatorIds = creatorsData?.map((c) => c.id) || []

    if (creatorIds.length > 0) {
      const { data: workspacePlatformsData } = await supabase
        .from("creator_platforms")
        .select(`
          platform_id,
          platforms (*)
        `)
        .in("creator_id", creatorIds)

      if (workspacePlatformsData && workspacePlatformsData.length > 0) {
        // Extract unique platforms
        const uniquePlatforms = Array.from(
          new Map(
            workspacePlatformsData
              .map((cp: any) => cp.platforms)
              .filter((p: any) => p !== null)
              .map((p: Platform) => [p.id, p]),
          ).values(),
        ) as Platform[]
        setWorkspacePlatforms(uniquePlatforms)
      }
    }

    const { data: pillarsData, error: pillarsError } = await supabase
      .from("content_pillars")
      .select(`
        *,
        content_styles_reference(
          id,
          style_name,
          style_value,
          description
        )
      `)
      .order("name")

    console.log("[v0] Content pillars query result:", { data: pillarsData, error: pillarsError })
    if (pillarsData) {
      const pillarsWithStyles = pillarsData.map((pillar: any) => ({
        ...pillar,
        styles: pillar.content_styles_reference || [],
      }))
      setContentPillars(pillarsWithStyles)
    }

    await loadResearch(membership.workspace_id)
  }

  const loadResearch = async (workspaceId: string) => {
    console.log("[v0] loadResearch called for workspace:", workspaceId)
    setIsLoading(true)
    const { data, error } = await supabase
      .from("research")
      .select(`
        *,
        platforms(id, name),
        content_pillars(id, name)
      `)
      .eq("workspace_id", workspaceId)
      .order("updated_at", { ascending: false })

    console.log("[v0] loadResearch result:", { data, error, count: data?.length })

    console.log("[v0] loadResearch result:", { data, error, count: data?.length })

    if (error) {
      console.error("[v0] Error loading research:", error)
      console.error("[v0] Error details:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
    }

    // Force fresh data by adding a timestamp parameter (workaround for potential caching)
    // .order("updated_at", { ascending: false })

    console.log("[v0] loadResearch result:", { data, error, count: data?.length })

    if (error) {
      console.error("[v0] Error loading research:", error)
    } else if (data) {
      setResearch(data as ResearchWithDetails[])
      console.log("[v0] Research state updated with", data.length, "items")

      // Load trend data for any currently expanded rows
      expandedRows.forEach(researchId => {
        loadTrendData(researchId)
      })
    }
    setIsLoading(false)
  }

  const getViralityColor = (level: string) => {
    switch (level) {
      case "blockbuster":
        return "bg-green-600 text-white" // >=10x - green
      case "viral":
        return "bg-lime-600 text-white" // 5-10x - lime/yellow-green
      case "breakout":
        return "bg-yellow-600 text-white" // 2-5x - yellow
      case "steady":
        return "bg-orange-600 text-white" // 1-2x - orange
      case "dormant":
        return "bg-red-600 text-white" // <1x - red
      default:
        return "bg-gray-200"
    }
  }

  const formatViewsInMillions = (views: number | null) => {
    if (!views) return "-"
    const millions = views / 1000000
    return `${millions.toFixed(1)}M`
  }

  const formatStyleName = (style: string) => {
    return style
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  }

  const getPlatformIcon = (platformName: string) => {
    const name = platformName.toLowerCase()
    if (name.includes("youtube")) return "/icons/youtube.svg"
    if (name === "tiktok") return "/icons/tiktok.svg"
    if (name === "instagram") return "/icons/instagram.svg"
    if (name === "x" || name === "twitter") return "/icons/x.svg"
    if (name === "linkedin") return "/icons/linkedin.svg"
    if (name === "facebook") return "/icons/facebook.svg"
    return null
  }

  const filteredResearch = research.filter((item) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesSearch =
        item.creator_username?.toLowerCase().includes(query) ||
        item.platforms?.name?.toLowerCase().includes(query) ||
        item.content_pillars?.name?.toLowerCase().includes(query) ||
        item.hook?.toLowerCase().includes(query) ||
        item.hook_type?.toLowerCase().includes(query)

      if (!matchesSearch) return false
    }

    // Virality filter
    if (selectedVirality !== "all" && item.virality_level !== selectedVirality) {
      return false
    }

    // Platform filter
    if (selectedPlatform !== "all" && item.platforms?.name !== selectedPlatform) {
      return false
    }

    // Pillar filter
    if (selectedPillar !== "all" && item.content_pillars?.name !== selectedPillar) {
      return false
    }

    // Hook type filter
    if (selectedHookType !== "all" && item.hook_type !== selectedHookType) {
      return false
    }

    return true
  })

  const toggleExpanded = (researchId: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(researchId)) {
        newSet.delete(researchId)
      } else {
        newSet.add(researchId)
        // Load trend data when expanding
        loadTrendData(researchId)
      }
      return newSet
    })
  }

  const loadTrendData = async (researchId: string) => {
    try {
      const { data, error } = await supabase
        .from("research_trends")
        .select("*")
        .eq("research_id", researchId)
        .order("created_at", { ascending: true })

      if (error) {
        console.error("[v0] Error loading trend data:", error)
        return
      }

      if (data && data.length > 0) {
        // Get research item to get posting date and initial followers
        const researchItem = research.find(r => r.id === researchId)
        const postingDate = researchItem?.created_at ? new Date(researchItem.created_at) : new Date()

        // Create start of posting day (00:00) with 0 views, 0 likes, actual followers
        const startOfDay = new Date(postingDate)
        startOfDay.setHours(0, 0, 0, 0)

        // Prepare chart data starting with 0 point
        const chartData = [
          {
            time: "00:00",
            timestamp: startOfDay.getTime(),
            views: 0,
            likes: 0,
            followers: researchItem?.followers || 0,
            date: startOfDay.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric'
            }),
            isStartPoint: true
          }
        ]

        // Add all historical points (use created_at for actual creation time, not recorded_at which might be posting date)
        const historicalPoints = data.map((point, index) => {
          const createdAt = new Date(point.created_at || point.recorded_at)
          console.log(`[v0] Trend point ${index}:`, {
            created_at_raw: point.created_at,
            created_at_parsed: createdAt.toLocaleString(),
            recorded_at_raw: point.recorded_at,
            time: createdAt.toLocaleTimeString(),
            views: point.views,
            likes: point.likes
          })
          
          return {
            time: createdAt.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false
            }),
            timestamp: createdAt.getTime(),
            views: point.views,
            likes: point.likes,
            followers: point.followers,
            date: createdAt.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric'
            }),
            isStartPoint: false
          }
        })

        // Ensure proper ordering - baseline first, then historical points

        chartData.push(...historicalPoints)

        // Sort by timestamp to ensure chronological order
        chartData.sort((a, b) => a.timestamp - b.timestamp)

        // Prepare data with dashed baseline connection values
        // Create separate data keys for dashed line (baseline to first point only)
        const chartDataWithDashed = chartData.map((point, index) => {
          if (index === 0 || index === 1) {
            // Baseline point and first real point - show in both dashed and solid
            return {
              ...point,
              viewsDashed: point.views,
              likesDashed: point.likes
            }
          } else {
            // Subsequent points - only in solid line (null for dashed)
            return {
              ...point,
              viewsDashed: null,
              likesDashed: null
            }
          }
        })

        setTrendData(prev => ({
          ...prev,
          [researchId]: chartDataWithDashed
        }))
      }
    } catch (error) {
      console.error("[v0] Error in loadTrendData:", error)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <AppNav userEmail={user?.email} />

      <Suspense fallback={<Loading />}>
        <main className="container mx-auto p-6 space-y-6">
          {/* Desktop: Title with description */}
          <div className="hidden sm:flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Research</h1>
              <p className="text-muted-foreground">Deconstruct viral content and learn what works</p>
            </div>
            <CreateResearchDialog
              workspaceId={workspaceId}
              workspacePlatforms={workspacePlatforms}
              contentPillars={contentPillars}
              onResearchCreated={() => loadResearch(workspaceId)}
            />
          </div>

          {/* Mobile: Create button only */}
          <div className="sm:hidden flex items-center">
            <CreateResearchDialog
              workspaceId={workspaceId}
              workspacePlatforms={workspacePlatforms}
              contentPillars={contentPillars}
              onResearchCreated={() => loadResearch(workspaceId)}
            />
          </div>

          {/* Mobile: Search bar full width, filters below in 2x2 grid */}
          <div className="sm:hidden space-y-3">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search by creator, platform, pillar, hook..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-white w-full"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Select value={selectedVirality} onValueChange={setSelectedVirality}>
                <SelectTrigger className="w-full hover:bg-accent/20 transition-colors bg-white">
                  <SelectValue placeholder="Virality" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Virality</SelectItem>
                  <SelectItem value="blockbuster">Blockbuster</SelectItem>
                  <SelectItem value="viral">Viral</SelectItem>
                  <SelectItem value="breakout">Breakout</SelectItem>
                  <SelectItem value="steady">Steady</SelectItem>
                  <SelectItem value="dormant">Dormant</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                <SelectTrigger className="w-full hover:bg-accent/20 transition-colors bg-white">
                  <SelectValue placeholder="Platform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Platforms</SelectItem>
                  {workspacePlatforms.map((platform) => (
                    <SelectItem key={platform.id} value={platform.name}>
                      {platform.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedPillar} onValueChange={setSelectedPillar}>
                <SelectTrigger className="w-full hover:bg-accent/20 transition-colors bg-white">
                  <SelectValue placeholder="Pillar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Pillars</SelectItem>
                  {contentPillars.map((pillar) => (
                    <SelectItem key={pillar.id} value={pillar.name}>
                      {pillar.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedHookType} onValueChange={setSelectedHookType}>
                <SelectTrigger className="w-full hover:bg-accent/20 transition-colors bg-white">
                  <SelectValue placeholder="Hook Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Hooks</SelectItem>
                  <SelectItem value="written">Written</SelectItem>
                  <SelectItem value="visual">Visual</SelectItem>
                  <SelectItem value="verbal">Verbal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Desktop: Search bar and filters on same row */}
          <div className="hidden sm:flex items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search by creator, platform, pillar, hook..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-white"
              />
            </div>

            <Select value={selectedVirality} onValueChange={setSelectedVirality}>
              <SelectTrigger className="w-[130px] hover:bg-accent/20 transition-colors bg-white">
                <SelectValue placeholder="Virality" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Virality</SelectItem>
                <SelectItem value="blockbuster">Blockbuster</SelectItem>
                <SelectItem value="viral">Viral</SelectItem>
                <SelectItem value="breakout">Breakout</SelectItem>
                <SelectItem value="steady">Steady</SelectItem>
                <SelectItem value="dormant">Dormant</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
              <SelectTrigger className="w-[145px] hover:bg-accent/20 transition-colors bg-white">
                <SelectValue placeholder="Platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Platforms</SelectItem>
                {workspacePlatforms.map((platform) => (
                  <SelectItem key={platform.id} value={platform.name}>
                    {platform.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedPillar} onValueChange={setSelectedPillar}>
              <SelectTrigger className="w-[130px] hover:bg-accent/20 transition-colors bg-white">
                <SelectValue placeholder="Pillar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Pillars</SelectItem>
                {contentPillars.map((pillar) => (
                  <SelectItem key={pillar.id} value={pillar.name}>
                    {pillar.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedHookType} onValueChange={setSelectedHookType}>
              <SelectTrigger className="w-[130px] hover:bg-accent/20 transition-colors bg-white">
                <SelectValue placeholder="Hook Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Hooks</SelectItem>
                <SelectItem value="written">Written</SelectItem>
                <SelectItem value="visual">Visual</SelectItem>
                <SelectItem value="verbal">Verbal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="border rounded-lg overflow-hidden bg-white">
            <Table>
              <TableHeader>
                <TableRow className="bg-accent hover:bg-accent">
                  <TableHead className="text-white w-8"></TableHead>
                  <TableHead className="text-white w-24">Thumbnail</TableHead>
                  <TableHead className="text-white w-20 text-center">Platform</TableHead>
                  <TableHead className="text-white w-28">Creator</TableHead>
                  <TableHead className="text-white w-24">Views</TableHead>
                  <TableHead className="text-white w-28">Virality</TableHead>
                  <TableHead className="text-white w-32">Pillar</TableHead>
                  <TableHead className="text-white w-32">Style</TableHead>
                  <TableHead className="text-white">Hook</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      Loading research...
                    </TableCell>
                  </TableRow>
                ) : filteredResearch.length > 0 ? (
                  filteredResearch.map((item) => {
                    const platformIcon = getPlatformIcon(item.platforms.name)
                    const isExpanded = expandedRows.has(item.id)
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
                          <TableCell className="py-0">
                            {item.thumbnail_url && item.link ? (
                              <a
                                href={item.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <img
                                  src={item.thumbnail_url || "/placeholder.svg"}
                                  alt="Video thumbnail"
                                  className="w-20 h-auto object-cover"
                                  style={{ aspectRatio: "3/4" }}
                                />
                              </a>
                            ) : item.thumbnail_url ? (
                              <img
                                src={item.thumbnail_url || "/placeholder.svg"}
                                alt="Video thumbnail"
                                className="w-20 h-auto object-cover"
                                style={{ aspectRatio: "3/4" }}
                              />
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {platformIcon ? (
                              <div className="flex items-center justify-center">
                                <img
                                  src={platformIcon || "/placeholder.svg"}
                                  alt={item.platforms.name}
                                  className="size-8"
                                />
                              </div>
                            ) : (
                              <span className="text-xs">{item.platforms.name}</span>
                            )}
                          </TableCell>
                          <TableCell className="font-bold">
                            {item.creator_username ? `@${item.creator_username}` : "-"}
                          </TableCell>
                          <TableCell>{formatViewsInMillions(item.views)}</TableCell>
                          <TableCell>
                            {item.virality_level && (
                              <Badge className={getViralityColor(item.virality_level)}>{item.virality_level}</Badge>
                            )}
                          </TableCell>
                          <TableCell>{item.content_pillars?.name || "-"}</TableCell>
                          <TableCell>{item.content_style ? formatStyleName(item.content_style) : "-"}</TableCell>
                          <TableCell className="max-w-md">
                            {item.hook ? (
                              <span>
                                {item.hook_type && (
                                  <>
                                    <span className="font-bold capitalize">{item.hook_type}</span>
                                    {": "}
                                  </>
                                )}
                                <span className="truncate">{item.hook}</span>
                              </span>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow className="hover:bg-transparent">
                            <TableCell
                              colSpan={9}
                              className="bg-accent/5 hover:bg-accent/10 transition-colors p-0"
                            >
                              <div className="p-6">
                                <div className="grid grid-cols-2 gap-6 h-full">
                                  {/* Left Column - Content Details and Timestamps */}
                                  <div className="flex flex-col space-y-4">
                                    <div className="flex-1">
                                      <div>
                                        <h5 className="font-semibold mb-3">Content Details</h5>
                                        <div className="space-y-2 text-sm">
                                          <div>
                                            <span className="text-muted-foreground">Format:</span>{" "}
                                            <span className="font-medium capitalize">{item.content_format || item.format || "Unknown"}</span>
                                          </div>
                                          <div>
                                            <span className="text-muted-foreground">Production:</span>{" "}
                                            <span className="font-medium">{
                                              item.production_elements ||
                                              [item.has_sfx && "SFX", item.has_broll && "B-Roll", item.has_music && "Music"]
                                                .filter(Boolean)
                                                .join(", ") ||
                                              "Not specified"
                                            }</span>
                                          </div>
                                          <div>
                                            <span className="text-muted-foreground">Avg Clip Length:</span>{" "}
                                            <span className="font-medium">{(item.average_clip_seconds || item.avg_seconds_per_clip) ? `${item.average_clip_seconds || item.avg_seconds_per_clip}s` : "-"}</span>
                                          </div>
                                          {item.link && (
                                            <div>
                                              <span className="text-muted-foreground">Video Link:</span>{" "}
                                              <a
                                                href={item.link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="font-medium text-primary hover:text-primary/80 underline"
                                              >
                                                View Original
                                              </a>
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      <div className="pt-4">
                                        <h5 className="font-semibold mb-3">Timestamps</h5>
                                        <div className="space-y-2 text-sm">
                                          <div>
                                            <span className="text-muted-foreground">Posted:</span>{" "}
                                            <span className="font-medium">
                                              {item.created_at
                                                ? new Date(item.created_at).toLocaleDateString("en-AU", {
                                                    day: "2-digit",
                                                    month: "2-digit",
                                                    year: "numeric",
                                                  })
                                                : "-"}
                                            </span>
                                          </div>
                                          <div>
                                            <span className="text-muted-foreground">Last Updated:</span>{" "}
                                            <span className="font-medium">
                                              {item.updated_at
                                                ? new Date(item.updated_at).toLocaleDateString("en-AU", {
                                                    day: "2-digit",
                                                    month: "2-digit",
                                                    year: "numeric",
                                                  })
                                                : "-"}
                                            </span>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Followers with change since first recording */}
                                      {trendData[item.id] && trendData[item.id].length > 1 && (() => {
                                        const firstRecording = trendData[item.id].find((point: any) => !point.isStartPoint)
                                        const latestRecording = trendData[item.id][trendData[item.id].length - 1]
                                        const firstFollowers = firstRecording?.followers || item.followers || 0
                                        const latestFollowers = latestRecording?.followers || item.followers || 0
                                        const followerChange = latestFollowers - firstFollowers

                                        const formatNumber = (num: number) => {
                                          if (num >= 1000000) {
                                            return `${(num / 1000000).toFixed(1)}M`
                                          } else if (num >= 1000) {
                                            return `${(num / 1000).toFixed(1)}k`
                                          }
                                          return num.toString()
                                        }

                                        return (
                                          <div className="pt-4">
                                            <div className="text-sm">
                                              <span className="font-semibold">Followers:</span>{" "}
                                              <span className="font-medium">{formatNumber(latestFollowers)}</span>{" "}
                                              <span className={`font-medium ${followerChange >= 0 ? "text-green-600" : "text-red-600"}`}>
                                                ({followerChange >= 0 ? "+" : ""}{formatNumber(Math.abs(followerChange))} since first record)
                                              </span>
                                            </div>
                                          </div>
                                        )
                                      })()}
                                    </div>
                                    {/* Edit and Templatise buttons at bottom left */}
                                    <div className="flex justify-start gap-2 mt-auto">
                                      <div className="[&_button]:bg-accent [&_button]:hover:bg-accent/90 [&_button]:text-accent-foreground">
                                        <EditResearchDialog
                                          research={item}
                                          workspaceId={workspaceId}
                                          workspacePlatforms={workspacePlatforms}
                                          contentPillars={contentPillars}
                                          onResearchUpdated={() => {
                                            loadResearch(workspaceId)
                                          }}
                                        />
                                      </div>
                                      <Button
                                        size="sm"
                                        className="bg-primary hover:bg-primary/90 text-white"
                                        onClick={() => {
                                          setTemplatisingResearch(item)
                                          setShowTemplatiseDialog(true)
                                        }}
                                      >
                                        <CopyPlus className="mr-2 size-4" />
                                        Templatise
                                      </Button>
                                    </div>
                                  </div>

                                  {/* Right Column - Growth Chart */}
                                  <div className="flex flex-col space-y-4 h-full">
                                    <div className="flex-1">
                                      <div className="h-full min-h-0">
                                        {trendData[item.id] && trendData[item.id].length > 1 ? (
                                          <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={trendData[item.id]}>
                                              <CartesianGrid strokeDasharray="3 3" />
                                              <XAxis
                                                dataKey="timestamp"
                                                type="number"
                                                scale="time"
                                                domain={['dataMin', 'dataMax']}
                                                fontSize={12}
                                                tick={{ fill: '#666' }}
                                                tickFormatter={(timestamp) => {
                                                  const date = new Date(timestamp)
                                                  return date.toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric'
                                                  })
                                                }}
                                              />
                                              <YAxis
                                                yAxisId="left"
                                                orientation="left"
                                                fontSize={12}
                                                tick={{ fill: '#666' }}
                                                tickFormatter={(value) => {
                                                  if (value >= 1000000) {
                                                    return `${(value / 1000000).toFixed(1)}M`
                                                  } else if (value >= 1000) {
                                                    return `${Math.round(value / 1000)}K`
                                                  }
                                                  return value.toString()
                                                }}
                                                label={{ value: 'Views', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: 'var(--color-primary)' } }}
                                              />
                                              <YAxis
                                                yAxisId="right"
                                                orientation="right"
                                                fontSize={12}
                                                tick={{ fill: '#666' }}
                                                tickFormatter={(value) => {
                                                  if (value >= 1000000) {
                                                    return `${(value / 1000000).toFixed(1)}M`
                                                  } else if (value >= 1000) {
                                                    return `${Math.round(value / 1000)}K`
                                                  }
                                                  return value.toString()
                                                }}
                                                label={{ value: 'Likes', angle: 90, position: 'insideRight', style: { textAnchor: 'middle', fill: 'var(--color-accent)' } }}
                                              />
                                              <Tooltip
                                                labelStyle={{ color: '#000' }}
                                                contentStyle={{
                                                  backgroundColor: '#fff',
                                                  border: '1px solid #ccc',
                                                  borderRadius: '4px'
                                                }}
                                                formatter={(value, name, props) => {
                                                  // Skip tooltip for dashed lines
                                                  if (name === 'viewsDashed' || name === 'likesDashed') {
                                                    return null
                                                  }
                                                  
                                                  let formattedValue = value
                                                  if (typeof value === 'number') {
                                                    if (value >= 1000000) {
                                                      formattedValue = `${(value / 1000000).toFixed(1)}M`
                                                    } else if (value >= 1000) {
                                                      formattedValue = `${Math.round(value / 1000)}K`
                                                    }
                                                  }

                                                  const label = name === 'views' ? 'Views' : 'Likes'

                                                  return [
                                                    formattedValue,
                                                    label
                                                  ]
                                                }}
                                                labelFormatter={(label, payload) => {
                                                  if (payload && payload[0]?.payload) {
                                                    const payloadData = payload[0].payload
                                                    const isStartPoint = payloadData.isStartPoint
                                                    
                                                    // For baseline/start point, show the posting date
                                                    if (isStartPoint) {
                                                      const timestamp = payloadData.timestamp
                                                      if (timestamp) {
                                                        const date = new Date(timestamp)
                                                        return date.toLocaleDateString('en-US', {
                                                          month: 'short',
                                                          day: 'numeric',
                                                          year: 'numeric'
                                                        })
                                                      }
                                                    }
                                                    
                                                    // Format the timestamp to readable date/time
                                                    const timestamp = payloadData.timestamp
                                                    if (timestamp) {
                                                      const date = new Date(timestamp)
                                                      return date.toLocaleString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                        hour12: false
                                                      })
                                                    }
                                                  }
                                                  return label
                                                }}
                                              />
                                              {/* Dashed baseline segment from 0,0 to first recorded value - render first so it's underneath */}
                                              {trendData[item.id] && trendData[item.id].length > 1 && (
                                                <>
                                                  <Line
                                                    yAxisId="left"
                                                    type="monotone"
                                                    dataKey="viewsDashed"
                                                    stroke="var(--color-primary)"
                                                    strokeWidth={2}
                                                    strokeDasharray="5 5"
                                                    dot={false}
                                                    activeDot={false}
                                                    isAnimationActive={false}
                                                    legendType="none"
                                                    connectNulls={false}
                                                  />
                                                  <Line
                                                    yAxisId="right"
                                                    type="monotone"
                                                    dataKey="likesDashed"
                                                    stroke="var(--color-accent)"
                                                    strokeWidth={2}
                                                    strokeDasharray="5 5"
                                                    dot={false}
                                                    activeDot={false}
                                                    isAnimationActive={false}
                                                    legendType="none"
                                                    connectNulls={false}
                                                  />
                                                </>
                                              )}
                                              {/* Solid line for actual recorded data points */}
                                              <Line
                                                yAxisId="left"
                                                type="monotone"
                                                dataKey="views"
                                                stroke="var(--color-primary)"
                                                strokeWidth={2}
                                                dot={{ fill: 'var(--color-primary)', strokeWidth: 2, r: 3 }}
                                                activeDot={{ r: 5, fill: 'var(--color-primary)' }}
                                                connectNulls={false}
                                              />
                                              <Line
                                                yAxisId="right"
                                                type="monotone"
                                                dataKey="likes"
                                                stroke="var(--color-accent)"
                                                strokeWidth={2}
                                                dot={{ fill: 'var(--color-accent)', strokeWidth: 2, r: 3 }}
                                                activeDot={{ r: 5, fill: 'var(--color-accent)' }}
                                                connectNulls={false}
                                              />
                                            </LineChart>
                                          </ResponsiveContainer>
                                        ) : (
                                          <div className="h-full flex items-center justify-center">
                                            <div className="text-center text-muted-foreground">
                                              <div className="text-2xl mb-2">📈</div>
                                              <p className="text-sm">No trend data yet</p>
                                              <p className="text-sm">Update metrics to see</p>
                                              <p className="text-sm">growth over time</p>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    {/* Update Metrics button at bottom left */}
                                    <div className="flex justify-start mt-auto">
                                      <div className="[&_button]:bg-accent [&_button]:hover:bg-accent/90 [&_button]:text-accent-foreground">
                                        <UpdateResearchMetricsDialog
                                          research={item}
                                          onMetricsUpdated={() => {
                                            loadResearch(workspaceId)
                                          }}
                                        />
                                      </div>
                                    </div>
                                  </div>
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
                    <TableCell colSpan={9} className="text-center py-8">
                      <p className="text-muted-foreground mb-4">
                        {research.length > 0
                          ? "No research matches your current filters."
                          : "No research yet. Start analyzing viral content!"}
                      </p>
                      {research.length === 0 && (
                        <CreateResearchDialog
                          workspaceId={workspaceId}
                          workspacePlatforms={workspacePlatforms}
                          contentPillars={contentPillars}
                          onResearchCreated={() => loadResearch(workspaceId)}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </main>
      </Suspense>
    </div>
  )
}
