"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { AppNav } from "@/components/app-nav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AddAnalyticsDialog } from "@/components/add-analytics-dialog"
import type { Content, Creator, Analytics } from "@/lib/types/database"
import { BarChart3, Eye, Clock, Share2, Bookmark } from "lucide-react"

interface ContentWithAnalytics extends Content {
  creators: { name: string }
  analytics: Analytics[]
}

export default function AnalyticsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [workspaceId, setWorkspaceId] = useState<string>("")
  const [content, setContent] = useState<ContentWithAnalytics[]>([])
  const [creators, setCreators] = useState<Creator[]>([])
  const [selectedCreator, setSelectedCreator] = useState<string>("all")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (workspaceId) {
      loadContent()
    }
  }, [workspaceId, selectedCreator])

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

    const { data: creatorsData } = await supabase
      .from("creators")
      .select("*")
      .eq("workspace_id", membership.workspace_id)
      .order("name")

    if (creatorsData) setCreators(creatorsData)
  }

  const loadContent = async () => {
    setIsLoading(true)

    let query = supabase
      .from("content")
      .select(
        `
        *,
        creators!inner(name, workspace_id),
        analytics(*)
      `,
      )
      .eq("creators.workspace_id", workspaceId)
      .eq("production_stage", "posted")

    if (selectedCreator !== "all") {
      query = query.eq("creator_id", selectedCreator)
    }

    const { data } = await query.order("updated_at", { ascending: false })

    if (data) setContent(data as ContentWithAnalytics[])
    setIsLoading(false)
  }

  const calculateAverages = () => {
    const allAnalytics = content.flatMap((c) => c.analytics)
    if (allAnalytics.length === 0) return null

    const sum = allAnalytics.reduce(
      (acc, a) => ({
        views: acc.views + (a.views || 0),
        completion_rate: acc.completion_rate + (a.completion_rate || 0),
        saves: acc.saves + (a.saves || 0),
        shares: acc.shares + (a.shares || 0),
        follows: acc.follows + (a.follows || 0),
      }),
      { views: 0, completion_rate: 0, saves: 0, shares: 0, follows: 0 },
    )

    return {
      views: Math.round(sum.views / allAnalytics.length),
      completion_rate: (sum.completion_rate / allAnalytics.length).toFixed(1),
      saves: Math.round(sum.saves / allAnalytics.length),
      shares: Math.round(sum.shares / allAnalytics.length),
      follows: Math.round(sum.follows / allAnalytics.length),
    }
  }

  const averages = calculateAverages()

  return (
    <div className="min-h-screen bg-background">
      <AppNav userEmail={user?.email} />

      <main className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Analytics</h1>
            <p className="text-muted-foreground">Track performance and optimize your content strategy</p>
          </div>
        </div>

        {/* Filter */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="min-w-[200px]">
                <Select value={selectedCreator} onValueChange={setSelectedCreator}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Creators" />
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
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Averages */}
        {averages && (
          <div className="grid gap-4 md:grid-cols-5">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Views</CardTitle>
                <Eye className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{averages.views.toLocaleString()}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                <Clock className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{averages.completion_rate}%</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Saves</CardTitle>
                <Bookmark className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{averages.saves.toLocaleString()}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Shares</CardTitle>
                <Share2 className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{averages.shares.toLocaleString()}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Follows</CardTitle>
                <BarChart3 className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{averages.follows.toLocaleString()}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Content List */}
        <Card>
          <CardHeader>
            <CardTitle>Posted Content</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {isLoading ? (
                <p className="text-muted-foreground text-center py-8">Loading analytics...</p>
              ) : content.length > 0 ? (
                content.map((item) => (
                  <div key={item.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <p className="font-medium">{item.hook || "Untitled Content"}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <span>{item.creators.name}</span>
                          <span>•</span>
                          <span className="capitalize">{item.format}</span>
                        </div>
                      </div>
                      {item.analytics.length === 0 && (
                        <AddAnalyticsDialog contentId={item.id} onAnalyticsAdded={() => loadContent()} />
                      )}
                    </div>

                    {item.analytics.length > 0 ? (
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                        {item.analytics.map((analytics) => (
                          <div key={analytics.id} className="col-span-full grid grid-cols-5 gap-4">
                            <div>
                              <p className="text-muted-foreground">Views</p>
                              <p className="font-semibold">{(analytics.views || 0).toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Completion</p>
                              <p className="font-semibold">{analytics.completion_rate || 0}%</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Saves</p>
                              <p className="font-semibold">{(analytics.saves || 0).toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Shares</p>
                              <p className="font-semibold">{(analytics.shares || 0).toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Follows</p>
                              <p className="font-semibold">{(analytics.follows || 0).toLocaleString()}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No analytics data yet</p>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No posted content yet. Analytics will appear here once content is marked as posted.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
