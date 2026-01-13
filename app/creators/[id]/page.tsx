import { redirect, notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AppNav } from "@/components/app-nav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default async function CreatorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  // Get creator with all details
  const { data: creator } = await supabase
    .from("creators")
    .select(
      `
      *,
      creator_platforms(platforms(name)),
      creator_sub_niches(sub_niche, insecurity_id)
    `,
    )
    .eq("id", id)
    .single()

  if (!creator) notFound()

  // Get content for this creator
  const { data: content } = await supabase
    .from("content")
    .select("*, content_platforms(platforms(name))")
    .eq("creator_id", id)
    .order("updated_at", { ascending: false })

  // Get series for this creator
  const { data: series } = await supabase.from("series").select("*").eq("creator_id", id).order("created_at")

  return (
    <div className="min-h-screen bg-background">
      <AppNav userEmail={user.email} />

      <main className="container mx-auto p-6 space-y-6">
        <Button variant="ghost" asChild>
          <Link href="/creators">
            <ArrowLeft className="size-4 mr-2" />
            Back to Creators
          </Link>
        </Button>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold">{creator.name}</h1>
          {creator.brand_name && <p className="text-xl text-muted-foreground">{creator.brand_name}</p>}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Primary Niche</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="secondary">{creator.primary_niche}</Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Platforms</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {creator.creator_platforms?.map((cp: any, idx: number) => (
                  <Badge key={idx} variant="outline">
                    {cp.platforms.name}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Total Content</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{content?.length || 0}</p>
            </CardContent>
          </Card>
        </div>

        {creator.creator_sub_niches && creator.creator_sub_niches.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Sub-Niches</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {creator.creator_sub_niches.map((sn: any, idx: number) => (
                  <div key={idx} className="p-2 border rounded">
                    <span className="font-medium">{sn.sub_niche}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {series && series.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Series</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {series.map((s) => (
                  <div key={s.id} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <p className="font-medium">{s.name}</p>
                      <p className="text-sm text-muted-foreground capitalize">{s.type.replace("_", " ")}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Recent Content</CardTitle>
          </CardHeader>
          <CardContent>
            {content && content.length > 0 ? (
              <div className="space-y-2">
                {content.slice(0, 10).map((c) => (
                  <div key={c.id} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex-1">
                      <p className="font-medium line-clamp-1">{c.hook || "Untitled"}</p>
                      <p className="text-sm text-muted-foreground capitalize">{c.format}</p>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {c.production_stage}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No content yet for this creator.</p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
