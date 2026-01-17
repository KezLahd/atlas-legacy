"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { AppNav } from "@/components/app-nav"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CreateResearchDialog } from "@/components/create-research-dialog"
import { EditResearchDialog } from "@/components/edit-research-dialog"
import { UpdateResearchMetricsDialog } from "@/components/update-research-metrics-dialog"
import type { Research, Platform } from "@/lib/types/database"

interface ResearchWithDetails extends Research {
  platforms: { name: string }
  content_pillars: { name: string } | null
}

export default function ResearchPage() {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [workspaceId, setWorkspaceId] = useState<string>("")
  const [research, setResearch] = useState<ResearchWithDetails[]>([])
  const [workspacePlatforms, setWorkspacePlatforms] = useState<Platform[]>([])
  const [contentPillars, setContentPillars] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null)

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

    const { data: creatorsData } = await supabase
      .from("creators")
      .select("id")
      .eq("workspace_id", membership.workspace_id)

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
    setIsLoading(true)
    const { data } = await supabase
      .from("research")
      .select("*, platforms(name), content_pillars(name)")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })

    if (data) setResearch(data as ResearchWithDetails[])
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

  return (
    <div className="min-h-screen bg-background">
      <AppNav userEmail={user?.email} />

      <main className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
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

        <div className="border rounded-lg overflow-hidden bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-accent hover:bg-accent">
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
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Loading research...
                  </TableCell>
                </TableRow>
              ) : research.length > 0 ? (
                research.map((item) => {
                  const platformIcon = getPlatformIcon(item.platforms.name)
                  return (
                    <Popover
                      key={item.id}
                      open={openPopoverId === item.id}
                      onOpenChange={(open) => setOpenPopoverId(open ? item.id : null)}
                    >
                      <PopoverTrigger asChild>
                        <TableRow className="hover:bg-accent/10 transition-colors cursor-pointer">
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
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-2 bg-white" align="center">
                        <div className="flex flex-col gap-1">
                          <EditResearchDialog
                            research={item}
                            workspaceId={workspaceId}
                            workspacePlatforms={workspacePlatforms}
                            contentPillars={contentPillars}
                            onResearchUpdated={() => {
                              loadResearch(workspaceId)
                              setOpenPopoverId(null)
                            }}
                          />
                          <UpdateResearchMetricsDialog
                            research={item}
                            onMetricsUpdated={() => {
                              loadResearch(workspaceId)
                              setOpenPopoverId(null)
                            }}
                          />
                        </div>
                      </PopoverContent>
                    </Popover>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <p className="text-muted-foreground mb-4">No research yet. Start analyzing viral content!</p>
                    <CreateResearchDialog
                      workspaceId={workspaceId}
                      workspacePlatforms={workspacePlatforms}
                      contentPillars={contentPillars}
                      onResearchCreated={() => loadResearch(workspaceId)}
                    />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </main>
    </div>
  )
}
