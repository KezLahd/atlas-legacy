"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { UserAvatar } from "@/components/user-avatar"
import { Plus, Crown, Activity, TrendingUp, Calendar, FileText, Search, Code } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { upgradeWorkspaceType } from "@/app/actions/workspace"
import { useToast } from "@/hooks/use-toast"

export default function TeamPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [user, setUser] = useState<any>(null)
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [workspace, setWorkspace] = useState<any>(null)
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState("team_member")
  const [isInviting, setIsInviting] = useState(false)
  const [isUpgrading, setIsUpgrading] = useState(false)
  
  // Analytics state
  const [analyticsData, setAnalyticsData] = useState<any>(null)
  const [activityLogs, setActivityLogs] = useState<any[]>([])
  const [loadingAnalytics, setLoadingAnalytics] = useState(true)
  const [timeRange, setTimeRange] = useState<"24h" | "7d" | "30d" | "90d" | "6m" | "1y">("30d")
  const [graphTimeRange, setGraphTimeRange] = useState<"24h" | "7d" | "30d" | "90d" | "6m" | "1y">("30d")
  const [selectedGraph, setSelectedGraph] = useState<string>("content-created")
  const [openTooltips, setOpenTooltips] = useState<Record<string, boolean>>({})
  const [selectedMember, setSelectedMember] = useState<string>("all")
  const [selectedActivityType, setSelectedActivityType] = useState<string>("all")
  const [selectedGraphMember, setSelectedGraphMember] = useState<string>("all")

  useEffect(() => {
    async function loadData() {
      const supabase = createClient()

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

      const { data: workspaceData } = await supabase
        .from("workspaces")
        .select("id, name, type, created_at")
        .eq("id", membership.workspace_id)
        .single()

      console.log("[v0] Loaded workspace for team:", workspaceData)
      setWorkspace(workspaceData)

      const { data: membersData } = await supabase
        .from("workspace_members")
        .select("*, user_profiles(first_name, last_name, email, avatar_type, avatar_bg_color, avatar_text_color, avatar_storage_path)")
        .eq("workspace_id", membership.workspace_id)
        .order("created_at")

      const membersList = membersData || []
      setMembers(membersList)
      
      // Load analytics data
      await loadAnalytics(membership.workspace_id, membersList)
      
      setLoading(false)
    }

    loadData()
  }, [router, timeRange])
  
  const loadAnalytics = async (workspaceId: string, membersList: any[] = []) => {
    setLoadingAnalytics(true)
    const supabase = createClient()
    
    // Calculate date filter
    const now = new Date()
    let startDate: Date
    if (timeRange === "24h") {
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    } else if (timeRange === "7d") {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    } else if (timeRange === "30d") {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    } else if (timeRange === "90d") {
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    } else if (timeRange === "6m") {
      // 6 months ago
      startDate = new Date(now)
      startDate.setMonth(startDate.getMonth() - 6)
    } else if (timeRange === "1y") {
      // 1 year ago
      startDate = new Date(now)
      startDate.setFullYear(startDate.getFullYear() - 1)
    } else {
      // Default to 30 days if somehow invalid
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    }
    
    const startDateStr = startDate.toISOString()
    
    try {
      // Get all content IDs in this workspace
      const { data: workspaceContent } = await supabase
        .from("content")
        .select("id")
        .eq("workspace_id", workspaceId)
      
      const contentIds = workspaceContent?.map((c: any) => c.id) || []
      
      // Get all research IDs in this workspace
      const { data: workspaceResearch } = await supabase
        .from("research")
        .select("id")
        .eq("workspace_id", workspaceId)
      
      const researchIds = workspaceResearch?.map((r: any) => r.id) || []
      
      // Load audit logs from all tables
      const [contentLogs, researchLogs, scriptLogs, eventLogs] = await Promise.all([
        contentIds.length > 0
          ? supabase
              .from("content_audit_log")
              .select("*")
              .in("content_id", contentIds)
              .gte("created_at", startDateStr)
              .order("created_at", { ascending: false })
          : { data: [] },
        researchIds.length > 0
          ? supabase
              .from("research_audit_log")
              .select("*")
              .in("research_id", researchIds)
              .gte("created_at", startDateStr)
              .order("created_at", { ascending: false })
          : { data: [] },
        contentIds.length > 0
          ? supabase
              .from("script_audit_log")
              .select("*")
              .in("content_id", contentIds)
              .gte("created_at", startDateStr)
              .order("created_at", { ascending: false })
          : { data: [] },
        supabase
          .from("event_audit_log")
          .select("*")
          .eq("workspace_id", workspaceId)
          .gte("created_at", startDateStr)
          .order("created_at", { ascending: false }),
      ])
      
      // Combine all logs
      const allLogs: any[] = []
      
      // Process content logs
      if (contentLogs.data) {
        contentLogs.data.forEach((log: any) => {
          allLogs.push({
            ...log,
            type: "content",
            action_display: log.action === "created" ? "Created Content" : "Updated Content",
          })
        })
      }
      
      // Process research logs
      if (researchLogs.data) {
        researchLogs.data.forEach((log: any) => {
          allLogs.push({
            ...log,
            type: "research",
            action_display: log.action === "created" ? "Created Research" : log.action === "metrics_updated" ? "Updated Research Metrics" : "Updated Research",
          })
        })
      }
      
      // Process script logs
      if (scriptLogs.data) {
        scriptLogs.data.forEach((log: any) => {
          allLogs.push({
            ...log,
            type: "script",
            action_display: log.action === "finalised" ? "Finalised Script" : log.action === "saved" ? "Saved Script" : "Script Action",
          })
        })
      }
      
      // Process event logs
      if (eventLogs.data) {
        eventLogs.data.forEach((log: any) => {
          allLogs.push({
            ...log,
            type: "event",
            action_display: log.action === "created" ? "Created Event" : log.action === "updated" ? "Updated Event" : "Deleted Event",
          })
        })
      }
      
      // Sort by date (newest first)
      allLogs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      
      setActivityLogs(allLogs)
      
      // Aggregate metrics by user
      const userMetrics: Record<string, any> = {}
      const membersToUse = membersList.length > 0 ? membersList : members
      
      membersToUse.forEach((member: any) => {
        userMetrics[member.user_id] = {
          userId: member.user_id,
          name: member.user_profiles?.first_name && member.user_profiles?.last_name
            ? `${member.user_profiles.first_name} ${member.user_profiles.last_name}`
            : "Unknown User",
          role: member.role,
          created: {
            content: 0,
            research: 0,
            script: 0,
            event: 0,
          },
          updated: {
            content: 0,
            research: 0,
            script: 0,
            event: 0,
          },
        }
      })
      
      // Count actions
      allLogs.forEach((log: any) => {
        const userId = log.user_id
        if (userMetrics[userId]) {
          // Count creations
          if (log.action === "created") {
            userMetrics[userId].created[log.type]++
          } else if (log.type === "script" && log.action === "finalised") {
            // Finalised scripts count as created scripts
            userMetrics[userId].created[log.type]++
          }
          
          // Count updates (including saved scripts and metrics updates)
          if (log.action === "updated" || log.action === "saved" || log.action === "metrics_updated") {
            userMetrics[userId].updated[log.type]++
          }
        }
      })
      
      // Convert to array and sort by total activity
      const metricsArray = Object.values(userMetrics).map((metrics: any) => ({
        ...metrics,
        totalCreated: metrics.created.content + metrics.created.research + metrics.created.script + metrics.created.event,
        totalUpdated: metrics.updated.content + metrics.updated.research + metrics.updated.script + metrics.updated.event,
        totalActivity: (metrics.created.content + metrics.created.research + metrics.created.script + metrics.created.event +
          metrics.updated.content + metrics.updated.research + metrics.updated.script + metrics.updated.event),
      })).sort((a: any, b: any) => b.totalActivity - a.totalActivity)
      
      setAnalyticsData(metricsArray)
    } catch (error) {
      console.error("Error loading analytics:", error)
    } finally {
      setLoadingAnalytics(false)
    }
  }

  function handleAddTeamMember() {
    console.log("[v0] Workspace type for team:", workspace?.type)
    if (workspace?.type === "personal_creator") {
      console.log("[v0] Personal creator - showing upgrade dialog")
      setShowUpgradeDialog(true)
      return
    }
    console.log("[v0] Not personal creator - showing invite dialog")
    setShowInviteDialog(true)
  }

  async function handleUpgrade() {
    console.log("[v0] Starting workspace upgrade to manager_of_creators...")
    setIsUpgrading(true)

    const result = await upgradeWorkspaceType(workspace.id, "manager_of_creators")

    if (result.error) {
      console.error("[v0] Error upgrading workspace:", result.error)
      alert(`Failed to upgrade: ${result.error}`)
    } else {
      console.log("[v0] Workspace upgraded successfully to manager_of_creators")
      setWorkspace({ ...workspace, type: "manager_of_creators" })
      setShowUpgradeDialog(false)
      toast({
        title: "Workspace upgraded successfully!",
        description: "You're now on Manager of Creators plan and can add team members.",
      })
      router.push("/profile/settings")
      router.refresh()
    }
    setIsUpgrading(false)
  }

  async function handleInvite() {
    if (!inviteEmail) return
    setIsInviting(true)

    console.log("[v0] Inviting:", inviteEmail, inviteRole)

    setIsInviting(false)
    setShowInviteDialog(false)
    setInviteEmail("")
    setInviteRole("team_member")
  }
  
  // Helper function to group timestamp into hourly bucket
  const getHourlyBucket = (timestamp: Date): string => {
    const date = new Date(timestamp)
    // Use local date formatting to match timezone
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`
    const hours = date.getHours()
    return `${dateStr} ${hours.toString().padStart(2, '0')}:00`
  }
  
  // Helper function to group timestamp into 6-hour bucket
  const get6HourBucket = (timestamp: Date): string => {
    const date = new Date(timestamp)
    // Use local date formatting to match timezone
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`
    const hours = date.getHours()
    const bucket = Math.floor(hours / 6) * 6
    return `${dateStr} ${bucket.toString().padStart(2, '0')}:00`
  }
  
  // Helper function to group timestamp into daily bucket
  const getDailyBucket = (timestamp: Date): string => {
    // Use local date formatting to avoid timezone issues
    const date = new Date(timestamp)
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  
  // Helper function to group timestamp into weekly bucket
  const getWeeklyBucket = (timestamp: Date): string => {
    const date = new Date(timestamp)
    const dayOfWeek = date.getDay()
    const diff = date.getDate() - dayOfWeek // Sunday = 0
    const weekStart = new Date(date)
    weekStart.setDate(diff)
    // Use local date formatting to avoid timezone issues
    const year = weekStart.getFullYear()
    const month = (weekStart.getMonth() + 1).toString().padStart(2, '0')
    const day = weekStart.getDate().toString().padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  
  // Helper function to group timestamp into monthly bucket
  const getMonthlyBucket = (timestamp: Date): string => {
    const date = new Date(timestamp)
    const year = date.getFullYear()
    const month = date.getMonth()
    return `${year}-${(month + 1).toString().padStart(2, '0')}`
  }
  
  // Helper function to parse bucket to date
  const parseBucketToDate = (bucket: string, timeRange: string): Date => {
    if (timeRange === "24h" || timeRange === "7d") {
      // Format: "2024-01-15 06:00" or "2024-01-15 14:00"
      // Parse as local time to match bucket generation
      const [date, time] = bucket.split(' ')
      const [hours, minutes] = time.split(':')
      // Use local time parsing to match how buckets are generated
      const [year, month, day] = date.split('-').map(Number)
      const dateObj = new Date(year, month - 1, day, parseInt(hours), parseInt(minutes || '0'))
      return dateObj
    } else if (timeRange === "6m" || timeRange === "1y") {
      // Format: "2024-01"
      const [year, month] = bucket.split('-')
      return new Date(parseInt(year), parseInt(month) - 1, 1)
    } else {
      // Format: "2024-01-15"
      // Parse as local date (not UTC)
      const [year, month, day] = bucket.split('-').map(Number)
      return new Date(year, month - 1, day)
    }
  }
  
  // Helper function to format bucket label
  const formatBucketLabel = (bucket: string, timeRange: string): string => {
    if (timeRange === "24h") {
      // Format: "2024-01-15 14:00" -> "2 pm" or "4 am"
      const [date, time] = bucket.split(' ')
      const [hours, minutes] = time.split(':').map(Number)
      const dateObj = new Date(date)
      dateObj.setHours(hours, minutes || 0, 0, 0)
      
      // Format as 12-hour time with am/pm
      const hour12 = hours % 12 || 12
      const ampm = hours >= 12 ? 'pm' : 'am'
      return `${hour12} ${ampm}`
    } else if (timeRange === "7d") {
      // Format: "2024-01-15 06:00"
      const [date, time] = bucket.split(' ')
      const dateObj = new Date(date)
      return `${dateObj.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })} ${time}`
    } else if (timeRange === "30d") {
      // Format: "2024-01-15"
      const dateObj = new Date(bucket)
      return dateObj.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })
    } else if (timeRange === "90d") {
      // Format: "2024-01-15" (week start)
      const dateObj = new Date(bucket)
      return dateObj.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })
    } else if (timeRange === "6m" || timeRange === "1y") {
      // Format: "2024-01" -> just "Jan", "Feb", etc. (no year)
      const [year, month] = bucket.split('-')
      const dateObj = new Date(parseInt(year), parseInt(month) - 1, 1)
      return dateObj.toLocaleDateString('en-GB', { month: 'short' })
    } else {
      // Fallback for other ranges
      return bucket
    }
  }
  
  // Generate line chart data for a specific activity type and action
  const generateActivityLineChart = (logs: any[], membersList: any[], type: string, action: string, graphTimeRangeParam?: "24h" | "7d" | "30d" | "90d" | "6m" | "1y") => {
    const timeRangeForChart = graphTimeRangeParam || graphTimeRange
    
    // Calculate date filter for graph time range
    const now = new Date()
    let graphStartDate: Date
    if (timeRangeForChart === "24h") {
      graphStartDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    } else if (timeRangeForChart === "7d") {
      graphStartDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    } else if (timeRangeForChart === "30d") {
      graphStartDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    } else if (timeRangeForChart === "90d") {
      graphStartDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    } else if (timeRangeForChart === "6m") {
      // 6 months ago
      graphStartDate = new Date(now)
      graphStartDate.setMonth(graphStartDate.getMonth() - 6)
    } else if (timeRangeForChart === "1y") {
      // 1 year ago
      graphStartDate = new Date(now)
      graphStartDate.setFullYear(graphStartDate.getFullYear() - 1)
    } else {
      // Default to 30 days if somehow invalid
      graphStartDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    }
    
    // Filter logs by type and action, and by graph time range
    const filteredLogs = logs.filter((log: any) => {
      // Filter by type and action
      let matchesType = false
      if (type === "script" && action === "finalised") {
        matchesType = log.type === type && log.action === "finalised"
      } else if (type === "script" && action === "saved") {
        matchesType = log.type === type && log.action === "saved"
      } else if (type === "research" && action === "updated") {
        // Include both "updated" and "metrics_updated" actions for research-updated graph
        matchesType = log.type === type && (log.action === "updated" || log.action === "metrics_updated")
      } else {
        matchesType = log.type === type && log.action === action
      }
      
      if (!matchesType) return false
      
      // Filter by graph time range
      const logDate = new Date(log.created_at)
      // Ensure we include logs within the exact time range
      const isInRange = logDate >= graphStartDate && logDate <= now
      return isInRange
    })
    
    // Debug logging for 24h view
    if (timeRangeForChart === "24h") {
      console.log("[v0] 24h graph filtering:", {
        graphStartDate: graphStartDate.toISOString(),
        now: now.toISOString(),
        filteredLogsCount: filteredLogs.length,
        totalLogsCount: logs.length,
        sampleLogs: filteredLogs.slice(0, 3).map((log: any) => ({
          created_at: log.created_at,
          type: log.type,
          action: log.action,
        })),
      })
    }
    
    if (filteredLogs.length === 0) {
      return (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          No data available for this activity
        </div>
      )
    }
    
    // Determine bucket function based on time range
    let bucketFunction: (timestamp: Date) => string
    if (timeRangeForChart === "24h") {
      bucketFunction = getHourlyBucket
    } else if (timeRangeForChart === "7d") {
      bucketFunction = get6HourBucket
    } else if (timeRangeForChart === "30d") {
      bucketFunction = getDailyBucket
    } else if (timeRangeForChart === "90d") {
      bucketFunction = getWeeklyBucket
    } else {
      // 6m, 1y, all
      bucketFunction = getMonthlyBucket
    }
    
    // Group logs by bucket
    const bucketMap: Record<string, any[]> = {}
    filteredLogs.forEach((log: any) => {
      const logDate = new Date(log.created_at)
      const bucket = bucketFunction(logDate)
      if (!bucketMap[bucket]) {
        bucketMap[bucket] = []
      }
      bucketMap[bucket].push(log)
    })
    
    // Get all buckets sorted
    const buckets = Object.keys(bucketMap).sort()
    
    // Get member signup dates
    const memberSignupDates: Record<string, Date> = {}
    membersList.forEach((member: any) => {
      memberSignupDates[member.user_id] = new Date(member.created_at)
    })
    
    // Create a map of all possible buckets (from earliest signup or time range start to now)
    const allBuckets: string[] = []
    
    // Get earliest member signup date
    const earliestSignup = membersList.length > 0 
      ? new Date(Math.min(...membersList.map((m: any) => new Date(m.created_at).getTime())))
      : new Date()
    
    // Calculate time range start date (reuse now from earlier)
    let timeRangeStart = new Date(0) // All time
    if (timeRangeForChart === "24h") {
      timeRangeStart = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    } else if (timeRangeForChart === "7d") {
      timeRangeStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    } else if (timeRangeForChart === "30d") {
      timeRangeStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    } else if (timeRangeForChart === "90d") {
      timeRangeStart = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    } else if (timeRangeForChart === "6m") {
      timeRangeStart = new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000)
    } else if (timeRangeForChart === "1y") {
      timeRangeStart = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
    }
    
    // For 24h and 7d, don't use earliestSignup constraint - show exact time ranges
    if (timeRangeForChart === "24h") {
      // Generate hourly buckets for last 24 hours from exact current time
      // Start from exactly 24 hours ago, rounded down to the hour
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      let currentDate = new Date(twentyFourHoursAgo)
      currentDate.setMinutes(0, 0, 0)
      // Don't use earliestSignup constraint for 24h view - show exact last 24 hours
      const endDate = new Date(now)
      endDate.setMinutes(0, 0, 0)
      while (currentDate <= endDate) {
        allBuckets.push(getHourlyBucket(currentDate))
        currentDate = new Date(currentDate.getTime() + 60 * 60 * 1000)
      }
    } else if (timeRangeForChart === "7d") {
      // Generate 6-hour buckets for last 7 days from exact current time
      // Start from exactly 7 days ago, rounded down to the nearest 6-hour bucket
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      let currentDate = new Date(sevenDaysAgo)
      const hours = currentDate.getHours()
      const bucket = Math.floor(hours / 6) * 6
      currentDate.setHours(bucket, 0, 0, 0)
      // Don't use earliestSignup constraint for 7d view - show exact last 7 days
      while (currentDate <= now) {
        allBuckets.push(get6HourBucket(currentDate))
        currentDate = new Date(currentDate.getTime() + 6 * 60 * 60 * 1000)
      }
    } else if (timeRangeForChart === "30d") {
      // Generate daily buckets for last 30 days from exact current time
      // Start from exactly 30 days ago, rounded down to start of day
      const thirtyDaysAgo = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000) // Use 29 days to get 30 days total including today
      let currentDate = new Date(thirtyDaysAgo)
      currentDate.setHours(0, 0, 0, 0)
      // Don't use earliestSignup constraint for 30d view - show exact last 30 days
      // Include today by generating buckets up to and including today
      const today = new Date(now)
      today.setHours(0, 0, 0, 0)
      while (currentDate <= today) {
        allBuckets.push(getDailyBucket(currentDate))
        currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000)
      }
    } else if (timeRangeForChart === "90d") {
      // Generate weekly buckets (7-day periods) for last 90 days from exact current time
      // Start from exactly 90 days ago, rounded down to start of week (Sunday)
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      let currentDate = new Date(ninetyDaysAgo)
      // Round down to start of week (Sunday = 0)
      const dayOfWeek = currentDate.getDay()
      currentDate.setDate(currentDate.getDate() - dayOfWeek)
      currentDate.setHours(0, 0, 0, 0)
      // Don't use earliestSignup constraint for 90d view - show exact last 90 days
      // Include current week by generating buckets up to and including the current week
      const currentWeek = new Date(now)
      const currentWeekDay = currentWeek.getDay()
      const currentWeekStart = new Date(currentWeek)
      currentWeekStart.setDate(currentWeek.getDate() - currentWeekDay)
      currentWeekStart.setHours(0, 0, 0, 0)
      while (currentDate <= currentWeekStart) {
        allBuckets.push(getWeeklyBucket(currentDate))
        currentDate = new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000)
      }
    } else if (timeRangeForChart === "6m") {
      // Generate monthly buckets for last 6 months from exact current time
      // Start from exactly 6 months ago, rounded down to start of month
      const sixMonthsAgo = new Date(now)
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5) // 5 months ago to get 6 months total including current month
      sixMonthsAgo.setDate(1)
      sixMonthsAgo.setHours(0, 0, 0, 0)
      let currentDate = new Date(sixMonthsAgo)
      // Don't use earliestSignup constraint for 6m view - show exact last 6 months
      // Include current month
      const currentMonth = new Date(now)
      currentMonth.setDate(1)
      currentMonth.setHours(0, 0, 0, 0)
      while (currentDate <= currentMonth) {
        allBuckets.push(getMonthlyBucket(currentDate))
        currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
      }
    } else if (timeRangeForChart === "1y") {
      // Generate monthly buckets for last 1 year from exact current time
      // Start from exactly 12 months ago, rounded down to start of month
      const oneYearAgo = new Date(now)
      oneYearAgo.setMonth(oneYearAgo.getMonth() - 11) // 11 months ago to get 12 months total including current month
      oneYearAgo.setDate(1)
      oneYearAgo.setHours(0, 0, 0, 0)
      let currentDate = new Date(oneYearAgo)
      // Don't use earliestSignup constraint for 1y view - show exact last 12 months
      // Include current month
      const currentMonth = new Date(now)
      currentMonth.setDate(1)
      currentMonth.setHours(0, 0, 0, 0)
      while (currentDate <= currentMonth) {
        allBuckets.push(getMonthlyBucket(currentDate))
        currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
      }
    }
    
    // Remove duplicates and sort
    const uniqueBuckets = Array.from(new Set(allBuckets)).sort()
    
    // Debug logging for 24h view
    if (timeRangeForChart === "24h") {
      console.log("[v0] 24h bucket matching:", {
        totalLogs: filteredLogs.length,
        bucketsFromLogs: buckets.slice(0, 5),
        uniqueBucketsCount: uniqueBuckets.length,
        uniqueBucketsSample: uniqueBuckets.slice(0, 5),
        sampleBucketMap: Object.keys(bucketMap).slice(0, 5).map((key) => ({
          bucket: key,
          logCount: bucketMap[key].length,
          sampleLog: bucketMap[key][0] ? {
            created_at: bucketMap[key][0].created_at,
            user_id: bucketMap[key][0].user_id,
          } : null,
        })),
      })
    }
    
    // For each member, create cumulative counts by bucket starting from signup
    // For 24h and 7d ranges, don't check signup dates - show all buckets
    const memberData: Record<string, Record<string, number>> = {}
    membersList.forEach((member: any) => {
      memberData[member.user_id] = {}
      const signupDate = memberSignupDates[member.user_id]
      
      uniqueBuckets.forEach((bucket) => {
        // For all fixed ranges (24h, 7d, 30d, 90d, 6m, 1y), show all buckets regardless of signup date
        const bucketDate = parseBucketToDate(bucket, timeRangeForChart)
        
        if (timeRangeForChart === "24h" || timeRangeForChart === "7d" || timeRangeForChart === "30d" || timeRangeForChart === "90d" || timeRangeForChart === "6m" || timeRangeForChart === "1y" || bucketDate >= signupDate) {
          memberData[member.user_id][bucket] = 0
        }
      })
    })
    
    // Count cumulative activities by member and bucket (starting from signup)
    const sortedLogs = [...filteredLogs].sort((a: any, b: any) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
    
    uniqueBuckets.forEach((bucket) => {
      const bucketDate = parseBucketToDate(bucket, timeRangeForChart)
      
      membersList.forEach((member: any) => {
        const signupDate = memberSignupDates[member.user_id]
        
        // For all fixed ranges (24h, 7d, 30d, 90d, 6m, 1y), count activities regardless of signup date
        const shouldCount = timeRangeForChart === "24h" || timeRangeForChart === "7d" || timeRangeForChart === "30d" || timeRangeForChart === "90d" || timeRangeForChart === "6m" || timeRangeForChart === "1y" || bucketDate >= signupDate
        
        if (shouldCount && memberData[member.user_id][bucket] !== undefined) {
          // Count all activities up to and including this bucket (cumulative)
          const count = sortedLogs.filter((log: any) => {
            if (log.user_id !== member.user_id) return false
            
            const logDate = new Date(log.created_at)
            
            // For all fixed ranges (24h, 7d, 30d, 90d, 6m, 1y), don't check signup date
            if (timeRangeForChart !== "24h" && timeRangeForChart !== "7d" && timeRangeForChart !== "30d" && timeRangeForChart !== "90d" && timeRangeForChart !== "6m" && timeRangeForChart !== "1y") {
              if (logDate < signupDate) return false
            }
            
            const logBucket = bucketFunction(logDate)
            
            // Compare buckets properly using dates for cumulative counting
            const logBucketDate = parseBucketToDate(logBucket, timeRangeForChart)
            const currentBucketDate = parseBucketToDate(bucket, timeRangeForChart)
            
            // Include all logs up to and including this bucket (cumulative)
            return logBucketDate <= currentBucketDate
          }).length
          memberData[member.user_id][bucket] = count
        }
      })
    })
    
    // Create chart data array (only include buckets where at least one member has data)
    const chartData = uniqueBuckets.map((bucket) => {
      // For x-axis labels: show day of week for 7d, otherwise use formatBucketLabel
      let xAxisLabel: string
      if (timeRangeForChart === "7d") {
        // Show just day of week for x-axis (full name)
        const [date, time] = bucket.split(' ')
        const [year, month, day] = date.split('-').map(Number)
        const [hours] = time.split(':').map(Number)
        const dateObj = new Date(year, month - 1, day, hours, 0, 0)
        xAxisLabel = dateObj.toLocaleDateString('en-GB', { weekday: 'long' }) // "Monday", "Tuesday", etc.
      } else {
        xAxisLabel = formatBucketLabel(bucket, timeRangeForChart)
      }
      
      const       dataPoint: any = { 
        bucket: bucket,
        date: xAxisLabel,
        fullDate: timeRangeForChart === "7d" ? (() => {
          // Full date and time for tooltip
          const [date, time] = bucket.split(' ')
          const [year, month, day] = date.split('-').map(Number)
          const [hours] = time.split(':').map(Number)
          const dateObj = new Date(year, month - 1, day, hours, 0, 0)
          const dayOfWeek = dateObj.toLocaleDateString('en-GB', { weekday: 'long' })
          const dateStr = dateObj.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })
          const hour12 = hours % 12 || 12
          const ampm = hours >= 12 ? 'pm' : 'am'
          return `${dayOfWeek}, ${dateStr}, ${hour12}:00 ${ampm}`
        })() : formatBucketLabel(bucket, timeRangeForChart)
      }
      membersList.forEach((member: any) => {
        const memberName = member.user_profiles?.first_name && member.user_profiles?.last_name
          ? `${member.user_profiles.first_name} ${member.user_profiles.last_name}`
          : "Unknown User"
        const signupDate = memberSignupDates[member.user_id]
        const bucketDate = parseBucketToDate(bucket, timeRangeForChart)
        
        // For all fixed ranges (24h, 7d, 30d, 90d, 6m, 1y), include data regardless of signup date
        if (timeRangeForChart === "24h" || timeRangeForChart === "7d" || timeRangeForChart === "30d" || timeRangeForChart === "90d" || timeRangeForChart === "6m" || timeRangeForChart === "1y" || bucketDate >= signupDate) {
          dataPoint[memberName] = memberData[member.user_id]?.[bucket] ?? 0
        } else {
          dataPoint[memberName] = 0
        }
      })
      return dataPoint
    })
    
    // Debug logging for 24h and 30d views
    if (timeRangeForChart === "24h") {
      console.log("[v0] 24h chart data:", {
        chartDataLength: chartData.length,
        sampleChartData: chartData.slice(0, 3).map((d: any) => ({
          bucket: d.bucket,
          date: d.date,
          memberValues: Object.keys(d).filter(k => k !== 'bucket' && k !== 'date').map(k => ({ [k]: d[k] })),
        })),
        memberDataSample: Object.keys(memberData).slice(0, 1).map((userId) => ({
          userId,
          buckets: Object.keys(memberData[userId]).slice(0, 5).map((bucket) => ({
            bucket,
            count: memberData[userId][bucket],
          })),
        })),
      })
    }
    
    if (timeRangeForChart === "30d") {
      console.log("[v0] 30d bucket generation:", {
        now: now.toISOString(),
        today: new Date(now).setHours(0, 0, 0, 0),
        uniqueBucketsCount: uniqueBuckets.length,
        firstBucket: uniqueBuckets[0],
        lastBucket: uniqueBuckets[uniqueBuckets.length - 1],
        last3Buckets: uniqueBuckets.slice(-3),
        chartDataLength: chartData.length,
        lastChartDataPoint: chartData[chartData.length - 1],
      })
    }
    
    // Get computed theme accent color from CSS variable
    const getThemeAccentColor = () => {
      if (typeof window !== 'undefined') {
        const computedStyle = getComputedStyle(document.documentElement)
        const accentColor = computedStyle.getPropertyValue('--theme-accent')?.trim() || computedStyle.getPropertyValue('--color-accent')?.trim()
        // If it's a hex value, return it; otherwise use default
        if (accentColor && accentColor.startsWith('#')) {
          return accentColor
        }
      }
      // Default theme accent color (baby blue)
      return "#89cff0"
    }
    
    // Get avatar badge color for each member
    const getMemberColor = (member: any) => {
      // If member has a custom avatar background color, use it
      if (member.user_profiles?.avatar_bg_color) {
        const bgColor = member.user_profiles.avatar_bg_color.trim()
        // Handle hex format
        if (bgColor.startsWith('#')) {
          return bgColor
        } else if (/^[0-9A-Fa-f]{6}$/.test(bgColor)) {
          // Hex without #
          return `#${bgColor}`
        } else if (bgColor.startsWith('hsl(') || bgColor.startsWith('hsl(var(') || bgColor.includes('var(')) {
          // HSL colors or CSS variables - use theme accent color
          // The UserAvatar component uses hsl(var(--accent)) as default
          return getThemeAccentColor()
        }
      }
      // Default to theme accent color when avatar_bg_color is not set
      return getThemeAccentColor()
    }
    
    // Theme accent color
    const themeAccentColor = getThemeAccentColor()
    
    // Generate colors for each member using their avatar badge color
    const colors = membersList.map((member: any) => {
      return getMemberColor(member) || themeAccentColor
    })
    
    // Custom tooltip formatter for 7d range
    const customTooltipFormatter = (value: any, name: string, props: any) => {
      return value
    }
    
    const customTooltipLabelFormatter = (label: string, payload: any[]) => {
      if (timeRangeForChart === "7d" && payload && payload[0] && payload[0].payload?.fullDate) {
        return payload[0].payload.fullDate
      }
      return label
    }
    
    return (
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="date" 
          interval={
            timeRangeForChart === "7d" ? 3 : 
            timeRangeForChart === "24h" ? 1 : 
            timeRangeForChart === "30d" ? 2 : 
            0
          }
        />
        <YAxis />
        <RechartsTooltip 
          formatter={customTooltipFormatter}
          labelFormatter={customTooltipLabelFormatter}
        />
        <Legend />
        {membersList.map((member: any, index: number) => {
          const memberName = member.user_profiles?.first_name && member.user_profiles?.last_name
            ? `${member.user_profiles.first_name} ${member.user_profiles.last_name}`
            : "Unknown User"
          return (
            <Line
              key={member.user_id}
              type="monotone"
              dataKey={memberName}
              stroke={colors[index] || themeAccentColor}
              strokeWidth={2}
              dot={{ r: 4 }}
            />
          )
        })}
      </LineChart>
    )
  }

  if (loading) {
    return (
        <main className="container mx-auto p-6 space-y-6 flex-1">
          <Skeleton className="h-9 w-24 bg-muted" />
          <Skeleton className="h-5 w-80 bg-muted" />

          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40 bg-muted" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-40 bg-muted" />
                      <Skeleton className="h-4 w-32 bg-muted" />
                    </div>
                    <Skeleton className="h-6 w-20 bg-muted" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </main>
    )
  }

  return (
    <>
      <main className="container mx-auto p-6 space-y-6 flex-1">
        {/* Team Members Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Team Members</h2>
            <Button
              onClick={handleAddTeamMember}
              className="bg-accent text-accent-foreground hover:bg-accent/90 border-accent"
            >
              <Plus className="size-4 mr-2" />
              Add Team Member
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {members?.map((member: any) => (
              <Card key={member.id} className="flex flex-col items-center p-6">
                <CardContent className="flex flex-col items-center space-y-3 pt-6">
                  {member.user_profiles ? (
                    <UserAvatar 
                      profile={member.user_profiles} 
                      size="lg"
                    />
                  ) : (
                    <div className="size-16 rounded-full bg-muted flex items-center justify-center text-xl font-semibold">
                      U
                    </div>
                  )}
                  <div className="text-center">
                    <p className="font-medium text-base">
                      {member.user_profiles?.first_name && member.user_profiles?.last_name
                        ? `${member.user_profiles.first_name} ${member.user_profiles.last_name}`
                        : member.user_profiles?.email || "Unknown User"}
                    </p>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {member.role}
                  </Badge>
                  <p className="text-sm text-muted-foreground">
                    Joined {new Date(member.created_at).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
              ))}
            </div>
        </div>
        
        {/* Recent Activity Timeline Table */}
        {loadingAnalytics ? (
          <div className="py-8">
            <Skeleton className="h-64 w-full" />
                </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-2xl font-semibold">Recent Activity Timeline</h2>
              <div className="flex gap-2">
                <Select value={selectedMember} onValueChange={setSelectedMember}>
                  <SelectTrigger className="w-[140px] bg-white">
                    <SelectValue placeholder="Team Member" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Members</SelectItem>
                    {members?.map((member: any) => (
                      <SelectItem key={member.id} value={member.user_id}>
                        {member.user_profiles?.first_name && member.user_profiles?.last_name
                          ? `${member.user_profiles.first_name} ${member.user_profiles.last_name}`
                          : member.user_profiles?.email || "Unknown User"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedActivityType} onValueChange={setSelectedActivityType}>
                  <SelectTrigger className="w-[130px] bg-white">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="content">Content</SelectItem>
                    <SelectItem value="research">Research</SelectItem>
                    <SelectItem value="script">Script</SelectItem>
                    <SelectItem value="event">Event</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={timeRange} onValueChange={(value: "24h" | "7d" | "30d" | "90d" | "6m" | "1y") => {
                  setTimeRange(value)
                  if (workspace) loadAnalytics(workspace.id, members)
                }}>
                  <SelectTrigger className="w-[140px] bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24h">Last 24 hours</SelectItem>
                    <SelectItem value="7d">Last 7 days</SelectItem>
                    <SelectItem value="30d">Last month</SelectItem>
                    <SelectItem value="90d">Last 90 days</SelectItem>
                    <SelectItem value="6m">Last 6 months</SelectItem>
                    <SelectItem value="1y">Last year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="bg-white border rounded-lg overflow-hidden">
              <TooltipProvider>
                <div className="max-h-96 overflow-y-auto relative">
                  <Table>
                  <TableHeader>
                    <TableRow className="bg-accent hover:bg-accent">
                      <TableHead className="text-center text-white rounded-tl-lg sticky top-0 bg-accent z-10">Team Member</TableHead>
                      <TableHead className="text-white sticky top-0 bg-accent z-10">Action</TableHead>
                      <TableHead className="text-white sticky top-0 bg-accent z-10">Type</TableHead>
                      <TableHead className="text-white sticky top-0 bg-accent z-10">Details</TableHead>
                      <TableHead className="text-white rounded-tr-lg sticky top-0 bg-accent z-10">Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="bg-white">
                    {(() => {
                      let filteredLogs = activityLogs
                      
                      // Filter by member
                      if (selectedMember !== "all") {
                        filteredLogs = filteredLogs.filter((log: any) => log.user_id === selectedMember)
                      }
                      
                      // Filter by activity type
                      if (selectedActivityType !== "all") {
                        filteredLogs = filteredLogs.filter((log: any) => log.type === selectedActivityType)
                      }
                      
                      return filteredLogs.length > 0 ? (
                        filteredLogs.slice(0, 100).map((log: any) => {
                          const member = members.find((m: any) => m.user_id === log.user_id)
                          return (
                          <TableRow key={log.id}>
                            <TableCell className="text-center">
                                {member?.user_profiles ? (
                                  <Tooltip 
                                    open={openTooltips[log.id] || undefined}
                                    onOpenChange={(open) => setOpenTooltips(prev => ({ ...prev, [log.id]: open }))}
                                  >
                                    <TooltipTrigger asChild>
                                      <div 
                                        className="flex justify-center items-center cursor-pointer"
                                        onClick={() => setOpenTooltips(prev => ({ ...prev, [log.id]: !(prev[log.id] === true) }))}
                                      >
                                        <UserAvatar 
                                          profile={member.user_profiles} 
                                          size="sm"
                                        />
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>
                                        {member.user_profiles.first_name && member.user_profiles.last_name
                                          ? `${member.user_profiles.first_name} ${member.user_profiles.last_name}`
                                          : member.user_profiles.email || "Unknown User"}
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                ) : (
                                  <Tooltip 
                                    open={openTooltips[log.id] !== undefined ? openTooltips[log.id] : undefined}
                                    onOpenChange={(open) => setOpenTooltips(prev => ({ ...prev, [log.id]: open }))}
                                  >
                                    <TooltipTrigger asChild>
                                      <div 
                                        className="size-6 rounded-full bg-muted flex items-center justify-center text-xs font-semibold mx-auto cursor-pointer"
                                        onClick={() => setOpenTooltips(prev => ({ ...prev, [log.id]: !(prev[log.id] === true) }))}
                                      >
                                        U
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Unknown User</p>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </TableCell>
                            <TableCell>
                              {(() => {
                                // Determine if action is "Created" or "Updated"
                                const isCreated = log.action === "created"
                                const actionText = isCreated ? "Created" : "Updated"
                                return (
                                  <Badge 
                                    variant="outline" 
                                    className={`capitalize ${
                                      isCreated 
                                        ? "bg-green-100 text-green-800 border-green-300" 
                                        : "bg-orange-100 text-orange-800 border-orange-300"
                                    }`}
                                  >
                                    {actionText}
                                  </Badge>
                                )
                              })()}
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant="secondary" 
                                className={
                                  log.type === "content" ? "bg-blue-100 text-blue-800" :
                                  log.type === "research" ? "bg-pink-100 text-pink-800" :
                                  log.type === "script" ? "bg-purple-100 text-purple-800" :
                                  "bg-cyan-100 text-cyan-800"
                                }
                              >
                                {log.type}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {(() => {
                                // Handle event logs with changed_fields JSON
                                if (log.type === "event" && log.changed_fields) {
                                  try {
                                    const changedFields = typeof log.changed_fields === 'string' 
                                      ? JSON.parse(log.changed_fields) 
                                      : log.changed_fields
                                    const fields = Object.keys(changedFields).filter(key => changedFields[key] === true)
                                    return fields.length > 0 ? fields.join(", ") : "-"
                                  } catch (e) {
                                    return "-"
                                  }
                                }
                                // Handle other logs with field_changed
                                return log.field_changed ? `${log.field_changed}` : "-"
                              })()}
                            </TableCell>
                            <TableCell className="text-sm">
                              {new Date(log.created_at).toLocaleString(undefined, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </TableCell>
                          </TableRow>
                        )
                      })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            No activity data available for the selected filters.
                          </TableCell>
                        </TableRow>
                      )
                    })()}
                  </TableBody>
                </Table>
              </div>
            </TooltipProvider>
            </div>
          </div>
        )}
        
        {/* Activity Comparison Chart */}
        {!loadingAnalytics && activityLogs.length > 0 && (
          <div className="space-y-4 bg-transparent">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <Select value={selectedGraph} onValueChange={setSelectedGraph}>
                <SelectTrigger className="w-[280px] border-0 border-b-2 border-accent rounded-none bg-transparent shadow-none px-0 pb-1 text-2xl font-semibold [&_svg]:!text-accent [&_svg]:opacity-100">
                  <SelectValue placeholder="Select Activity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="content-created">Created Content</SelectItem>
                  <SelectItem value="content-updated">Updated Content</SelectItem>
                  <SelectItem value="research-created">Created Research</SelectItem>
                  <SelectItem value="research-updated">Updated Research</SelectItem>
                  <SelectItem value="script-finalised">Finalised Scripts</SelectItem>
                  <SelectItem value="script-saved">Saved Scripts</SelectItem>
                  <SelectItem value="event-created">Created Events</SelectItem>
                  <SelectItem value="event-updated">Updated Events</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Select value={selectedGraphMember} onValueChange={setSelectedGraphMember}>
                  <SelectTrigger className="w-[140px] bg-white">
                    <SelectValue placeholder="Team Member" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Members</SelectItem>
                    {members?.map((member: any) => (
                      <SelectItem key={member.id} value={member.user_id}>
                        {member.user_profiles?.first_name && member.user_profiles?.last_name
                          ? `${member.user_profiles.first_name} ${member.user_profiles.last_name}`
                          : member.user_profiles?.email || "Unknown User"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={graphTimeRange} onValueChange={(value: "24h" | "7d" | "30d" | "90d" | "6m" | "1y") => {
                  setGraphTimeRange(value)
                }}>
                  <SelectTrigger className="w-[140px] bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24h">Last 24 hours</SelectItem>
                    <SelectItem value="7d">Last 7 days</SelectItem>
                    <SelectItem value="30d">Last month</SelectItem>
                    <SelectItem value="90d">Last 90 days</SelectItem>
                    <SelectItem value="6m">Last 6 months</SelectItem>
                    <SelectItem value="1y">Last year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={400}>
              {(() => {
                const filteredMembers = selectedGraphMember === "all"
                  ? members
                  : members?.filter((member: any) => member.user_id === selectedGraphMember) || []
                const [graphType, graphAction] = selectedGraph.split('-')
                return generateActivityLineChart(activityLogs, filteredMembers, graphType, graphAction, graphTimeRange)
              })()}
            </ResponsiveContainer>
          </div>
        )}
      </main>

      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-2">
              <Crown className="size-5 text-accent" />
              <DialogTitle>Upgrade to Add Team Members</DialogTitle>
            </div>
            <DialogDescription>Upgrade to Manager of Creators to add team members</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2 text-sm text-muted-foreground">
            <p>Team members are not available on the Personal Creator plan.</p>
            <p>
              Upgrade to <strong>Manager of Creators</strong> to collaborate with your team, manage multiple projects,
              and scale your content creation workflow.
            </p>
            <div className="bg-muted p-3 rounded-lg mt-4">
              <p className="font-medium mb-2">With Manager of Creators, you get:</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Unlimited team members</li>
                <li>One creator/brand</li>
                <li>Team collaboration tools</li>
                <li>Advanced workflow management</li>
              </ul>
            </div>
          </div>
          <DialogFooter className="sm:justify-between">
            <Button variant="outline" onClick={() => setShowUpgradeDialog(false)}>
              Maybe Later
            </Button>
            <Button
              onClick={handleUpgrade}
              disabled={isUpgrading}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {isUpgrading ? "Upgrading..." : "Upgrade Now"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>Send an email invitation to add a new team member to your workspace.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="colleague@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="team_member">Team Member</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  {workspace?.type !== "personal_creator" && <SelectItem value="creator">Creator</SelectItem>}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleInvite}
              disabled={!inviteEmail || isInviting}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {isInviting ? "Sending..." : "Send Invite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
