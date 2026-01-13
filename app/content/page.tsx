"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { AppNav } from "@/components/app-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Filter } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CreateContentDialog } from "@/components/create-content-dialog"
import { Footer } from "@/components/footer"
import type { Content, Creator, ProductionStage, Batch } from "@/lib/types/database"

interface ContentWithDetails extends Content {
  creators: { name: string }
  content_platforms: Array<{ platforms: { name: string } }>
  content_content_pillars: Array<{ content_pillars: { name: string } }>
  four_hs: { name: string } | null
  batches: { name: string } | null
  series: { name: string } | null
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

  // Filters
  const [selectedCreator, setSelectedCreator] = useState<string>("all")
  const [selectedStage, setSelectedStage] = useState<string>("all")
  const [selectedFormat, setSelectedFormat] = useState<string>("all")
  const [selectedBatch, setSelectedBatch] = useState<string>("all")

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
  }

  const loadContent = async (workspaceId: string) => {
    setIsLoading(true)
    const { data } = await supabase
      .from("content")
      .select(
        `
        *,
        creators!inner(name, workspace_id),
        content_platforms(platforms(name)),
        content_content_pillars(content_pillars(name)),
        four_hs(name),
        batches(name),
        series(name)
      `,
      )
      .eq("creators.workspace_id", workspaceId)
      .order("updated_at", { ascending: false })

    if (data) setContent(data as ContentWithDetails[])
    setIsLoading(false)
  }

  const filteredContent = content.filter((item) => {
    if (selectedCreator !== "all" && item.creator_id !== selectedCreator) return false
    if (selectedStage !== "all" && item.production_stage !== selectedStage) return false
    if (selectedFormat !== "all" && item.format !== selectedFormat) return false
    if (selectedBatch !== "all" && item.batch_id !== selectedBatch) return false
    return true
  })

  const getStageColor = (stage: ProductionStage) => {
    const colors = {
      idea: "bg-gray-100 text-gray-800",
      scripted: "bg-blue-100 text-blue-800",
      approved: "bg-green-100 text-green-800",
      shot: "bg-purple-100 text-purple-800",
      edited: "bg-orange-100 text-orange-800",
      scheduled: "bg-cyan-100 text-cyan-800",
      posted: "bg-emerald-100 text-emerald-800",
    }
    return colors[stage] || "bg-gray-100 text-gray-800"
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
            <CreateContentDialog
              workspaceId={workspaceId}
              creators={creators}
              onContentCreated={() => loadContent(workspaceId)}
              workspaceType={workspaceType}
            />
          </div>
        </div>

        {/* Filters */}
        <Card className="shadow-sm border-l-4 border-l-accent">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Filter className="size-4 text-muted-foreground" />
              <div className="flex gap-3 flex-1 flex-wrap">
                <div className="min-w-[180px]">
                  <Select value={selectedBatch} onValueChange={setSelectedBatch}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Batches" />
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
                </div>

                <div className="min-w-[180px]">
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

                <div className="min-w-[180px]">
                  <Select value={selectedStage} onValueChange={setSelectedStage}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Stages" />
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
                </div>

                <div className="min-w-[180px]">
                  <Select value={selectedFormat} onValueChange={setSelectedFormat}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Formats" />
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

                {(selectedBatch !== "all" ||
                  selectedCreator !== "all" ||
                  selectedStage !== "all" ||
                  selectedFormat !== "all") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedBatch("all")
                      setSelectedCreator("all")
                      setSelectedStage("all")
                      setSelectedFormat("all")
                    }}
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content List */}
        <div className="space-y-3">
          {isLoading ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Loading content...</p>
              </CardContent>
            </Card>
          ) : filteredContent.length > 0 ? (
            filteredContent.map((item) => (
              <Card
                key={item.id}
                className="hover:shadow-lg transition-all cursor-pointer border-l-2 border-l-transparent hover:border-l-accent"
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-lg">{item.hook || "Untitled Content"}</h3>
                        <Badge className={getStageColor(item.production_stage)} variant="secondary">
                          {item.production_stage}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{item.creators?.name}</span>
                        <span>•</span>
                        <span className="capitalize">{item.format}</span>
                        {item.series && (
                          <>
                            <span>•</span>
                            <span>{item.series.name}</span>
                          </>
                        )}
                        {item.batches && (
                          <>
                            <span>•</span>
                            <span>{item.batches.name}</span>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {item.content_platforms?.map((cp, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {cp.platforms.name}
                          </Badge>
                        ))}
                        {item.content_content_pillars?.map((ccp, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {ccp.content_pillars.name}
                          </Badge>
                        ))}
                        {item.four_hs && (
                          <Badge variant="outline" className="text-xs">
                            {item.four_hs.name}
                          </Badge>
                        )}
                      </div>

                      {item.main_script && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{item.main_script}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground mb-4">
                  {selectedBatch !== "all" ||
                  selectedCreator !== "all" ||
                  selectedStage !== "all" ||
                  selectedFormat !== "all"
                    ? "No content matches your filters."
                    : "No content yet. Create your first piece!"}
                </p>
                <CreateContentDialog
                  workspaceId={workspaceId}
                  creators={creators}
                  onContentCreated={() => loadContent(workspaceId)}
                  workspaceType={workspaceType}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
