import { redirect, notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, Calendar, FileText, Lightbulb, CheckCircle2 } from "lucide-react"
import { ContentCharts, PlatformChart } from "./content-charts"

export const dynamic = 'force-dynamic'

export default async function CreatorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  // Get creator with all details
  const { data: creator, error: creatorError } = await supabase
    .from("creators")
    .select(
      `
      *,
      creator_platforms(platforms(id, name)),
      creator_sub_niches(sub_niche),
      creator_posting_frameworks(posting_frequency, content_type_order, excluded_day_types)
    `,
    )
    .eq("id", id)
    .single()

  if (creatorError || !creator) {
    console.error("Creator error:", creatorError, "ID:", id)
    notFound()
  }

  // Debug: Log posting framework data
  console.log("[Creator Detail] Posting framework:", creator.creator_posting_frameworks)

  // Verify user has access to this creator's workspace
  const { data: membership, error: membershipError } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .eq("workspace_id", creator.workspace_id)
    .single()

  if (membershipError || !membership) {
    console.error("Membership error:", membershipError, "User ID:", user.id, "Workspace ID:", creator.workspace_id)
    redirect("/profile/creators")
  }

  // Get content for this creator with more details
  const { data: content } = await supabase
    .from("content")
    .select(`
      *,
      content_platforms(platforms(name)),
      content_content_pillars(content_pillars(name)),
      analytics(views, likes, shares, saves, follows)
    `)
    .eq("creator_id", id)
    .order("updated_at", { ascending: false })

  // Get content counts by stage
  const { count: totalContent } = await supabase
    .from("content")
    .select("*", { count: "exact", head: true })
    .eq("creator_id", id)

  const { count: idea } = await supabase
    .from("content")
    .select("*", { count: "exact", head: true })
    .eq("creator_id", id)
    .eq("production_stage", "idea")

  const { count: scripted } = await supabase
    .from("content")
    .select("*", { count: "exact", head: true })
    .eq("creator_id", id)
    .eq("production_stage", "scripted")

  const { count: approved } = await supabase
    .from("content")
    .select("*", { count: "exact", head: true })
    .eq("creator_id", id)
    .eq("production_stage", "approved")

  const { count: shot } = await supabase
    .from("content")
    .select("*", { count: "exact", head: true })
    .eq("creator_id", id)
    .eq("production_stage", "shot")

  const { count: edited } = await supabase
    .from("content")
    .select("*", { count: "exact", head: true })
    .eq("creator_id", id)
    .eq("production_stage", "edited")

  const { count: posted } = await supabase
    .from("content")
    .select("*", { count: "exact", head: true })
    .eq("creator_id", id)
    .eq("production_stage", "posted")

  // Get calendar events for this creator (via content)
  const contentIds = content?.map((c: any) => c.id) || []
  const { data: events } = contentIds.length > 0
    ? await supabase
        .from("calendar_events")
        .select(`
          *,
          content(hook, production_stage),
          batch:batches(name)
        `)
        .in("content_id", contentIds)
        .gte("start_time", new Date().toISOString())
        .order("start_time", { ascending: true })
        .limit(30)
    : { data: null }

  // Get series for this creator
  const { data: series } = await supabase.from("series").select("*").eq("creator_id", id).order("created_at")

  // Get content types from database
  const { data: contentTypes, error: contentTypesError } = await supabase
    .from("content_types")
    .select("*")
    .order("id")

  if (contentTypesError) {
    console.error("[Creator Detail] Error fetching content types:", contentTypesError)
  }
  console.log("[Creator Detail] Content types from DB:", contentTypes)
  console.log("[Creator Detail] Content types count:", contentTypes?.length || 0)

  // Get content by platform
  const contentByPlatform: Record<string, number> = {}
  content?.forEach((c: any) => {
    c.content_platforms?.forEach((cp: any) => {
      const platformName = cp.platforms?.name || "Unknown"
      contentByPlatform[platformName] = (contentByPlatform[platformName] || 0) + 1
    })
  })

  // Get content by stage for chart - matching content table pastel colors (red to green scale)
  const contentByStage = [
    { name: "Idea", value: idea || 0, color: "#fee2e2" }, // red-100
    { name: "Scripted", value: scripted || 0, color: "#ffedd5" }, // orange-100
    { name: "Approved", value: approved || 0, color: "#fef9c3" }, // yellow-100
    { name: "Shot", value: shot || 0, color: "#dcfce7" }, // green-100
    { name: "Edited", value: edited || 0, color: "#d1fae5" }, // emerald-100
    { name: "Posted", value: posted || 0, color: "#ccfbf1" }, // teal-100
  ]

  // Get content by platform for chart
  const platformChartData = Object.entries(contentByPlatform).map(([name, value]) => ({
    name,
    value,
  }))

  // Map content types from database
  const allContentTypes = contentTypes?.map((ct: any) => ({
    id: ct.id,
    name: ct.name,
    description: ct.description,
    icon: ct.icon,
  })) || []

  const postingFramework = creator.creator_posting_frameworks?.[0] || null
  const postingFrequency = postingFramework?.posting_frequency || null
  const contentTypeOrder = postingFramework?.content_type_order || []
  const excludedDayTypes = postingFramework?.excluded_day_types || []
  
  // Debug: Log the raw data
  console.log("[Creator Detail] contentTypeOrder:", contentTypeOrder)
  console.log("[Creator Detail] contentTypeOrder type:", typeof contentTypeOrder, Array.isArray(contentTypeOrder))
  console.log("[Creator Detail] First typeId:", contentTypeOrder[0], typeof contentTypeOrder[0])
  console.log("[Creator Detail] First content type id:", allContentTypes[0]?.id, typeof allContentTypes[0]?.id)
  
  // Map content types in order - use content_type_order array to get the correct order
  // Ensure we're comparing the same types (both should be numbers)
  const orderedContentTypes = contentTypeOrder.length > 0 && allContentTypes.length > 0
    ? contentTypeOrder
        .map((typeId: number) => {
          const found = allContentTypes.find((ct: any) => Number(ct.id) === Number(typeId))
          console.log(`[Creator Detail] Looking for typeId ${typeId}, found:`, found)
          return found
        })
        .filter((ct: any) => ct !== undefined && ct !== null)
    : postingFrequency && allContentTypes.length > 0 ? allContentTypes.slice(0, postingFrequency) : []
  
  // Debug: Log ordered content types
  console.log("[Creator Detail] Ordered content types:", orderedContentTypes)
  console.log("[Creator Detail] Ordered content types length:", orderedContentTypes.length)

  // Platform icon paths
  const platformConfig: Record<string, { icon: string }> = {
    youtube: { icon: "/icons/youtube.svg" },
    "youtube shorts": { icon: "/icons/youtube.svg" },
    "youtube long": { icon: "/icons/youtube.svg" },
    tiktok: { icon: "/icons/tiktok.svg" },
    instagram: { icon: "/icons/instagram.svg" },
    twitter: { icon: "/icons/x.svg" },
    x: { icon: "/icons/x.svg" },
    linkedin: { icon: "/icons/linkedin.svg" },
    facebook: { icon: "/icons/facebook.svg" },
  }

  // Calculate analytics averages
  const postedContent = content?.filter((c: any) => c.production_stage === "posted") || []
  const totalViews = postedContent.reduce((sum: number, c: any) => {
    const analytics = c.analytics?.[0]
    return sum + (analytics?.views || 0)
  }, 0)
  const totalLikes = postedContent.reduce((sum: number, c: any) => {
    const analytics = c.analytics?.[0]
    return sum + (analytics?.likes || 0)
  }, 0)
  const avgViews = postedContent.length > 0 ? Math.round(totalViews / postedContent.length) : 0
  const avgLikes = postedContent.length > 0 ? Math.round(totalLikes / postedContent.length) : 0

  // Get upcoming posting schedule (next 7 days)
  const today = new Date()
  const nextWeek = new Date(today)
  nextWeek.setDate(today.getDate() + 7)
  
  const upcomingEvents = events?.filter((e: any) => {
    const eventDate = new Date(e.start_time)
    return eventDate >= today && eventDate <= nextWeek && e.category === "posting"
  }) || []

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="container mx-auto p-6 space-y-6 flex-1">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/profile/creators">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">{creator.name}</h1>
            {creator.brand_name && <p className="text-lg text-muted-foreground">{creator.brand_name}</p>}
          </div>
        </div>

        {/* Creator Details Card */}
        <Card>
          <CardHeader>
            <CardTitle>Creator Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Primary Niche</p>
                <Badge variant="secondary" className="text-base">
                  {creator.primary_niche}
                </Badge>
              </div>

              {creator.creator_sub_niches && creator.creator_sub_niches.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Sub-Niches</p>
                  <div className="flex flex-wrap gap-2">
                    {creator.creator_sub_niches.map((sn: any, idx: number) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {sn.sub_niche}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Platforms</p>
                <div className="flex flex-wrap gap-3">
                  {creator.creator_platforms && creator.creator_platforms.length > 0 ? (
                    creator.creator_platforms.map((cp: any, idx: number) => {
                      const platformName = cp.platforms?.name?.toLowerCase() || ""
                      const config = platformConfig[platformName] || { icon: "" }
                      
                      return (
                        <div
                          key={idx}
                          className="flex items-center gap-2"
                          title={cp.platforms?.name}
                        >
                          {config.icon ? (
                            <img src={config.icon} alt={cp.platforms?.name} className="size-6 object-contain" />
                          ) : (
                            <span className="text-sm font-medium">{cp.platforms?.name}</span>
                          )}
                        </div>
                      )
                    })
                  ) : (
                    <p className="text-sm text-muted-foreground">No platforms configured</p>
                  )}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Posting Framework</p>
                {postingFramework ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="size-4 text-muted-foreground" />
                      <span className="font-semibold">{postingFrequency} posts/week</span>
                    </div>
                    {orderedContentTypes && orderedContentTypes.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {orderedContentTypes.map((contentType: any, index: number) => {
                          if (!contentType) return null
                          return (
                            <div key={contentType.id || index} className="flex items-center gap-1.5 px-2 py-1 bg-muted rounded-md text-xs">
                              <span>{contentType.icon || "📝"}</span>
                              <span className="font-medium">{contentType.name || "Content"}</span>
                              <span className="text-muted-foreground">(Day {index + 1})</span>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">
                        <p>Content types not configured</p>
                        <p className="text-[10px] mt-1">Debug: contentTypeOrder length: {contentTypeOrder.length}, allContentTypes length: {allContentTypes.length}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No posting framework configured</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Key Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="bg-red-100 border-red-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
              <CardTitle className="text-sm font-medium text-red-800">Total Ideas</CardTitle>
              <Lightbulb className="size-4 text-red-600" />
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <div className="text-3xl font-bold text-red-800">{idea || 0}</div>
            </CardContent>
          </Card>

          <Card className="bg-green-100 border-green-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
              <CardTitle className="text-sm font-medium text-green-800">Total Posts</CardTitle>
              <CheckCircle2 className="size-4 text-green-600" />
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <div className="text-3xl font-bold text-green-800">{posted || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - 2/3 width */}
          <div className="lg:col-span-2 space-y-6">
            {/* Content Charts */}
            <ContentCharts contentByStage={contentByStage} platformChartData={platformChartData} />
          </div>

          {/* Right Column - 1/3 width */}
          <div className="space-y-6">
            {/* Content by Platform Chart */}
            <PlatformChart platformChartData={platformChartData} />

            {/* Upcoming Schedule */}
            {upcomingEvents.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Upcoming Posts</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {upcomingEvents.slice(0, 5).map((event: any) => {
                      const eventDate = new Date(event.start_time)
                      return (
                        <div key={event.id} className="flex items-start gap-3 p-2 rounded-lg border">
                          <div className="flex-shrink-0 mt-0.5">
                            <Calendar className="size-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium line-clamp-1">{event.content?.hook || event.title || "Untitled"}</p>
                            <p className="text-xs text-muted-foreground">
                              {eventDate.toLocaleDateString()} at {eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Content Framework */}
            {postingFrequency && orderedContentTypes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Content Framework</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {orderedContentTypes.map((contentType: any, index: number) => (
                      <div key={contentType?.id || index} className="flex items-start gap-3 p-3 border rounded-lg">
                        <div className="text-2xl flex-shrink-0">{contentType?.icon || "📝"}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-xs font-bold text-muted-foreground">Day {index + 1}</p>
                          </div>
                          <h3 className="font-semibold text-sm">{contentType?.name || "Content Type"}</h3>
                          <p className="text-xs text-muted-foreground">{contentType?.description || ""}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Series */}
            {series && series.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Series</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {series.map((s) => (
                      <div key={s.id} className="flex items-center justify-between p-2 border rounded-lg">
                        <div>
                          <p className="font-medium text-sm">{s.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">{s.type?.replace("_", " ") || ""}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
