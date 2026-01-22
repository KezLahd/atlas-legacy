import { Card } from "@/components/ui/card"
import { CardHeader } from "@/components/ui/card"
import { redirect, notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Footer } from "@/components/footer"
import { CardContent, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, Calendar, FileText } from "lucide-react"
import { ContentCharts, PlatformChart } from "./content-charts"
import { CreatorDetails } from "./creator-details"
import { DeleteCreatorDialog } from "@/components/delete-creator-dialog"
import { Separator } from "@/components/ui/separator"

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
  analytics(views, shares, saves, follows)
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

  // Get all platforms for editing
  const { data: platformOptions } = await supabase.from("platforms").select("id,name").order("name")

  // Map content types from database
  const allContentTypes = contentTypes?.map((ct: any) => ({
    id: ct.id,
    name: ct.name,
    description: ct.description,
    icon: ct.icon,
  })) || []

  let postingFramework = creator.creator_posting_frameworks?.[0] || null

  // Fallback: fetch directly if nested relation didn't return
  if (!postingFramework) {
    const { data: pf } = await supabase
      .from("creator_posting_frameworks")
      .select("posting_frequency, content_type_order, excluded_day_types")
      .eq("creator_id", id)
      .single()
    postingFramework = pf || null
  }

  const postingFrequency = postingFramework?.posting_frequency || null
  const contentTypeOrder = postingFramework?.content_type_order || []
  const excludedDayTypes = postingFramework?.excluded_day_types || []
  
  // Map content types in order - use content_type_order array to get the correct order
  // Ensure we're comparing the same types (both should be numbers)
  const orderedContentTypes = contentTypeOrder.length > 0 && allContentTypes.length > 0
    ? contentTypeOrder
        .map((typeId: number) => allContentTypes.find((ct: any) => Number(ct.id) === Number(typeId)))
        .filter((ct: any) => ct !== undefined && ct !== null)
    : postingFrequency && allContentTypes.length > 0 ? allContentTypes.slice(0, postingFrequency) : []


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

  // Determine permissions:
  // - owners/managers can edit any creator
  // - creators can only edit creators they have access to (creator_access)
  const { data: membershipRow } = await supabase
    .from("workspace_members")
    .select("id, role")
    .eq("workspace_id", creator.workspace_id)
    .eq("user_id", user.id)
    .single()

  const isAdmin = membershipRow?.role === "owner" || membershipRow?.role === "manager"

  const { data: creatorAccessRow } = !isAdmin && membershipRow?.id
    ? await supabase
        .from("creator_access")
        .select("id")
        .eq("workspace_member_id", membershipRow.id)
        .eq("creator_id", creator.id)
        .maybeSingle()
    : { data: null }

  const canEdit = Boolean(isAdmin || creatorAccessRow?.id)
  
  // Check if current user is the creator (user_id matches)
  const isCreatorUser = creator.user_id === user.id
  
  // Get batch assignment count for this creator (where creator is assigned TO batches)
  const { count: batchAssignmentCount } = await supabase
    .from("batch_creators")
    .select("*", { count: "exact", head: true })
    .eq("creator_id", id)

  // Get SFX & B-Roll count created BY this user
  const { count: sfxCount } = await supabase
    .from("sfx_reference")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
  
  const { count: brollCount } = await supabase
    .from("broll_reference")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
  
  const sfxBrollCount = (sfxCount || 0) + (brollCount || 0)

  // Get batches created BY this user (batches don't have created_by, so count by workspace)
  const { count: batchesCreatedCount } = await supabase
    .from("batches")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", creator.workspace_id)

  // Get calendar events created BY this user
  const { count: calendarEventsCreatedCount } = await supabase
    .from("calendar_events")
    .select("*", { count: "exact", head: true })
    .eq("created_by", user.id)

  // Declare batchCount variable
  const batchCount = batchAssignmentCount;

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

        {/* Production Stage Chart (not in a card) */}
        <ContentCharts contentByStage={contentByStage} platformChartData={platformChartData} />

        {/* Creator Details Card */}
        <CreatorDetails
          creatorId={creator.id}
          name={creator.name}
          brandName={creator.brand_name}
          primaryNiche={creator.primary_niche}
          subNiches={creator.creator_sub_niches?.map((sn: any) => sn.sub_niche) || []}
          platforms={
            creator.creator_platforms?.map((cp: any) => ({
              name: cp.platforms?.name || "",
              icon: platformConfig[cp.platforms?.name?.toLowerCase() || ""]?.icon,
            })) || []
          }
          postingFrequency={postingFrequency}
          orderedContentTypes={orderedContentTypes as any}
          platformConfig={platformConfig}
          platformOptions={platformOptions || []}
          selectedPlatformIds={creator.creator_platforms?.map((cp: any) => cp.platforms?.id).filter(Boolean) || []}
          contentTypeOrder={contentTypeOrder}
          allContentTypes={allContentTypes as any}
          canEdit={!!canEdit}
        />


        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - 2/3 width */}
          <div className="lg:col-span-2 space-y-6">
            {/* (Chart moved above details) */}
          </div>

          {/* Right Column - 1/3 width */}
          <div className="space-y-6">
            {/* Content by Platform Chart */}
            <PlatformChart platformChartData={platformChartData} />

            {/* Upcoming Schedule */}
            {upcomingEvents.length > 0 && (
              <div className="flex items-start gap-3 p-2 rounded-lg border">
                <div className="flex-shrink-0 mt-0.5">
                  <Calendar className="size-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium line-clamp-1">{upcomingEvents[0].content?.hook || upcomingEvents[0].title || "Untitled"}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(upcomingEvents[0].start_time).toLocaleDateString()} at {new Date(upcomingEvents[0].start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            )}

            {/* Series */}
            {series && series.length > 0 && (
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
            )}
          </div>
        </div>

        {/* Danger Zone - Only visible to owners/managers */}
        {isAdmin && (
          <Card className="border-destructive bg-white dark:bg-white">
            <CardHeader className="border-b border-destructive">
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
              <CardDescription className="text-muted-foreground">
                Irreversible actions for this creator
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div>
                <h3 className="font-semibold mb-2 text-foreground">Delete Creator</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {isCreatorUser 
                    ? "Remove yourself as a creator. Your user account will remain active, but all creator-specific data will be deleted."
                    : `Permanently delete ${creator.name} and all associated data including content, series, and settings.`
                  }
                </p>
                <DeleteCreatorDialog
                  creatorId={creator.id}
                  creatorName={creator.name}
                  isOwner={isCreatorUser}
                  userId={user.id}
                  contentCount={totalContent || 0}
                  seriesCount={series?.length || 0}
                  batchAssignmentCount={batchAssignmentCount || 0}
                  sfxBrollCount={sfxBrollCount}
                  batchesCreatedCount={batchesCreatedCount || 0}
                  calendarEventsCreatedCount={calendarEventsCreatedCount || 0}
                />
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      <Footer />
    </div>
  )
}
