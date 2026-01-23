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
import type { Content, Creator, ProductionStage, Batch, Platform } from "@/lib/types/database"
import { CreateBatchDialog } from "@/components/create-batch-dialog"
import { EditBatchDialog } from "@/components/edit-batch-dialog"
import { UserAvatar } from "@/components/user-avatar"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { Skeleton } from "@/components/ui/skeleton"
import React from "react"

interface ContentWithDetails extends Content {
  creator_id: string
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
  const [userRole, setUserRole] = useState<string>("")
  const [workspaceId, setWorkspaceId] = useState<string>("")
  const [content, setContent] = useState<ContentWithDetails[]>([])
  const [creators, setCreators] = useState<Array<{
    id: string
    workspace_id: string
    name: string
    brand_name: string | null
    primary_niche: string
    created_at: string
    updated_at: string
    workspace_members: Array<{
      user_profiles: {
        first_name: string
        last_name: string
        email: string
        avatar_type?: "initials" | "upload"
        avatar_bg_color?: string
        avatar_text_color?: string
        avatar_storage_path?: string
      }
    }>
  }>>([])
  const [batches, setBatches] = useState<Batch[]>([])
  const [workspacePlatforms, setWorkspacePlatforms] = useState<Platform[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [workspaceType, setWorkspaceType] = useState<string>("")
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [showScheduleDialog, setShowScheduleDialog] = useState<boolean>(false)
  const [schedulingContentId, setSchedulingContentId] = useState<string>("")
  const [schedulingBatchId, setSchedulingBatchId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [selectedBatch, setSelectedBatch] = useState<string>("all")
  const [selectedCreator, setSelectedCreator] = useState<string>("all")
  const [selectedStage, setSelectedStage] = useState<string>("all")
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all")
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
      .select("workspace_id, role")
      .eq("user_id", authUser.id)
      .single()

    if (!membership) {
      router.push("/onboarding")
      return
    }

    setWorkspaceId(membership.workspace_id)

    const { data: workspaceData } = await supabase
      .from("workspaces")
      .select("type")
      .eq("id", membership.workspace_id)
      .single()

    if (workspaceData) {
      setWorkspaceType(workspaceData.type)
    }

    // Get full workspace info for personal brand logic
    const { data: workspaceInfo, error: workspaceError } = await supabase
      .from("workspaces")
      .select("*")
      .eq("id", membership.workspace_id)
      .single()

    console.log("[DEBUG] Full workspace info:", workspaceInfo, "Error:", workspaceError, "Type:", workspaceInfo?.type, "Owner ID:", workspaceInfo?.owner_id)

    // For personal creator workspaces, ensure the owner has a creator entry
    if (workspaceInfo?.type === 'personal_creator' && workspaceInfo.owner_id) {
      console.log("[DEBUG] Personal brand workspace detected, owner_id:", workspaceInfo.owner_id)

      const { data: existingCreator, error: creatorError } = await supabase
        .from("creators")
        .select("id")
        .eq("workspace_id", membership.workspace_id)
        .limit(1)

      console.log("[DEBUG] Existing creators:", existingCreator, "Error:", creatorError)

      if (!existingCreator || existingCreator.length === 0) {
        console.log("[DEBUG] No existing creators, creating one for owner")

        // Get owner profile info
        const { data: ownerProfile, error: profileError } = await supabase
          .from("user_profiles")
          .select("first_name, last_name")
          .eq("id", workspaceInfo.owner_id)
          .single()

        console.log("[DEBUG] Owner profile:", ownerProfile, "Error:", profileError)

        if (ownerProfile) {
          // Create creator entry for owner
          const ownerName = `${ownerProfile.first_name} ${ownerProfile.last_name}`.trim()
          const { data: insertResult, error: insertError } = await supabase
            .from("creators")
            .insert({
              workspace_id: membership.workspace_id,
              name: ownerName,
              brand_name: ownerName,
              primary_niche: "Personal Brand"
            })
            .select()

          console.log("[DEBUG] Creator insert result:", insertResult, "Error:", insertError)
        } else {
          console.log("[DEBUG] No owner profile found")
        }
      } else {
        console.log("[DEBUG] Creator already exists")
      }
    } else {
      console.log("[DEBUG] Not a personal brand workspace or no owner_id", {
        type: workspaceInfo?.type,
        owner_id: workspaceInfo?.owner_id,
        fullWorkspaceInfo: workspaceInfo
      })
    }

    // First get creators
    const { data: creatorsData } = await supabase
      .from("creators")
      .select("*")
      .eq("workspace_id", membership.workspace_id)
      .order("name")

    // Then get creator access and workspace members with profiles for these creators
    let creatorsWithProfiles = []
    if (creatorsData && creatorsData.length > 0) {
      // Get creator access records to link creators to workspace members
      const { data: accessData, error: accessError } = await supabase
        .from("creator_access")
        .select("creator_id, workspace_member_id")
        .in("creator_id", creatorsData.map(c => c.id))

      console.log("[DEBUG] Creator access query error:", accessError)
      console.log("[DEBUG] Creator access data:", accessData)

      // Get workspace members with profiles
      const { data: membersData, error: membersError } = await supabase
        .from("workspace_members")
        .select("id, user_id, role, user_profiles(first_name, last_name, email, avatar_type, avatar_bg_color, avatar_text_color, avatar_storage_path)")
        .eq("workspace_id", membership.workspace_id)

      console.log("[DEBUG] Workspace members query error:", membersError)
      console.log("[DEBUG] Workspace members data:", membersData)

      console.log("[DEBUG] Access data:", accessData)
      console.log("[DEBUG] Members data:", membersData)

      // For each creator, find the workspace member who has access to it
      creatorsWithProfiles = creatorsData.map((creator: any) => {
        // Find the creator access record for this creator
        const accessRecord = accessData?.find((access: any) => access.creator_id === creator.id)

        // Find the workspace member from the access record
        let matchingMember = null
        if (accessRecord) {
          matchingMember = membersData?.find((member: any) => member.id === accessRecord.workspace_member_id)
        }

        // If no access record found, try fallback logic for legacy data
        if (!matchingMember) {
          // For personal creator workspaces, the owner might be the creator
          if (workspaceInfo?.type === "personal_creator") {
            matchingMember = membersData?.find((member: any) => member.role === "owner")
          } else {
            // For team/manager workspaces, try to find any member with creator access
            matchingMember = membersData?.find((member: any) => member.role === "creator" || member.role === "owner")
          }
        }

        console.log(`[DEBUG] Creator ${creator.id} (${creator.name}) matched to member:`, matchingMember, 'Access record:', accessRecord)

        return {
          ...creator,
          workspace_members: matchingMember ? [matchingMember] : []
        }
      })

      console.log("[DEBUG] Final creators with profiles:", creatorsWithProfiles)
    }

    const creatorsRes = { data: creatorsWithProfiles }
    const { data: batchesData } = await supabase
      .from("batches")
      .select("*")
      .eq("workspace_id", membership.workspace_id)
      .order("created_at", { ascending: false })

    const batchesRes = { data: batchesData }

    // If we have creators now but content might not have creator_id set, try to fix it
    if (creatorsRes.data && creatorsRes.data.length > 0) {
      // Check if there's content without creator_id that should be assigned to the first creator
      const { data: contentWithoutCreator } = await supabase
        .from("content")
        .select("id")
        .eq("workspace_id", membership.workspace_id)
        .is("creator_id", null)

      if (contentWithoutCreator && contentWithoutCreator.length > 0) {
        const firstCreator = creatorsRes.data[0]
        await supabase
          .from("content")
          .update({ creator_id: firstCreator.id })
          .eq("workspace_id", membership.workspace_id)
          .is("creator_id", null)
      }

      setCreators(creatorsRes.data as any)
    } else {
      setCreators([] as any)
    }

    if (batchesRes.data) setBatches(batchesRes.data)

    if (workspaceData) {
      setWorkspaceType(workspaceData.type)
    }

    if (creatorsRes.data) {
      setCreators(creatorsRes.data as any)

    }
    if (batchesRes.data) setBatches(batchesRes.data)

    // Load platforms from workspace (similar to research page)
    if (creatorsRes.data && creatorsRes.data.length > 0) {
      const { data: workspacePlatformsData } = await supabase
        .from("creator_platforms")
        .select(`
          platform_id,
          platforms (*)
        `)
        .in("creator_id", creatorsRes.data.map((c) => c.id))

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

    setUserRole(membership.role)

    await loadContent(membership.workspace_id)
    await loadCalendarEvents(membership.workspace_id)
  }

  // Reload calendar events when content or user role changes
  useEffect(() => {
    if (workspaceId) {
      loadCalendarEvents(workspaceId)
    }
  }, [content, userRole])

  const loadContent = async (workspaceId: string) => {
    setIsLoading(true)
    console.log("[v0] Loading content for workspace:", workspaceId, "user role:", userRole)

    // Build the query based on user role
    let query = supabase
      .from("content")
      .select(
        `
        *,
        creator_id,
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

    // Apply role-based filtering
    if (userRole === "creator") {
      // Creators can only see their own content
      const userCreator = creators.find(c => c.workspace_members?.[0]?.user_id === user?.id)
      if (userCreator) {
        query = query.eq("creator_id", userCreator.id)
      }
    } else if (userRole === "editor" || userRole === "viewer") {
      // Editors and viewers can only see content they created or content assigned to them
      // For now, let's allow them to see all content but restrict editing (handled in UI)
      // This can be refined later based on specific requirements
    }
    // Owner, manager, strategist have full access (no additional filtering)

    const { data, error } = await query.order("created_at", { ascending: false })

    console.log("[v0] Content query result:", { data, error, count: data?.length || 0 })
    if (data && data.length > 0) {
      console.log("[DEBUG] Sample content items:", data.slice(0, 3).map(item => ({
        id: item.id,
        creator_id: item.creator_id,
        hook: item.hook?.substring(0, 50)
      })))
    }
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
    const { data: eventsData, error } = await supabase
      .from("calendar_events")
      .select("id, title, start_time, end_time, category, content_id")
      .eq("workspace_id", workspaceId)
      .order("start_time", { ascending: true })

    if (error) {
      console.error("[v0] Error loading calendar events:", error)
      return
    }

    if (eventsData) {
      let filteredEvents = eventsData

      // For creators, show only events attached to content they can see
      if (userRole === "creator") {
        const visibleContentIds = content.map((c) => c.id)
        filteredEvents = eventsData.filter(
          (event) => !event.content_id || visibleContentIds.includes(event.content_id),
        )
      }

      // Editors / viewers can see events for all visible content (same as above, but they already
      // see all content rows via RLS + UI filters). Owners/managers/strategists see all events.

      setCalendarEvents(filteredEvents)
    }
  }

  // Helper to get the current user's creator id (if they are a creator)
  const getCurrentCreatorId = () => {
    if (!user || !creators.length) return null
    const creatorRecord = (creators as any).find(
      (c: any) => c.workspace_members?.[0]?.user_id === user.id,
    )
    return creatorRecord?.id || null
  }

  // Role-based edit permission:
  // - owner / manager / strategist: can edit any content
  // - creator: can edit only their own content
  // - editor / viewer: cannot edit
  const canEditContent = (item?: ContentWithDetails) => {
    if (["owner", "manager", "strategist"].includes(userRole)) {
      return true
    }

    if (userRole === "creator") {
      const currentCreatorId = getCurrentCreatorId()
      if (!currentCreatorId) return false
      // For header-level checks (no item passed), allow showing create buttons
      if (!item) return true
      return item.creator_id === currentCreatorId
    }

    return false
  }

  const filteredContent = content.filter((item) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const creator = creators.find(c => c.id === item.creator_id)
      const creatorName = creator?.workspace_members?.[0]?.user_profiles
        ? `${creator.workspace_members[0].user_profiles.first_name} ${creator.workspace_members[0].user_profiles.last_name}`.toLowerCase()
        : creator?.name?.toLowerCase() || ''

      const matchesSearch =
        item.hook?.toLowerCase().includes(query) ||
        creatorName.includes(query) ||
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

    // Role-based visibility:
    // - owner / manager / strategist: can see all content
    // - creator: only see their own creator's content
    // - editor / viewer: can see all content (view-only)
    if (userRole === "creator") {
      const currentCreatorId = getCurrentCreatorId()
      if (!currentCreatorId) return false
      if (item.creator_id !== currentCreatorId) return false
    }

    // Stage filter
    if (selectedStage !== "all" && item.production_stage !== selectedStage) {
      return false
    }

    // Platform filter
    if (selectedPlatform !== "all") {
      const hasPlatform = item.content_platforms?.some((cp) => cp.platforms.id === selectedPlatform || cp.platforms.name === selectedPlatform)
      if (!hasPlatform) return false
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
      idea: "bg-red-500 text-white border-red-600",
      scripted: "bg-red-400 text-white border-red-500",
      approved: "bg-orange-400 text-white border-orange-500",
      scheduled: "bg-orange-300 text-white border-orange-400",
      shot: "bg-yellow-400 text-gray-900 border-yellow-500",
      edited: "bg-lime-400 text-gray-900 border-lime-500",
      posted: "bg-green-500 text-white border-green-600",
    }
    return colors[stage] || "bg-gray-100 text-gray-800"
  }

  const getStageBgColor = (stage: ProductionStage) => {
    const colors = {
      idea: "bg-red-50 md:bg-transparent",
      scripted: "bg-red-50 md:bg-transparent",
      approved: "bg-orange-50 md:bg-transparent",
      scheduled: "bg-orange-50 md:bg-transparent",
      shot: "bg-yellow-50 md:bg-transparent",
      edited: "bg-lime-50 md:bg-transparent",
      posted: "bg-green-50 md:bg-transparent",
    }
    return colors[stage] || "bg-gray-50 md:bg-transparent"
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
        {/* Desktop: Title with description */}
        <div className="hidden sm:flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Content</h1>
            <p className="text-muted-foreground">Plan, script, and manage your content pipeline</p>
          </div>
          <div className="flex gap-2">
            {canEditContent() && (
              <>
                <CreateBatchDialog workspaceId={workspaceId} creators={creators as any} onBatchCreated={() => loadData()} userRole={userRole} currentUserId={user?.id} />
                <CreateContentDialog
                  workspaceId={workspaceId}
                  creators={creators as any}
                  onContentCreated={() => loadContent(workspaceId)}
                  workspaceType={workspaceType}
                  userRole={userRole}
                />
              </>
            )}
          </div>
        </div>

        {/* Mobile: Create buttons only */}
        <div className="sm:hidden flex items-center gap-2">
          {canEditContent() && (
            <>
              <CreateBatchDialog workspaceId={workspaceId} creators={creators as any} onBatchCreated={() => loadData()} userRole={userRole} currentUserId={user?.id} />
              <CreateContentDialog
                workspaceId={workspaceId}
                creators={creators as any}
                onContentCreated={() => loadContent(workspaceId)}
                workspaceType={workspaceType}
                userRole={userRole}
              />
            </>
          )}
        </div>

        {/* Mobile: Search bar full width, filters below in 2x2 grid */}
        <div className="sm:hidden space-y-3">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by title, creator, pillar, platform, format..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-white w-full"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Select value={selectedBatch} onValueChange={setSelectedBatch}>
              <SelectTrigger className="w-full hover:bg-accent/20 transition-colors bg-white">
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

            {/* Hide creator filter for creator role */}
            {userRole !== "creator" && (
              <Select value={selectedCreator} onValueChange={setSelectedCreator}>
                <SelectTrigger className="w-full hover:bg-accent/20 transition-colors bg-white">
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
            )}

            <Select value={selectedStage} onValueChange={setSelectedStage}>
              <SelectTrigger className="w-full hover:bg-accent/20 transition-colors bg-white">
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

            <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
              <SelectTrigger className="w-full hover:bg-accent/20 transition-colors bg-white">
                <SelectValue placeholder="Platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Platforms</SelectItem>
                {workspacePlatforms.map((platform) => (
                  <SelectItem key={platform.id} value={platform.id}>
                    {platform.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Desktop: Search bar and filters on same row */}
        <div className="hidden sm:flex items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by title, creator, pillar, platform, format..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-white"
            />
          </div>

          <Select value={selectedBatch} onValueChange={setSelectedBatch}>
            <SelectTrigger className="w-[130px] hover:bg-accent/20 transition-colors bg-white">
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

          {userRole !== "creator" && (
            <Select value={selectedCreator} onValueChange={setSelectedCreator}>
              <SelectTrigger className="w-[130px] hover:bg-accent/20 transition-colors bg-white">
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
          )}

          <Select value={selectedStage} onValueChange={setSelectedStage}>
            <SelectTrigger className="w-[130px] hover:bg-accent/20 transition-colors bg-white">
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

          <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
            <SelectTrigger className="w-[145px] hover:bg-accent/20 transition-colors bg-white">
              <SelectValue placeholder="Platform" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              {workspacePlatforms.map((platform) => (
                <SelectItem key={platform.id} value={platform.id}>
                  {platform.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table Section */}
            {isLoading ? (
              <div className="bg-white border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-accent hover:bg-accent">
                      <TableHead className="font-semibold w-8 text-white rounded-tl-lg">
                        <Skeleton className="h-4 w-4 bg-muted" />
                      </TableHead>
                      <TableHead className="font-semibold text-white">
                        <Skeleton className="h-4 w-16 bg-muted" />
                      </TableHead>
                      <TableHead className="font-semibold text-white hidden md:table-cell">
                        <Skeleton className="h-4 w-12 bg-muted" />
                      </TableHead>
                      <TableHead className="font-semibold text-white">
                        <Skeleton className="h-4 w-14 bg-muted" />
                      </TableHead>
                      <TableHead className="font-semibold text-white hidden md:table-cell">
                        <Skeleton className="h-4 w-16 bg-muted" />
                      </TableHead>
                      <TableHead className="font-semibold text-white">
                        <Skeleton className="h-4 w-12 bg-muted" />
                      </TableHead>
                      <TableHead className="font-semibold text-white text-center">
                        <Skeleton className="h-4 w-16 bg-muted mx-auto" />
                      </TableHead>
                      <TableHead className="font-semibold text-white rounded-tr-lg">
                        <Skeleton className="h-4 w-12 bg-muted" />
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Batch header skeleton */}
                    <TableRow className="bg-accent/5 hover:bg-accent/5">
                      <TableCell className="w-8">
                        <Skeleton className="h-4 w-4 bg-muted" />
                      </TableCell>
                      <TableCell colSpan={6} className="font-semibold text-sm py-2">
                        <Skeleton className="h-4 w-48 bg-muted" />
                      </TableCell>
                    </TableRow>
                    {/* Content row skeletons */}
                    {Array.from({ length: 3 }).map((_, index) => (
                      <TableRow key={index} className="cursor-pointer hover:bg-accent/10 transition-colors">
                        <TableCell>
                          <Skeleton className="h-6 w-6 bg-muted" />
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="space-y-1">
                            <Skeleton className="h-4 w-64 bg-muted" />
                            <Skeleton className="h-3 w-32 bg-muted" />
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Skeleton className="h-5 w-16 bg-muted rounded-full" />
                        </TableCell>
                        <TableCell>
                          <div className="md:hidden flex justify-center">
                            <Skeleton className="h-6 w-6 bg-muted rounded-full" />
                          </div>
                          <div className="hidden md:block">
                            <Skeleton className="h-4 w-20 bg-muted" />
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground hidden md:table-cell">
                          <Skeleton className="h-4 w-24 bg-muted" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-16 bg-muted" />
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex gap-2 items-center justify-center">
                            <Skeleton className="h-8 w-8 bg-muted rounded" />
                            <Skeleton className="h-8 w-8 bg-muted rounded" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-16 bg-muted" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : filteredContent.length > 0 ? (
              <div className="bg-white border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-accent hover:bg-accent">
                      <TableHead className="font-semibold w-8 text-white rounded-tl-lg"></TableHead>
                      <TableHead className="font-semibold text-white">Title</TableHead>
                      <TableHead className="font-semibold text-white hidden md:table-cell">Stage</TableHead>
                      <TableHead className="font-semibold text-white">Creator</TableHead>
                      <TableHead className="font-semibold text-white hidden md:table-cell">Created By</TableHead>
                      <TableHead className="font-semibold text-white">Pillar</TableHead>
                      <TableHead className="font-semibold text-white text-center">Platforms</TableHead>
                      <TableHead className="font-semibold text-white rounded-tr-lg">Format</TableHead>
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
                            <TableCell className="w-8"></TableCell>
                            {/* Mobile: span 4 columns (Title, Creator, Pillar, Platforms) */}
                            <TableCell colSpan={4} className="font-semibold text-sm py-2 md:hidden">
                              {batch.name}
                              {formatBatchDateRange(batch)}
                            </TableCell>
                            {/* Desktop: span 6 columns (Title, Stage, Creator, Created By, Pillar, Platforms) */}
                            <TableCell colSpan={6} className="font-semibold text-sm py-2 hidden md:table-cell">
                              {batch.name}
                              {formatBatchDateRange(batch)}
                            </TableCell>
                            <TableCell className="py-2 text-right">
                              {["owner", "manager", "strategist"].includes(userRole) && (
                                <EditBatchDialog
                                  batch={batch}
                                  creators={creators as any}
                                  onBatchUpdated={() => loadData()}
                                />
                              )}
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
                                    className={`cursor-pointer hover:bg-accent/10 transition-colors ${getStageBgColor(item.production_stage)}`}
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
                                    <TableCell className="hidden md:table-cell">
                                      <Badge className={getStageColor(item.production_stage)} variant="outline">
                                        {item.production_stage}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      {/* Mobile: Avatar with hover tooltip */}
                                      <div className="md:hidden flex justify-center">
                                        {(() => {
                                          // Find the creator in the creators array using creator_id
                                          const creator = creators.find(c => c.id === item.creator_id)
                                          const creatorName = creator?.workspace_members?.[0]?.user_profiles
                                            ? `${creator.workspace_members[0].user_profiles.first_name} ${creator.workspace_members[0].user_profiles.last_name}`
                                            : creator?.name || 'Unknown Creator'

                                          console.log('[DEBUG] Content', item.id, 'creator_id', item.creator_id, 'found creator:', creator, 'Profile:', creator?.workspace_members?.[0]?.user_profiles) // Debug log

                                          return (
                                            <HoverCard>
                                              <HoverCardTrigger asChild>
                                                <div className="cursor-pointer">
                                                  <UserAvatar
                                                    profile={creator?.workspace_members?.[0]?.user_profiles || {
                                                      first_name: creatorName.split(' ')[0] || '',
                                                      last_name: creatorName.split(' ').slice(1).join(' ') || '',
                                                      avatar_type: 'initials',
                                                      avatar_bg_color: '#89cff0', // Default light blue from user_profiles
                                                      avatar_text_color: '#ffffff', // Default white from user_profiles
                                                    }}
                                                    size="xs"
                                                  />
                                                </div>
                                              </HoverCardTrigger>
                                              <HoverCardContent>
                                                <p className="text-sm font-medium">{creatorName}</p>
                                              </HoverCardContent>
                                            </HoverCard>
                                          )
                                        })()}
                                      </div>
                                      {/* Desktop: Name */}
                                      <div className="hidden md:block">
                                        {(() => {
                                          const creator = creators.find(c => c.id === item.creator_id)
                                          console.log(`[DEBUG] Content ${item.id} creator_id ${item.creator_id} found creator:`, creator)
                                          return creator?.workspace_members?.[0]?.user_profiles
                                            ? `${creator.workspace_members[0].user_profiles.first_name} ${creator.workspace_members[0].user_profiles.last_name}`
                                            : creator?.name || 'Unknown Creator'
                                        })()}
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground hidden md:table-cell">
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
                                    <TableCell className="text-center">
                                      <div className="flex flex-wrap gap-2 items-center justify-center">
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
                                            <div key={idx} className="flex items-center justify-center">
                                              <img
                                                src={iconPath || "/placeholder.svg"}
                                                alt={cp.platforms.name}
                                                className="size-8"
                                              />
                                            </div>
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
                                                  {canEditContent(item) && (
                                                    <EditContentDialog
                                                    contentId={item.id}
                                                    workspaceId={workspaceId}
                                                    creators={creators as any}
                                                    onContentUpdated={() => loadContent(workspaceId)}
                                                    workspaceType={workspaceType}
                                                    trigger={
                                                      <Button size="sm" variant="outline" className="gap-1.5 bg-white">
                                                        <Pencil className="size-4" />
                                                        <span className="text-xs">Edit</span>
                                                      </Button>
                                                    }
                                                  />
                                                  )}
                                                </div>
                                                <div className="space-y-2 text-sm">
                                                  <div>
                                                    <span className="text-muted-foreground">Stage:</span>{" "}
                                                    <Badge className={getStageColor(item.production_stage)} variant="outline">
                                                      {item.production_stage}
                                                    </Badge>
                                                  </div>
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
                                                      setSchedulingBatchId(item.batch_id || null)
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
                          <TableCell className="w-8"></TableCell>
                          {/* Mobile: span 4 columns (Title, Creator, Pillar, Platforms) */}
                          <TableCell colSpan={4} className="font-semibold text-sm py-2 md:hidden">
                            Unbatched Content
                          </TableCell>
                          {/* Desktop: span 6 columns (Title, Stage, Creator, Created By, Pillar, Platforms) */}
                          <TableCell colSpan={6} className="font-semibold text-sm py-2 hidden md:table-cell">
                            Unbatched Content
                          </TableCell>
                          <TableCell className="py-2"></TableCell>
                        </TableRow>
                        {unbatched.map((item) => {
                          const isExpanded = expandedRows.has(item.id)
                          const contentEvents = calendarEvents.filter((event) => event.content_id === item.id)

                          return (
                            <React.Fragment key={item.id}>
                              <TableRow
                                className={`cursor-pointer hover:bg-accent/10 transition-colors ${getStageBgColor(item.production_stage)}`}
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
                                <TableCell className="hidden md:table-cell">
                                  <Badge className={getStageColor(item.production_stage)} variant="outline">
                                    {item.production_stage}
                                  </Badge>
                                </TableCell>
                                    <TableCell>
                                      {/* Mobile: Avatar with hover tooltip */}
                                      <div className="md:hidden flex justify-center">
                                        {(() => {
                                          // Find the creator in the creators array using creator_id
                                          const creator = creators.find(c => c.id === item.creator_id)
                                          const creatorName = creator?.workspace_members?.[0]?.user_profiles
                                            ? `${creator.workspace_members[0].user_profiles.first_name} ${creator.workspace_members[0].user_profiles.last_name}`
                                            : creator?.name || 'Unknown Creator'

                                          console.log('[DEBUG] Content', item.id, 'creator_id', item.creator_id, 'found creator:', creator, 'Profile:', creator?.workspace_members?.[0]?.user_profiles) // Debug log

                                          return (
                                            <HoverCard>
                                              <HoverCardTrigger asChild>
                                                <div className="cursor-pointer">
                                                  <UserAvatar
                                                    profile={creator?.workspace_members?.[0]?.user_profiles || {
                                                      first_name: creatorName.split(' ')[0] || '',
                                                      last_name: creatorName.split(' ').slice(1).join(' ') || '',
                                                      avatar_type: 'initials',
                                                      avatar_bg_color: '#89cff0', // Default light blue from user_profiles
                                                      avatar_text_color: '#ffffff', // Default white from user_profiles
                                                    }}
                                                    size="xs"
                                                  />
                                                </div>
                                              </HoverCardTrigger>
                                              <HoverCardContent>
                                                <p className="text-sm font-medium">{creatorName}</p>
                                              </HoverCardContent>
                                            </HoverCard>
                                          )
                                        })()}
                                      </div>
                                      {/* Desktop: Name */}
                                      <div className="hidden md:block">
                                        {(() => {
                                          const creator = creators.find(c => c.id === item.creator_id)
                                          console.log(`[DEBUG] Content ${item.id} creator_id ${item.creator_id} found creator:`, creator)
                                          return creator?.workspace_members?.[0]?.user_profiles
                                            ? `${creator.workspace_members[0].user_profiles.first_name} ${creator.workspace_members[0].user_profiles.last_name}`
                                            : creator?.name || 'Unknown Creator'
                                        })()}
                                      </div>
                                    </TableCell>
                                <TableCell className="text-sm text-muted-foreground hidden md:table-cell">
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
                                <TableCell className="text-center">
                                  <div className="flex flex-wrap gap-2 items-center justify-center">
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
                                        <div key={idx} className="flex items-center justify-center">
                                          <img
                                            src={iconPath || "/placeholder.svg"}
                                            alt={cp.platforms.name}
                                            className="size-8"
                                          />
                                        </div>
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
                                    <div className="p-6 w-full overflow-hidden">
                                      <h4 className="font-semibold text-lg mb-4 break-words">
                                        Additional Details for "{item.hook || "Untitled Content"}"
                                      </h4>

                                      {/* Scripting - Full Width Top Section */}
                                      <Card className="mb-4 py-0">
                                        <CardContent className="px-4 py-4 space-y-3 break-words">
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

                                      <div className="grid grid-cols-2 gap-4 w-full">
                                        {/* Content Details - Left Column */}
                                        <Card className="py-0">
                                          <CardContent className="px-4 py-4 space-y-2 break-words">
                                            <div className="flex items-center justify-between">
                                              <h5 className="font-semibold">Content Details</h5>
                                              {canEditContent(item) && (
                                                <EditContentDialog
                                                contentId={item.id}
                                                workspaceId={workspaceId}
                                                creators={creators as any}
                                                onContentUpdated={() => loadContent(workspaceId)}
                                                workspaceType={workspaceType}
                                                trigger={
                                                  <Button size="sm" variant="outline" className="gap-1.5 bg-white">
                                                    <Pencil className="size-4" />
                                                    <span className="text-xs">Edit</span>
                                                  </Button>
                                                }
                                              />
                                              )}
                                            </div>
                                            <div className="space-y-2 text-sm">
                                              <div className="break-words">
                                                <span className="text-muted-foreground">Stage:</span>{" "}
                                                <Badge className={getStageColor(item.production_stage)} variant="outline">
                                                  {item.production_stage}
                                                </Badge>
                                              </div>
                                              <div className="break-words">
                                                <span className="text-muted-foreground">Content Style:</span>{" "}
                                                <span className="font-medium break-words">
                                                  {item.style
                                                    ? item.style
                                                        .split("_")
                                                        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                                                        .join(" ")
                                                    : "-"}
                                                </span>
                                              </div>
                                              <div className="break-words">
                                                <span className="text-muted-foreground">4H Framework:</span>{" "}
                                                <span className="font-medium break-words">{item.four_hs?.name || "-"}</span>
                                              </div>
                                              {item.content_content_pillars?.[0]?.content_pillars?.name ===
                                                "Storytelling" && (
                                                <div className="break-words">
                                                  <span className="text-muted-foreground">Storytelling Type:</span>{" "}
                                                  <span className="font-medium break-words">{item.storytelling_format || "-"}</span>
                                                </div>
                                              )}
                                              <div className="break-words">
                                                <span className="text-muted-foreground">Framework Day:</span>{" "}
                                                <span className="font-medium break-words">
                                                  {item.content_types
                                                    ? `${item.content_types.id} ${item.content_types.name} ${item.content_types.icon}`
                                                    : "-"}
                                                </span>
                                              </div>
                                              <div className="break-words">
                                                <span className="text-muted-foreground">Created:</span>{" "}
                                                <span className="font-medium break-words">
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
                                              <div className="break-words">
                                                <span className="text-muted-foreground">Last Updated:</span>{" "}
                                                <span className="font-medium break-words">
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
                                                <div className="break-words">
                                                  <span className="text-muted-foreground">Updated By:</span>{" "}
                                                  <span className="font-medium break-words">
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
                                          <CardContent className="px-4 py-4 break-words">
                                            <div className="flex items-center justify-between">
                                              <h5 className="font-semibold">Scheduled Events</h5>
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                className="gap-1.5 bg-white"
                                                onClick={() => {
                                                  setSchedulingContentId(item.id)
                                                  setSchedulingBatchId(item.batch_id || null)
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
                {canEditContent() && (
                  <CreateContentDialog
                    workspaceId={workspaceId}
                    creators={creators as any}
                    onContentCreated={() => loadContent(workspaceId)}
                    workspaceType={workspaceType}
                    userRole={userRole}
                  />
                )}
              </div>
            )}
      </main>

      <Footer />

      {showScheduleDialog && (
        <CreateEventDialog
          workspaceId={workspaceId}
          creators={creators as any}
          batches={batches}
          contentId={schedulingContentId}
          batchId={schedulingBatchId}
          open={showScheduleDialog}
          onOpenChange={setShowScheduleDialog}
          onEventCreated={() => {
            loadCalendarEvents(workspaceId)
            setShowScheduleDialog(false)
          }}
        />
      )}
    </div>
  )
}
