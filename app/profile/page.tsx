"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { AppNav } from "@/components/app-nav"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Video, UsersRound, Settings, ArrowRight } from "lucide-react"
import Link from "next/link"
import { Skeleton } from "@/components/ui/skeleton"

export default function ProfilePage() {
  const router = useRouter()
  const [userEmail, setUserEmail] = useState<string>("")
  const [creatorsCount, setCreatorsCount] = useState(0)
  const [teamCount, setTeamCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      const supabase = createClient()

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push("/auth/login")
        return
      }

      setUserEmail(user.email || "")

      const { data: membership } = await supabase
        .from("workspace_members")
        .select("workspace_id, role")
        .eq("user_id", user.id)
        .single()

      if (!membership) {
        router.push("/onboarding")
        return
      }

      const { count: creators } = await supabase
        .from("creators")
        .select("*", { count: "exact", head: true })
        .eq("workspace_id", membership.workspace_id)

      const { count: team } = await supabase
        .from("workspace_members")
        .select("*", { count: "exact", head: true })
        .eq("workspace_id", membership.workspace_id)

      setCreatorsCount(creators || 0)
      setTeamCount(team || 0)
      setLoading(false)
    }

    loadData()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <AppNav userEmail={userEmail} />
        <main className="container mx-auto p-6 space-y-6 flex-1">
          <div className="space-y-2">
            <Skeleton className="h-9 w-32 bg-muted" />
            <Skeleton className="h-5 w-96 bg-muted" />
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <div className="flex items-center gap-3 mb-0">
                    <Skeleton className="size-10 rounded-lg bg-muted" />
                    <Skeleton className="h-6 w-24 bg-muted" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-baseline gap-2">
                    <Skeleton className="h-9 w-12 bg-muted" />
                    <Skeleton className="h-4 w-20 bg-muted" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full bg-muted" />
                    <Skeleton className="h-4 w-full bg-muted" />
                    <Skeleton className="h-4 w-3/4 bg-muted" />
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
      <AppNav userEmail={userEmail} />

      <main className="container mx-auto p-6 space-y-6 flex-1">
        <div>
          <h1 className="text-3xl font-bold">Profile</h1>
          <p className="text-muted-foreground">Manage your workspace, creators, and team</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3 mb-0">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Video className="size-6 text-primary" />
                </div>
                <CardTitle>Creators</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-baseline gap-2">
                <div className="text-3xl font-bold">{creatorsCount}</div>
                <div className="text-sm text-muted-foreground">{creatorsCount === 1 ? "creator" : "creators"}</div>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>Manage content creators and brands</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>Track platforms and performance</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>Configure posting frameworks</span>
                </li>
              </ul>
              <Button asChild className="w-full">
                <Link href="/profile/creators">
                  View Creators
                  <ArrowRight className="size-4 ml-2" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3 mb-0">
                <div className="p-2 rounded-lg bg-primary/10">
                  <UsersRound className="size-6 text-primary" />
                </div>
                <CardTitle>Team</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-baseline gap-2">
                <div className="text-3xl font-bold">{teamCount}</div>
                <div className="text-sm text-muted-foreground">{teamCount === 1 ? "member" : "members"}</div>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>Invite and manage team members</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>Assign roles and permissions</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>Control workspace access</span>
                </li>
              </ul>
              <Button asChild className="w-full">
                <Link href="/profile/team">
                  View Team
                  <ArrowRight className="size-4 ml-2" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3 mb-0">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Settings className="size-6 text-primary" />
                </div>
                <CardTitle>Settings</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">Configure workspace preferences</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>Update workspace details</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>Customize content framework</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>Delete workspace</span>
                </li>
              </ul>
              <Button asChild className="w-full">
                <Link href="/profile/settings">
                  View Settings
                  <ArrowRight className="size-4 ml-2" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  )
}
