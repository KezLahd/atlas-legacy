"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { AppNav } from "@/components/app-nav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CreateResearchDialog } from "@/components/create-research-dialog"
import type { Research, Platform } from "@/lib/types/database"

interface ResearchWithDetails extends Research {
  platforms: { name: string }
}

export default function ResearchPage() {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [workspaceId, setWorkspaceId] = useState<string>("")
  const [research, setResearch] = useState<ResearchWithDetails[]>([])
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedResearch, setSelectedResearch] = useState<ResearchWithDetails | null>(null)

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

    // Load platforms
    const { data: platformsData } = await supabase.from("platforms").select("*").order("name")
    if (platformsData) setPlatforms(platformsData)

    await loadResearch(membership.workspace_id)
  }

  const loadResearch = async (workspaceId: string) => {
    setIsLoading(true)
    const { data } = await supabase
      .from("research")
      .select("*, platforms(name)")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })

    if (data) setResearch(data as ResearchWithDetails[])
    setIsLoading(false)
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
            platforms={platforms}
            onResearchCreated={() => loadResearch(workspaceId)}
          />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Research List */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Research Library</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {isLoading ? (
                    <p className="text-muted-foreground text-center py-8">Loading research...</p>
                  ) : research.length > 0 ? (
                    research.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => setSelectedResearch(item)}
                        className={`p-3 border rounded-lg cursor-pointer hover:bg-accent transition-colors ${
                          selectedResearch?.id === item.id ? "bg-accent" : ""
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <p className="font-medium line-clamp-1">{item.hook || "Untitled Research"}</p>
                            {item.creator_niche && (
                              <p className="text-sm text-muted-foreground">{item.creator_niche}</p>
                            )}
                          </div>
                          <Badge variant="outline">{item.platforms.name}</Badge>
                        </div>
                        {item.link && (
                          <a
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            View Original
                          </a>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground mb-4">No research yet. Start analyzing viral content!</p>
                      <CreateResearchDialog
                        workspaceId={workspaceId}
                        platforms={platforms}
                        onResearchCreated={() => loadResearch(workspaceId)}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Research Details */}
          <div>
            {selectedResearch ? (
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle>Research Details</CardTitle>
                    <Badge variant="outline">{selectedResearch.platforms.name}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedResearch.link && (
                    <div>
                      <p className="text-sm font-medium mb-1">Link</p>
                      <a
                        href={selectedResearch.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        {selectedResearch.link}
                      </a>
                    </div>
                  )}

                  {selectedResearch.creator_niche && (
                    <div>
                      <p className="text-sm font-medium mb-1">Creator/Niche</p>
                      <p className="text-sm text-muted-foreground">{selectedResearch.creator_niche}</p>
                    </div>
                  )}

                  {selectedResearch.hook && (
                    <div>
                      <p className="text-sm font-medium mb-1">Hook</p>
                      <p className="text-sm">{selectedResearch.hook}</p>
                    </div>
                  )}

                  {selectedResearch.script_breakdown && (
                    <div>
                      <p className="text-sm font-medium mb-1">Script Breakdown</p>
                      <p className="text-sm whitespace-pre-wrap">{selectedResearch.script_breakdown}</p>
                    </div>
                  )}

                  {selectedResearch.sound_design && (
                    <div>
                      <p className="text-sm font-medium mb-1">Sound Design</p>
                      <p className="text-sm text-muted-foreground">{selectedResearch.sound_design}</p>
                    </div>
                  )}

                  {selectedResearch.music && (
                    <div>
                      <p className="text-sm font-medium mb-1">Music</p>
                      <p className="text-sm text-muted-foreground">{selectedResearch.music}</p>
                    </div>
                  )}

                  {selectedResearch.cadence && (
                    <div>
                      <p className="text-sm font-medium mb-1">Cadence</p>
                      <p className="text-sm text-muted-foreground">{selectedResearch.cadence}</p>
                    </div>
                  )}

                  {selectedResearch.b_roll && (
                    <div>
                      <p className="text-sm font-medium mb-1">B-roll</p>
                      <p className="text-sm text-muted-foreground">{selectedResearch.b_roll}</p>
                    </div>
                  )}

                  {selectedResearch.style && (
                    <div>
                      <p className="text-sm font-medium mb-1">Style</p>
                      <p className="text-sm text-muted-foreground">{selectedResearch.style}</p>
                    </div>
                  )}

                  {selectedResearch.why_it_worked && (
                    <div>
                      <p className="text-sm font-medium mb-1">Why It Worked</p>
                      <p className="text-sm">{selectedResearch.why_it_worked}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">Select a research item to view details</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
