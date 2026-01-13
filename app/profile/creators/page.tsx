"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { AppNav } from "@/components/app-nav"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"

export default function CreatorsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [creatorsWithCounts, setCreatorsWithCounts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      const supabase = createClient()

      const {
        data: { user: authUser },
        error: userError,
      } = await supabase.auth.getUser()
      if (userError || !authUser) {
        router.push("/auth/login")
        return
      }
      setUser(authUser)

      // Get user's workspace
      const { data: membership } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", authUser.id)
        .single()

      if (!membership) {
        router.push("/onboarding")
        return
      }

      // Get all creators with their platforms and content counts
      const { data: creators } = await supabase
        .from("creators")
        .select(
          `
      *,
      creator_platforms(
        platforms(name)
      )
    `,
        )
        .eq("workspace_id", membership.workspace_id)
        .order("created_at", { ascending: false })

      // Get content counts per creator
      const creatorsData = await Promise.all(
        (creators || []).map(async (creator) => {
          const { count: totalContent } = await supabase
            .from("content")
            .select("*", { count: "exact", head: true })
            .eq("creator_id", creator.id)

          const { count: inProgress } = await supabase
            .from("content")
            .select("*", { count: "exact", head: true })
            .eq("creator_id", creator.id)
            .in("production_stage", ["scripted", "approved", "shot", "edited"])

          const { data: batches } = await supabase
            .from("batch_creators")
            .select("batch_id")
            .eq("creator_id", creator.id)

          return {
            ...creator,
            totalContent: totalContent || 0,
            inProgress: inProgress || 0,
            activeBatches: batches?.length || 0,
          }
        }),
      )

      setCreatorsWithCounts(creatorsData)
      setLoading(false)
    }

    loadData()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <AppNav userEmail={user?.email || ""} />
        <main className="container mx-auto p-6 space-y-6 flex-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-9 bg-muted" />
              <Skeleton className="h-9 w-32 bg-muted" />
            </div>
            <Skeleton className="h-10 w-36 bg-muted" />
          </div>

          <Skeleton className="h-5 w-96 bg-muted" />

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-32 bg-muted" />
                    <Skeleton className="h-4 w-24 bg-muted" />
                  </div>
                  <Skeleton className="h-5 w-20 bg-muted" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-1">
                    <Skeleton className="h-5 w-16 bg-muted" />
                    <Skeleton className="h-5 w-20 bg-muted" />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Skeleton className="h-16 w-full bg-muted" />
                    <Skeleton className="h-16 w-full bg-muted" />
                    <Skeleton className="h-16 w-full bg-muted" />
                  </div>
                  <Skeleton className="h-10 w-full bg-muted" />
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppNav userEmail={user?.email || ""} />

      <main className="container mx-auto p-6 space-y-6 flex-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/profile" className="hover:opacity-70 transition-opacity">
              <ArrowLeft className="size-6 text-foreground" />
            </Link>
            <h1 className="text-3xl font-bold">Creators</h1>
          </div>
          <Button asChild>
            <Link href="/creators/new">
              <Plus className="size-4 mr-2" />
              Add Creator
            </Link>
          </Button>
        </div>

        <p className="text-muted-foreground">Manage your content creators and their brands</p>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {creatorsWithCounts.map((creator) => (
            <Card key={creator.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <CardTitle className="text-lg">{creator.name}</CardTitle>
                    {creator.brand_name && <p className="text-sm text-muted-foreground">{creator.brand_name}</p>}
                  </div>
                </div>
                <Badge variant="secondary" className="w-fit">
                  {creator.primary_niche}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-1">
                  {creator.creator_platforms?.map((cp: any, idx: number) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {cp.platforms.name}
                    </Badge>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="space-y-1">
                    <p className="text-2xl font-bold">{creator.totalContent}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl font-bold">{creator.inProgress}</p>
                    <p className="text-xs text-muted-foreground">In Progress</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl font-bold">{creator.activeBatches}</p>
                    <p className="text-xs text-muted-foreground">Batches</p>
                  </div>
                </div>

                <Button asChild variant="outline" className="w-full bg-transparent">
                  <Link href={`/creators/${creator.id}`}>View Details</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {creatorsWithCounts.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">No creators yet. Add your first creator to get started.</p>
              <Button asChild>
                <Link href="/creators/new">
                  <Plus className="size-4 mr-2" />
                  Add Creator
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </main>

      <Footer />
    </div>
  )
}
