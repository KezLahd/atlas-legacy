"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AtlasLogo } from "@/components/atlas-logo"
import { ChevronLeft, ChevronRight, ChevronDown, LayoutDashboard, FileText, Search, BarChart3, Calendar, CopyPlus } from "lucide-react"
import { LineChart, ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip, Line } from "recharts"

export default function LandingPage() {
  const router = useRouter()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setIsLoggedIn(!!user)
      setIsLoading(false)
    }
    checkAuth()
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.refresh()
    setIsLoggedIn(false)
  }

  // Research demo state
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedVirality, setSelectedVirality] = useState("all")
  const [selectedPlatform, setSelectedPlatform] = useState("all")
  const [selectedPillar, setSelectedPillar] = useState("all")
  const [selectedHookType, setSelectedHookType] = useState("all")

  // Sample chart data for research demo - Jun Yuh Blockbuster over multiple days
  const sampleChartData = [
    // Day 0 - baseline at posting (Jan 8, 2026)
    {
      time: "Jan 8, 00:00",
      timestamp: new Date(2026, 0, 8, 0, 0, 0).getTime(), // Jan 8, 2026 00:00
      views: 0,
      likes: 0,
      followers: 1050000,
      date: "Jan 8",
      isStartPoint: true,
      viewsDashed: 0,
      likesDashed: 0
    },
    // Day 1 - First metrics recording (Jan 9, 2026)
    {
      time: "Jan 9, 12:00",
      timestamp: new Date(2026, 0, 9, 12, 0, 0).getTime(),
      views: 8500000,
      likes: 320000,
      followers: 1120000,
      date: "Jan 9",
      isStartPoint: false,
      viewsDashed: 8500000,
      likesDashed: 320000
    },
    // Day 2 - Second metrics recording (Jan 10, 2026)
    {
      time: "Jan 10, 12:00",
      timestamp: new Date(2026, 0, 10, 12, 0, 0).getTime(),
      views: 15200000,
      likes: 2100000,
      followers: 1150000,
      date: "Jan 10",
      isStartPoint: false,
      viewsDashed: null,
      likesDashed: null
    },
    // Day 3 - Third metrics recording (Jan 11, 2026)
    {
      time: "Jan 11, 12:00",
      timestamp: new Date(2026, 0, 11, 12, 0, 0).getTime(),
      views: 22000000,
      likes: 5800000,
      followers: 1180000,
      date: "Jan 11",
      isStartPoint: false,
      viewsDashed: null,
      likesDashed: null
    },
    // Day 4 - Fourth metrics recording (Jan 12, 2026)
    {
      time: "Jan 12, 12:00",
      timestamp: new Date(2026, 0, 12, 12, 0, 0).getTime(),
      views: 25600000,
      likes: 7200000,
      followers: 1200000,
      date: "Jan 12",
      isStartPoint: false,
      viewsDashed: null,
      likesDashed: null
    },
    // Day 5 - Latest metrics recording (Jan 13, 2026)
    {
      time: "Jan 13, 12:00",
      timestamp: new Date(2026, 0, 13, 12, 0, 0).getTime(),
      views: 27500000,
      likes: 8300000,
      followers: 1220000,
      date: "Jan 13",
      isStartPoint: false,
      viewsDashed: null,
      likesDashed: null
    },
    // Day 6 - Most recent metrics (Jan 14, 2026)
    {
      time: "Jan 14, 12:00",
      timestamp: new Date(2026, 0, 14, 12, 0, 0).getTime(),
      views: 28700000,
      likes: 8900000,
      followers: 1220000,
      date: "Jan 14",
      isStartPoint: false,
      viewsDashed: null,
      likesDashed: null
    }
  ]

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M'
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K'
    }
    return num.toString()
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
        return "bg-gray-100 text-gray-800 border-gray-200" // dormant - gray
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-white dark:bg-slate-900">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <AtlasLogo className="size-8" showText />
          <nav className="hidden md:flex items-center gap-6">
            {isLoggedIn ? (
              <>
                <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
                  Dashboard
                </Link>
                <Button onClick={handleLogout} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  Log Out
                </Button>
              </>
            ) : (
              <>
                <Link href="/auth/login" className="text-sm text-muted-foreground hover:text-foreground">
                  Login
                </Link>
                <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  <Link href="/auth/sign-up">Get Started</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-4 py-20 md:py-32 bg-gradient-to-b from-accent/10 to-transparent">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h1 className="text-4xl md:text-6xl font-bold text-balance leading-tight">
            Carry the weight of your <span className="text-accent">brand</span>.
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground text-balance max-w-2xl mx-auto">
            Atlas is the creator-first content operating system for planning, producing, batching, and analyzing your
            personal brand content.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            {isLoggedIn ? (
              <>
                <Button size="lg" asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  <Link href="/dashboard">Dashboard</Link>
                </Button>
                <Button size="lg" onClick={handleLogout} variant="outline" className="border-muted bg-transparent">
                  Log Out
                </Button>
              </>
            ) : (
              <>
                <Button size="lg" asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  <Link href="/auth/sign-up">Get Started Free</Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="border-muted bg-transparent">
                  <Link href="/auth/login">Learn More</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section className="border-t bg-background">
        <div className="container mx-auto px-4 py-20">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl md:text-4xl font-bold">See Atlas in action</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Experience the power of Atlas with real interface previews from our content management system.
            </p>
          </div>

          {/* App Navigation Demo */}
          <div className="max-w-5xl mx-auto mb-6">
            <div className="bg-white border rounded-lg px-6 py-4">
              <div className="flex items-center justify-between">
                <AtlasLogo className="size-8" showText />
                <nav className="flex items-center gap-1">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground">
                    <LayoutDashboard className="size-4" />
                    <span className="hidden md:inline">Dashboard</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground">
                    <FileText className="size-4" />
                    <span className="hidden md:inline">Content</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground">
                    <Search className="size-4" />
                    <span className="hidden md:inline">Research</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground">
                    <BarChart3 className="size-4" />
                    <span className="hidden md:inline">Analytics</span>
                  </div>
                </nav>
                <div className="w-20"></div>
              </div>
            </div>
          </div>

          {/* Sample Calendar */}
          <div className="max-w-5xl mx-auto mb-20">
              {/* Calendar Header */}
              <div className="flex items-center justify-between gap-4 mb-6">
                <Button variant="outline" size="icon" disabled>
                  <ChevronLeft className="size-4" />
                </Button>
                <h3 className="text-2xl font-bold flex-1 text-center">
                  January 2026
                </h3>
                <Button variant="outline" size="icon" disabled>
                  <ChevronRight className="size-4" />
                </Button>
              </div>

              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-2 pl-10 mb-2">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                  <div key={day} className="text-center text-sm font-semibold text-muted-foreground py-1">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Weeks */}
              <div className="space-y-2">
                {/* Week 1 (Jan 1-7, 2026) - starts on Wednesday */}
                <div className="flex gap-2">
                  <div className="flex-shrink-0 w-8 self-stretch flex items-center justify-center text-xs font-semibold text-muted-foreground">
                    1
                  </div>
                  <div className="grid grid-cols-7 gap-x-2 flex-1">
                    {/* Empty cells for Mon-Tue */}
                    <div className="min-h-32 rounded-lg p-3 bg-transparent"></div>
                    <div className="min-h-32 rounded-lg p-3 bg-transparent"></div>

                    {/* Jan 1-5 (Wed-Sun) - past dates */}
                    {Array.from({length: 5}, (_, i) => {
                      const day = i + 1
                      return (
                        <div
                          key={day}
                          className="min-h-32 rounded-lg p-3 bg-white/60 border border-muted-foreground/20 opacity-60"
                        >
                          <div className="text-sm font-semibold mb-2 text-muted-foreground">
                            {day}
                          </div>
                          {day === 3 && (
                            <div className="space-y-1">
                              <div className="text-xs p-1.5 rounded truncate cursor-pointer border bg-pink-100 text-pink-700 border-pink-200 opacity-50 line-through">
                                10:00 | Film: Product Demo
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Week 2 (Jan 6-12, 2026) */}
                <div className="flex gap-2">
                  <div className="flex-shrink-0 w-8 self-stretch flex items-center justify-center text-xs font-semibold text-muted-foreground">
                    2
                  </div>
                  <div className="grid grid-cols-7 gap-x-2 flex-1">
                    {/* Jan 6-8 - past dates */}
                    {Array.from({length: 3}, (_, i) => {
                      const day = i + 6
                      const isToday = day === 8
                      return (
                        <div
                          key={day}
                          className={`min-h-32 rounded-lg p-3 transition-colors ${
                            isToday
                              ? "border-2 ring-2 bg-accent/30 border-accent ring-accent/40"
                              : "bg-white/60 border border-muted-foreground/20 opacity-60"
                          }`}
                        >
                          <div className={`text-sm font-semibold mb-2 ${isToday ? "font-bold text-lg" : "text-muted-foreground"}`}>
                            {day}
                          </div>
                          {day === 8 && (
                            <div className="space-y-1">
                              <div className="text-xs p-1.5 rounded truncate cursor-pointer bg-blue-500 text-white border-transparent">
                                14:00 | Edit: Tutorial
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}

                    {/* Jan 9-12 - future dates */}
                    {Array.from({length: 4}, (_, i) => {
                      const day = i + 9
                      return (
                        <div
                          key={day}
                          className="min-h-32 rounded-lg p-3 bg-white border border-border"
                        >
                          <div className="text-sm font-semibold mb-2 text-foreground">
                            {day}
                          </div>
                          {day === 10 && (
                            <div className="space-y-1">
                              <div className="text-xs p-1.5 rounded truncate cursor-pointer border bg-purple-100 text-purple-700 border-purple-200">
                                11:00 | Team Planning
                              </div>
                            </div>
                          )}
                          {day === 12 && (
                            <div className="space-y-1">
                              <div className="text-xs p-1.5 rounded truncate cursor-pointer border bg-pink-100 text-pink-700 border-pink-200">
                                09:00 | Film: Interview
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Week 3 (Jan 13-19, 2026) */}
                <div className="flex gap-2">
                  <div className="flex-shrink-0 w-8 self-stretch flex items-center justify-center text-xs font-semibold text-muted-foreground">
                    3
                  </div>
                  <div className="grid grid-cols-7 gap-x-2 flex-1">
                    {Array.from({length: 7}, (_, i) => {
                      const day = i + 13
                      return (
                        <div
                          key={day}
                          className="min-h-32 rounded-lg p-3 bg-white border border-border"
                        >
                          <div className="text-sm font-semibold mb-2 text-foreground">
                            {day}
                          </div>
                          {day === 15 && (
                            <div className="space-y-1">
                              <div className="text-xs p-1.5 rounded truncate cursor-pointer border bg-orange-100 text-orange-700 border-orange-200">
                                15:00 | Review Meeting
                              </div>
                              <div className="text-xs p-1.5 rounded truncate cursor-pointer border bg-blue-100 text-blue-700 border-blue-200">
                                16:30 | Edit: Behind Scenes
                              </div>
                            </div>
                          )}
                          {day === 17 && (
                            <div className="space-y-1">
                              <div className="text-xs p-1.5 rounded truncate cursor-pointer border bg-green-100 text-green-700 border-green-200">
                                10:00 | Post Content
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-pink-500"></div>
                  <span className="text-muted-foreground">Filming</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-blue-500"></div>
                  <span className="text-muted-foreground">Editing</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-purple-500"></div>
                  <span className="text-muted-foreground">Meeting</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-orange-500"></div>
                  <span className="text-muted-foreground">Review</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-green-500"></div>
                  <span className="text-muted-foreground">Posting</span>
                </div>
              </div>
          </div>

          {/* Content Page Demo Header */}
          <div className="max-w-6xl mx-auto mb-6">
            <div className="bg-white border rounded-lg px-6 py-4">
              <div className="flex items-center justify-between">
                <AtlasLogo className="size-8" showText />
                <nav className="flex items-center gap-1">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground">
                    <LayoutDashboard className="size-4" />
                    <span className="hidden md:inline">Dashboard</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground">
                    <FileText className="size-4" />
                    <span className="hidden md:inline">Content</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground">
                    <Search className="size-4" />
                    <span className="hidden md:inline">Research</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground">
                    <BarChart3 className="size-4" />
                    <span className="hidden md:inline">Analytics</span>
                  </div>
                </nav>
                <div className="w-20"></div>
              </div>
            </div>
          </div>

          {/* Content Page Header */}
          <div className="max-w-6xl mx-auto mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">Content</h1>
                <p className="text-muted-foreground">Plan, script, and manage your content pipeline</p>
              </div>
            </div>
          </div>

          {/* Content Filters */}
          <div className="max-w-6xl mx-auto mb-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Search bar */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search by title, creator, pillar, platform, format..."
                  className="pl-9 bg-white"
                  disabled
                />
              </div>

              {/* Filter buttons */}
              <div className="flex flex-wrap gap-2 justify-end">
                <Select disabled>
                  <SelectTrigger className="w-[130px] bg-white">
                    <SelectValue placeholder="All Batches" />
                  </SelectTrigger>
                </Select>

                <Select disabled>
                  <SelectTrigger className="w-[130px] bg-white">
                    <SelectValue placeholder="All Creators" />
                  </SelectTrigger>
                </Select>
              </div>
            </div>
          </div>

          {/* Sample Content Table */}
          <div className="max-w-6xl mx-auto bg-white border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-accent hover:bg-accent">
                  <TableHead className="w-8 text-white font-semibold"></TableHead>
                  <TableHead className="text-white font-semibold">Title</TableHead>
                  <TableHead className="text-white font-semibold">Stage</TableHead>
                  <TableHead className="text-white font-semibold">Creator</TableHead>
                  <TableHead className="text-white font-semibold">Created By</TableHead>
                  <TableHead className="text-white font-semibold">Pillar</TableHead>
                  <TableHead className="text-white font-semibold text-center">Platforms</TableHead>
                  <TableHead className="text-white font-semibold">Format</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Regular Row */}
                <TableRow className="hover:bg-accent/5">
                  <TableCell className="w-8">
                    <Button variant="ghost" size="sm" className="p-0 h-6 w-6" disabled>
                      <ChevronDown className="size-4" />
                    </Button>
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="space-y-1">
                      <p>How to Build a Personal Brand</p>
                      <p className="text-xs text-muted-foreground">Q1 Content</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200" variant="outline">
                      Scripted
                    </Badge>
                  </TableCell>
                  <TableCell>John Smith</TableCell>
                  <TableCell className="text-sm text-muted-foreground">John Doe</TableCell>
                  <TableCell>
                    <span className="text-xs">Personal Branding</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center">
                      <img src="/icons/youtube.svg" alt="YouTube" className="size-8" />
                    </div>
                  </TableCell>
                  <TableCell>Long-form Video</TableCell>
                </TableRow>

                {/* Expanded Row */}
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={8} className="bg-accent/5 hover:bg-accent/10 transition-colors p-0">
                    <div className="p-6">
                      <h4 className="font-semibold text-lg mb-4">
                        Additional Details for "How to Build a Personal Brand"
                      </h4>

                      {/* Scripting - Full Width Top Section */}
                      <div className="bg-card rounded-lg p-4 mb-4 border">
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="font-semibold">Scripting</h5>
                          <Button size="sm" variant="outline" className="gap-1.5 bg-white" disabled>
                            <FileText className="size-4" />
                            <span className="text-xs">Script</span>
                          </Button>
              </div>
                        <div className="text-sm">
                          <div className="border rounded-md overflow-hidden">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-accent hover:bg-accent">
                                  <TableHead className="w-12 text-center text-white font-semibold">#</TableHead>
                                  <TableHead className="text-white font-semibold bg-primary">Audio (What to say)</TableHead>
                                  <TableHead className="text-white font-semibold bg-accent/20 text-primary">Visuals (What to show)</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                <TableRow>
                                  <TableCell className="text-center text-muted-foreground font-medium">1</TableCell>
                                  <TableCell className="border-l border-r border-border">
                                    <p className="text-primary whitespace-pre-wrap">
                                      "Did you know that 90% of personal brands fail because of this one mistake?"
                                    </p>
                                  </TableCell>
                                  <TableCell className="border-r border-border">
                                    <p className="text-[hsl(var(--theme-accent-dark))] whitespace-pre-wrap">
                                      Dramatic pause, text overlay appears on screen
                                    </p>
                                  </TableCell>
                                </TableRow>
                                <TableRow>
                                  <TableCell className="text-center text-muted-foreground font-medium">2</TableCell>
                                  <TableCell className="border-l border-r border-border">
                                    <p className="text-primary whitespace-pre-wrap">
                                      "Most creators focus on the wrong metrics and wonder why they're not growing."
                                    </p>
                                  </TableCell>
                                  <TableCell className="border-r border-border">
                                    <p className="text-[hsl(var(--theme-accent-dark))] whitespace-pre-wrap">
                                      Show generic analytics dashboard, red X marks over wrong metrics
                                    </p>
                                  </TableCell>
                                </TableRow>
                                <TableRow>
                                  <TableCell className="text-center text-muted-foreground font-medium">3</TableCell>
                                  <TableCell className="border-l border-r border-border">
                                    <p className="text-primary whitespace-pre-wrap">
                                      "The key is focusing on audience retention and engagement over vanity metrics."
                                    </p>
                                  </TableCell>
                                  <TableCell className="border-r border-border">
                                    <p className="text-[hsl(var(--theme-accent-dark))] whitespace-pre-wrap">
                                      Green checkmarks on correct metrics, audience engagement graphs
                                    </p>
                                  </TableCell>
                                </TableRow>
                                <TableRow>
                                  <TableCell className="text-center text-muted-foreground font-medium">4</TableCell>
                                  <TableCell className="border-l border-r border-border">
                                    <p className="text-primary whitespace-pre-wrap">
                                      "Start tracking the right metrics today and watch your brand grow."
                                    </p>
                                  </TableCell>
                                  <TableCell className="border-r border-border">
                                    <p className="text-[hsl(var(--theme-accent-dark))] whitespace-pre-wrap">
                                      Call-to-action overlay with subscribe button, growth chart animation
                                    </p>
                                  </TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      </div>

                      {/* Content Details and Scheduled Events */}
                      <div className="grid grid-cols-2 gap-4">
                        {/* Content Details - Left Column */}
                        <div className="bg-card rounded-lg p-4 border">
                          <div className="flex items-center justify-between mb-3">
                            <h5 className="font-semibold">Content Details</h5>
                            <Button size="sm" variant="outline" className="gap-1.5 bg-white" disabled>
                              <ChevronDown className="size-4" />
                              <span className="text-xs">Edit</span>
                            </Button>
                          </div>
                          <div className="space-y-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">Content Style:</span>{" "}
                              <span className="font-medium">Talking Head</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">4H Framework:</span>{" "}
                              <span className="font-medium">Hero's Journey</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Framework Day:</span>{" "}
                              <span className="font-medium">1 Introduction</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Created:</span>{" "}
                              <span className="font-medium">15/01/2025, 14:30</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Last Updated:</span>{" "}
                              <span className="font-medium">16/01/2025, 09:15</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Updated By:</span>{" "}
                              <span className="font-medium">John Doe</span>
                            </div>
            </div>
              </div>

                        {/* Scheduled Events - Right Column */}
                        <div className="bg-card rounded-lg p-4 border">
                          <div className="flex items-center justify-between mb-3">
                            <h5 className="font-semibold">Scheduled Events</h5>
                            <Button size="sm" variant="outline" className="gap-1.5 bg-white" disabled>
                              <Calendar className="size-4" />
                              <span className="text-xs">Schedule</span>
                            </Button>
            </div>
                          <div className="border rounded-md overflow-hidden">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-accent hover:bg-accent">
                                  <TableHead className="text-xs h-8 py-1 text-white">Date</TableHead>
                                  <TableHead className="text-xs h-8 py-1 text-white">Time</TableHead>
                                  <TableHead className="text-xs h-8 py-1 text-white">Title</TableHead>
                                  <TableHead className="text-xs h-8 py-1 text-white">Category</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                <TableRow className="bg-orange-100 border-orange-200 opacity-50">
                                  <TableCell className="text-xs py-1 line-through">05/01</TableCell>
                                  <TableCell className="text-xs py-1 line-through">15:00</TableCell>
                                  <TableCell className="text-xs py-1 line-through">Team Review</TableCell>
                                  <TableCell className="text-xs py-1 line-through">Review</TableCell>
                                </TableRow>
                                <TableRow className="bg-purple-100 border-purple-200 opacity-50">
                                  <TableCell className="text-xs py-1 line-through">07/01</TableCell>
                                  <TableCell className="text-xs py-1 line-through">11:00</TableCell>
                                  <TableCell className="text-xs py-1 line-through">Strategy Meeting</TableCell>
                                  <TableCell className="text-xs py-1 line-through">Meeting</TableCell>
                                </TableRow>
                                <TableRow className="bg-pink-100 border-pink-200">
                                  <TableCell className="text-xs py-1">18/01</TableCell>
                                  <TableCell className="text-xs py-1">10:00</TableCell>
                                  <TableCell className="text-xs py-1">Film: Product Demo</TableCell>
                                  <TableCell className="text-xs py-1">Filming</TableCell>
                                </TableRow>
                                <TableRow className="bg-blue-100 border-blue-200">
                                  <TableCell className="text-xs py-1">20/01</TableCell>
                                  <TableCell className="text-xs py-1">14:00</TableCell>
                                  <TableCell className="text-xs py-1">Edit: Tutorial</TableCell>
                                  <TableCell className="text-xs py-1">Editing</TableCell>
                                </TableRow>
                                <TableRow className="bg-green-100 border-green-200">
                                  <TableCell className="text-xs py-1">25/01</TableCell>
                                  <TableCell className="text-xs py-1">11:00</TableCell>
                                  <TableCell className="text-xs py-1">Post Content</TableCell>
                                  <TableCell className="text-xs py-1">Posting</TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>
              </div>
            </div>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>

                {/* Additional Content Rows */}
                <TableRow className="hover:bg-accent/5">
                  <TableCell className="w-8">
                    <Button variant="ghost" size="sm" className="p-0 h-6 w-6" disabled>
                      <ChevronRight className="size-4" />
                    </Button>
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="space-y-1">
                      <p>Social Media Strategy Guide</p>
                      <p className="text-xs text-muted-foreground">Q1 Content</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-green-100 text-green-800 border-green-200" variant="outline">
                      Approved
                    </Badge>
                  </TableCell>
                  <TableCell>Sarah Wilson</TableCell>
                  <TableCell className="text-sm text-muted-foreground">Jane Smith</TableCell>
                  <TableCell>
                    <span className="text-xs">Social Media</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center">
                      <img src="/icons/instagram.svg" alt="Instagram" className="size-8" />
                    </div>
                  </TableCell>
                  <TableCell>Short Video</TableCell>
                </TableRow>

                <TableRow className="hover:bg-accent/5">
                  <TableCell className="w-8">
                    <Button variant="ghost" size="sm" className="p-0 h-6 w-6" disabled>
                      <ChevronRight className="size-4" />
                    </Button>
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="space-y-1">
                      <p>Behind the Scenes: Content Creation</p>
                      <p className="text-xs text-muted-foreground">Q1 Content</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-blue-100 text-blue-800 border-blue-200" variant="outline">
                      Shot
                    </Badge>
                  </TableCell>
                  <TableCell>Mike Johnson</TableCell>
                  <TableCell className="text-sm text-muted-foreground">Mike Johnson</TableCell>
                  <TableCell>
                    <span className="text-xs">Behind the Scenes</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center">
                      <img src="/icons/tiktok.svg" alt="TikTok" className="size-8" />
                    </div>
                  </TableCell>
                  <TableCell>Short Video</TableCell>
                </TableRow>

                <TableRow className="hover:bg-accent/5">
                  <TableCell className="w-8">
                    <Button variant="ghost" size="sm" className="p-0 h-6 w-6" disabled>
                      <ChevronRight className="size-4" />
                    </Button>
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="space-y-1">
                      <p>Client Success Story</p>
                      <p className="text-xs text-muted-foreground">Client Work</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200" variant="outline">
                      Scripted
                    </Badge>
                  </TableCell>
                  <TableCell>Alex Chen</TableCell>
                  <TableCell className="text-sm text-muted-foreground">Alex Chen</TableCell>
                  <TableCell>
                    <span className="text-xs">Case Study</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center">
                      <img src="/icons/linkedin.svg" alt="LinkedIn" className="size-8" />
                    </div>
                  </TableCell>
                  <TableCell>Long-form Video</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
      </section>

      {/* Research Page Demo */}
      <section className="py-16 border-t bg-background">
        <div className="container mx-auto px-4">
          {/* App Navigation Demo for Research */}
          <div className="border-b bg-white dark:bg-slate-900 mb-8">
            <div className="container mx-auto px-4 py-4 flex items-center justify-between">
              <AtlasLogo className="size-8" showText />
              <nav className="flex items-center gap-6">
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground"
                >
                  <LayoutDashboard className="size-4" />
                  <span className="hidden md:inline">Dashboard</span>
                </div>
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground"
                >
                  <FileText className="size-4" />
                  <span className="hidden md:inline">Content</span>
                </div>
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground"
                >
                  <Search className="size-4" />
                  <span className="hidden md:inline">Research</span>
                </div>
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground"
                >
                  <BarChart3 className="size-4" />
                  <span className="hidden md:inline">Analytics</span>
                </div>
              </nav>
              <div className="hidden md:flex items-center gap-6">
                {/* Placeholder for profile/settings */}
          </div>
            </div>
          </div>

          {/* Research Page Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-3xl font-bold">Research</h2>
                <p className="text-muted-foreground">Deconstruct viral content and learn what works</p>
              </div>
              <div className="flex gap-2">
                {/* Removed Create Research button */}
              </div>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              {/* Search bar - left aligned, increased width */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search by creator, platform, pillar, hook..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-white"
                  disabled // Disabled for demo
                />
              </div>

              {/* Filter buttons - right aligned, reduced width, wraps when needed */}
              <div className="flex flex-wrap gap-2 justify-end">
                <Select value={selectedVirality} onValueChange={setSelectedVirality} disabled>
                  <SelectTrigger className="w-[130px] hover:bg-accent/20 transition-colors bg-white">
                    <SelectValue placeholder="Virality" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Virality</SelectItem>
                    <SelectItem value="blockbuster">Blockbuster</SelectItem>
                    <SelectItem value="viral">Viral</SelectItem>
                    <SelectItem value="breakout">Breakout</SelectItem>
                    <SelectItem value="steady">Steady</SelectItem>
                    <SelectItem value="dormant">Dormant</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={selectedPlatform} onValueChange={setSelectedPlatform} disabled>
                  <SelectTrigger className="w-[145px] hover:bg-accent/20 transition-colors bg-white">
                    <SelectValue placeholder="Platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Platforms</SelectItem>
                    <SelectItem value="YouTube">YouTube</SelectItem>
                    <SelectItem value="TikTok">TikTok</SelectItem>
                    <SelectItem value="Instagram">Instagram</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={selectedPillar} onValueChange={setSelectedPillar} disabled>
                  <SelectTrigger className="w-[130px] hover:bg-accent/20 transition-colors bg-white">
                    <SelectValue placeholder="Pillar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Pillars</SelectItem>
                    <SelectItem value="Storytelling">Storytelling</SelectItem>
                    <SelectItem value="Educational">Educational</SelectItem>
                    <SelectItem value="Authority">Authority</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={selectedHookType} onValueChange={setSelectedHookType} disabled>
                  <SelectTrigger className="w-[130px] hover:bg-accent/20 transition-colors bg-white">
                    <SelectValue placeholder="Hook Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Hooks</SelectItem>
                    <SelectItem value="written">Written</SelectItem>
                    <SelectItem value="visual">Visual</SelectItem>
                    <SelectItem value="verbal">Verbal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Research Table */}
            <div className="border rounded-lg overflow-hidden bg-white">
              <Table>
                <TableHeader>
                  <TableRow className="bg-accent hover:bg-accent">
                    <TableHead className="text-white w-8"></TableHead>
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
                  {/* Jun Yuh - Blockbuster */}
                  <TableRow className="hover:bg-accent/5">
                    <TableCell>
                      <Button variant="ghost" size="sm" className="p-0 h-6 w-6" disabled>
                        <ChevronRight className="size-4" />
                      </Button>
                    </TableCell>
                    <TableCell className="py-0">
                      <img
                        src="https://vmyasmlyddbtaestuwua.supabase.co/storage/v1/object/public/thumbnails/jun_yuh.JPEG"
                        alt="Jun Yuh thumbnail"
                        className="w-24 h-28 object-cover rounded"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center">
                        <img src="/icons/tiktok.svg" alt="TikTok" className="size-8" />
                      </div>
                    </TableCell>
                    <TableCell className="font-bold">@jun_yuh</TableCell>
                    <TableCell>28.7M</TableCell>
                    <TableCell>
                      <Badge className={getViralityColor("blockbuster")}>
                        Blockbuster
                      </Badge>
                    </TableCell>
                    <TableCell className="break-words">Authority</TableCell>
                    <TableCell className="break-words">Client Results</TableCell>
                    <TableCell className="max-w-md text-xs">
                      <span className="truncate">How I built a $10M business in 2 years</span>
                    </TableCell>
                  </TableRow>

                  {/* Expanded Row Example - Jun Yuh */}
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={9} className="bg-accent/5 hover:bg-accent/10 transition-colors p-0">
                      <div className="p-6">
                        <div className="grid grid-cols-2 gap-6">
                          {/* Left Column - Content Details */}
                          <div className="flex flex-col space-y-4 h-full">
                            <div>
                              <h4 className="font-semibold mb-2">Content Details</h4>
                              <div className="space-y-2 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Format:</span>{" "}
                                  <span className="font-medium">Short-form Video</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Production:</span>{" "}
                                  <span className="font-medium">SFX, B-Roll, Music</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Avg Clip Length:</span>{" "}
                                  <span className="font-medium">15-30s</span>
                                </div>
                              </div>
                            </div>

                            <div className="pt-4">
                              <h5 className="font-semibold mb-3">Timestamps</h5>
                              <div className="space-y-2 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Posted:</span>{" "}
                                  <span className="font-medium">08/01/2026</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Last Updated:</span>{" "}
                                  <span className="font-medium">12/01/2026</span>
                                </div>
                              </div>
                            </div>

                            {/* Followers with change since first recording */}
                            {(() => {
                              const firstRecording = sampleChartData.find((point) => !point.isStartPoint)
                              const latestRecording = sampleChartData[sampleChartData.length - 1]
                              const firstFollowers = firstRecording?.followers || 1050000
                              const latestFollowers = latestRecording?.followers || 1220000
                              const followerChange = latestFollowers - firstFollowers

                              const formatNumber = (num: number) => {
                                if (num >= 1000000) {
                                  return `${(num / 1000000).toFixed(1)}M`
                                } else if (num >= 1000) {
                                  return `${(num / 1000).toFixed(1)}k`
                                }
                                return num.toString()
                              }

                              return (
                                <div className="pt-4">
                                  <div className="text-sm">
                                    <span className="font-semibold">Followers:</span>{" "}
                                    <span className="font-medium">{formatNumber(latestFollowers)}</span>{" "}
                                    <span className={`font-medium ${followerChange >= 0 ? "text-green-600" : "text-red-600"}`}>
                                      ({followerChange >= 0 ? "+" : ""}{formatNumber(Math.abs(followerChange))} since first record)
                                    </span>
                                  </div>
                                </div>
                              )
                            })()}

                            {/* Edit and Templatise buttons at bottom left */}
                            <div className="flex justify-start gap-2 mt-auto">
                              <div className="[&_button]:bg-accent [&_button]:hover:bg-accent/90 [&_button]:text-accent-foreground">
                                <Button variant="outline" size="sm" disabled>
                                  Edit
                                </Button>
                              </div>
                              <Button
                                size="sm"
                                className="bg-primary hover:bg-primary/90 text-white"
                                disabled
                              >
                                <CopyPlus className="mr-2 size-4" />
                                Templatise
                              </Button>
                            </div>
                          </div>

                          {/* Right Column - Growth Chart */}
                          <div className="flex flex-col space-y-4 h-full">
                            <div className="flex-1">
                              <div className="h-full min-h-0">
                                <ResponsiveContainer width="100%" height="100%">
                                  <LineChart data={sampleChartData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis
                                      dataKey="timestamp"
                                      type="number"
                                      scale="time"
                                      domain={['dataMin', 'dataMax']}
                                      fontSize={12}
                                      tick={{ fill: '#666' }}
                                      tickFormatter={(timestamp) => {
                                        const date = new Date(timestamp)
                                        return date.toLocaleDateString('en-US', {
                                          month: 'short',
                                          day: 'numeric'
                                        })
                                      }}
                                    />
                                    <YAxis
                                      yAxisId="left"
                                      orientation="left"
                                      fontSize={12}
                                      tick={{ fill: '#666' }}
                                      tickFormatter={(value) => {
                                        if (value >= 1000000) {
                                          return `${(value / 1000000).toFixed(1)}M`
                                        } else if (value >= 1000) {
                                          return `${Math.round(value / 1000)}K`
                                        }
                                        return value.toString()
                                      }}
                                      label={{ value: 'Views', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: 'var(--color-primary)' } }}
                                    />
                                    <YAxis
                                      yAxisId="right"
                                      orientation="right"
                                      fontSize={12}
                                      tick={{ fill: '#666' }}
                                      tickFormatter={(value) => {
                                        if (value >= 1000000) {
                                          return `${(value / 1000000).toFixed(1)}M`
                                        } else if (value >= 1000) {
                                          return `${Math.round(value / 1000)}K`
                                        }
                                        return value.toString()
                                      }}
                                      label={{ value: 'Likes', angle: 90, position: 'insideRight', style: { textAnchor: 'middle', fill: 'var(--color-accent)' } }}
                                    />
                                    <Tooltip
                                      labelStyle={{ color: '#000' }}
                                      contentStyle={{
                                        backgroundColor: '#fff',
                                        border: '1px solid #ccc',
                                        borderRadius: '4px'
                                      }}
                                      formatter={(value, name, props) => {
                                        // Skip tooltip for dashed lines
                                        if (name === 'viewsDashed' || name === 'likesDashed') {
                                          return null
                                        }

                                        let formattedValue = value
                                        if (typeof value === 'number') {
                                          if (value >= 1000000) {
                                            formattedValue = `${(value / 1000000).toFixed(1)}M`
                                          } else if (value >= 1000) {
                                            formattedValue = `${Math.round(value / 1000)}K`
                                          }
                                        }

                                        const label = name === 'views' ? 'Views' : 'Likes'

                                        return [
                                          formattedValue,
                                          label
                                        ]
                                      }}
                                      labelFormatter={(label, payload) => {
                                        if (payload && payload[0]?.payload) {
                                          const payloadData = payload[0].payload
                                          const isStartPoint = payloadData.isStartPoint

                                          // For baseline/start point, show the posting date
                                          if (isStartPoint) {
                                            const timestamp = payloadData.timestamp
                                            if (timestamp) {
                                              const date = new Date(timestamp)
                                              return date.toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric'
                                              })
                                            }
                                          }

                                          // Format the timestamp to readable date/time
                                          const timestamp = payloadData.timestamp
                                          if (timestamp) {
                                            const date = new Date(timestamp)
                                            return date.toLocaleString('en-US', {
                                              month: 'short',
                                              day: 'numeric',
                                              hour: '2-digit',
                                              minute: '2-digit',
                                              hour12: false
                                            })
                                          }
                                        }
                                        return label
                                      }}
                                    />
                                    {/* Dashed baseline segment from 0,0 to first recorded value */}
                                    <Line
                                      yAxisId="left"
                                      type="monotone"
                                      dataKey="viewsDashed"
                                      stroke="var(--color-primary)"
                                      strokeWidth={2}
                                      strokeDasharray="5 5"
                                      dot={false}
                                      activeDot={false}
                                      isAnimationActive={false}
                                      legendType="none"
                                      connectNulls={false}
                                    />
                                    <Line
                                      yAxisId="right"
                                      type="monotone"
                                      dataKey="likesDashed"
                                      stroke="var(--color-accent)"
                                      strokeWidth={2}
                                      strokeDasharray="5 5"
                                      dot={false}
                                      activeDot={false}
                                      isAnimationActive={false}
                                      legendType="none"
                                      connectNulls={false}
                                    />
                                    {/* Solid line for actual recorded data points */}
                                    <Line
                                      yAxisId="left"
                                      type="monotone"
                                      dataKey="views"
                                      stroke="var(--color-primary)"
                                      strokeWidth={2}
                                      dot={{ fill: 'var(--color-primary)', strokeWidth: 2, r: 3 }}
                                      activeDot={{ r: 5, fill: 'var(--color-primary)' }}
                                      connectNulls={false}
                                    />
                                    <Line
                                      yAxisId="right"
                                      type="monotone"
                                      dataKey="likes"
                                      stroke="var(--color-accent)"
                                      strokeWidth={2}
                                      dot={{ fill: 'var(--color-accent)', strokeWidth: 2, r: 3 }}
                                      activeDot={{ r: 5, fill: 'var(--color-accent)' }}
                                      connectNulls={false}
                                    />
                                  </LineChart>
                                </ResponsiveContainer>
                              </div>
                            </div>
                            {/* Update Metrics button at bottom left */}
                            <div className="flex justify-start mt-auto">
                              <div className="[&_button]:bg-accent [&_button]:hover:bg-accent/90 [&_button]:text-accent-foreground">
                                <Button variant="outline" size="sm" disabled>
                                  Update Metrics
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>

                  {/* Dan Martell - Blockbuster */}
                  <TableRow className="hover:bg-accent/5">
                    <TableCell>
                      <Button variant="ghost" size="sm" className="p-0 h-6 w-6" disabled>
                        <ChevronRight className="size-4" />
                      </Button>
                    </TableCell>
                    <TableCell className="py-0">
                      <img
                        src="https://vmyasmlyddbtaestuwua.supabase.co/storage/v1/object/public/thumbnails/danmartell.JPEG"
                        alt="Dan Martell thumbnail"
                        className="w-24 h-28 object-cover rounded"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center">
                        <img src="/icons/linkedin.svg" alt="LinkedIn" className="size-8" />
                      </div>
                    </TableCell>
                    <TableCell className="font-bold">@danmartell</TableCell>
                    <TableCell>25.3M</TableCell>
                    <TableCell>
                      <Badge className={getViralityColor("blockbuster")}>
                        Blockbuster
                      </Badge>
                    </TableCell>
                    <TableCell className="break-words" >Storytelling</TableCell>
                    <TableCell className="break-words" >Audio + B Roll + Text</TableCell>
                    <TableCell className="max-w-md text-xs">
                      <span className="truncate">My biggest business failure...</span>
                    </TableCell>
                  </TableRow>

                  {/* Frank Greeff - Viral */}
                  <TableRow className="hover:bg-accent/5">
                    <TableCell>
                      <Button variant="ghost" size="sm" className="p-0 h-6 w-6" disabled>
                        <ChevronRight className="size-4" />
                      </Button>
                    </TableCell>
                    <TableCell className="py-0">
                      <img
                        src="https://vmyasmlyddbtaestuwua.supabase.co/storage/v1/object/public/thumbnails/frankgreef.JPEG"
                        alt="Frank Greeff thumbnail"
                        className="w-24 h-28 object-cover rounded"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center">
                        <img src="/icons/tiktok.svg" alt="TikTok" className="size-8" />
                      </div>
                    </TableCell>
                    <TableCell className="font-bold">@frankgreef_</TableCell>
                    <TableCell>8.7M</TableCell>
                    <TableCell>
                      <Badge className={getViralityColor("viral")}>
                        Viral
                      </Badge>
                    </TableCell>
                    <TableCell className="break-words" >Storytelling</TableCell>
                    <TableCell className="break-words" >Broll with Voiceover</TableCell>
                    <TableCell className="max-w-md text-xs">
                      <span className="truncate">I tried living like a minimalist for a week</span>
                    </TableCell>
                  </TableRow>

                  {/* Ava Yuergens - Viral */}
                  <TableRow className="hover:bg-accent/5">
                    <TableCell>
                      <Button variant="ghost" size="sm" className="p-0 h-6 w-6" disabled>
                        <ChevronRight className="size-4" />
                      </Button>
                    </TableCell>
                    <TableCell className="py-0">
                      <img
                        src="https://vmyasmlyddbtaestuwua.supabase.co/storage/v1/object/public/thumbnails/avayuergens.JPEG"
                        alt="Ava Yuergens thumbnail"
                        className="w-24 h-28 object-cover rounded"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center">
                        <img src="/icons/instagram.svg" alt="Instagram" className="size-8" />
                      </div>
                    </TableCell>
                    <TableCell className="font-bold">@avayuergens</TableCell>
                    <TableCell>7.2M</TableCell>
                    <TableCell>
                      <Badge className={getViralityColor("viral")}>
                        Viral
                      </Badge>
                    </TableCell>
                    <TableCell className="break-words" >Educational</TableCell>
                    <TableCell className="break-words" >Demonstration</TableCell>
                    <TableCell className="max-w-md text-xs">
                      <span className="truncate">How to create viral Instagram Reels</span>
                    </TableCell>
                  </TableRow>

                  {/* Tahlia Kennedy - Breakout */}
                  <TableRow className="hover:bg-accent/5">
                    <TableCell>
                      <Button variant="ghost" size="sm" className="p-0 h-6 w-6" disabled>
                        <ChevronRight className="size-4" />
                      </Button>
                    </TableCell>
                    <TableCell className="py-0">
                      <img
                        src="https://vmyasmlyddbtaestuwua.supabase.co/storage/v1/object/public/thumbnails/tahliakennedy.JPEG"
                        alt="Tahlia Kennedy thumbnail"
                        className="w-24 h-28 object-cover rounded"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center">
                        <img src="/icons/tiktok.svg" alt="TikTok" className="size-8" />
                      </div>
                    </TableCell>
                    <TableCell className="font-bold">@tahlia.kennedy</TableCell>
                    <TableCell>3.8M</TableCell>
                    <TableCell>
                      <Badge className={getViralityColor("breakout")}>
                        Breakout
                      </Badge>
                    </TableCell>
                    <TableCell className="break-words" >Storytelling</TableCell>
                    <TableCell className="break-words" >Audio + B Roll + Text</TableCell>
                    <TableCell className="break-words text-xs" style={{ width: '60px', minWidth: '60px', maxWidth: '60px' }}>Behind the scenes of my fashion brand</TableCell>
                  </TableRow>

                  {/* Sam Gaudet - Breakout */}
                  <TableRow className="hover:bg-accent/5">
                    <TableCell>
                      <Button variant="ghost" size="sm" className="p-0 h-6 w-6" disabled>
                        <ChevronRight className="size-4" />
                      </Button>
                    </TableCell>
                    <TableCell className="py-0">
                      <img
                        src="https://vmyasmlyddbtaestuwua.supabase.co/storage/v1/object/public/thumbnails/samgaudet.JPEG"
                        alt="Sam Gaudet thumbnail"
                        className="w-24 h-28 object-cover rounded"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center">
                        <img src="/icons/youtube.svg" alt="YouTube" className="size-8" />
            </div>
                    </TableCell>
                    <TableCell className="font-bold">@sam.gaudet</TableCell>
                    <TableCell>4.1M</TableCell>
                    <TableCell>
                      <Badge className={getViralityColor("breakout")}>
                        Breakout
                      </Badge>
                    </TableCell>
                    <TableCell className="break-words" >Educational</TableCell>
                    <TableCell className="break-words" >Talking Head</TableCell>
                    <TableCell className="break-words text-xs" style={{ width: '60px', minWidth: '60px', maxWidth: '60px' }}>The future of AI in content creation</TableCell>
                  </TableRow>

                  {/* J Boxer - Steady */}
                  <TableRow className="hover:bg-accent/5">
                    <TableCell>
                      <Button variant="ghost" size="sm" className="p-0 h-6 w-6" disabled>
                        <ChevronRight className="size-4" />
                      </Button>
                    </TableCell>
                    <TableCell className="py-0">
                      <img
                        src="https://vmyasmlyddbtaestuwua.supabase.co/storage/v1/object/public/thumbnails/jboxer.JPEG"
                        alt="J Boxer thumbnail"
                        className="w-24 h-28 object-cover rounded"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center">
                        <img src="/icons/instagram.svg" alt="Instagram" className="size-8" />
            </div>
                    </TableCell>
                    <TableCell className="font-bold">@jboxer_</TableCell>
                    <TableCell>2.1M</TableCell>
                    <TableCell>
                      <Badge className={getViralityColor("steady")}>
                        Steady
                      </Badge>
                    </TableCell>
                    <TableCell className="break-words" >Educational</TableCell>
                    <TableCell className="break-words" >Demonstration</TableCell>
                    <TableCell className="break-words text-xs" style={{ width: '60px', minWidth: '60px', maxWidth: '60px' }}>Tired of sore eyes looking at screens</TableCell>
                  </TableRow>

                  {/* Kieran JXN - Dormant */}
                  <TableRow className="hover:bg-accent/5">
                    <TableCell>
                      <Button variant="ghost" size="sm" className="p-0 h-6 w-6" disabled>
                        <ChevronRight className="size-4" />
                      </Button>
                    </TableCell>
                    <TableCell className="py-0">
                      <img
                        src="https://vmyasmlyddbtaestuwua.supabase.co/storage/v1/object/public/thumbnails/kieranjxn.JPEG"
                        alt="Kieran JXN thumbnail"
                        className="w-24 h-28 object-cover rounded"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center">
                        <img src="/icons/tiktok.svg" alt="TikTok" className="size-8" />
            </div>
                    </TableCell>
                    <TableCell className="font-bold">@kieranjxn</TableCell>
                    <TableCell>850K</TableCell>
                    <TableCell>
                      <Badge className={getViralityColor("dormant")}>
                        Dormant
                      </Badge>
                    </TableCell>
                    <TableCell className="break-words" >Educational</TableCell>
                    <TableCell className="break-words" >Screen Recording Tutorial</TableCell>
                    <TableCell className="break-words text-xs" style={{ width: '60px', minWidth: '60px', maxWidth: '60px' }}>Reviewing the latest productivity apps</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t bg-accent/5">
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold">Ready to organize your content empire?</h2>
            <p className="text-lg text-muted-foreground">
              Join creators who are scaling their personal brands with Atlas.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              {isLoggedIn ? (
                <Button size="lg" onClick={handleLogout} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  Log Out
                </Button>
              ) : (
                <Button size="lg" asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  <Link href="/auth/sign-up">Get Started Free</Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card/50">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <AtlasLogo className="size-6" showText />
            <p className="text-sm text-muted-foreground">© 2026 Atlas. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
