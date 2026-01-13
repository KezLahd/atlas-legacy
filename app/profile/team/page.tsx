"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { AppNav } from "@/components/app-nav"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

export default function TeamPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

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

      const { data: membersData } = await supabase
        .from("workspace_members")
        .select("*, user_profiles(first_name, last_name)")
        .eq("workspace_id", membership.workspace_id)
        .order("created_at")

      setMembers(membersData || [])
      setLoading(false)
    }

    loadData()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <AppNav userEmail={user?.email || ""} />
        <main className="container mx-auto p-6 space-y-6 flex-1">
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-9 bg-muted" />
            <Skeleton className="h-9 w-24 bg-muted" />
          </div>

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
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppNav userEmail={user?.email || ""} />

      <main className="container mx-auto p-6 space-y-6 flex-1">
        <div className="flex items-center gap-2">
          <Link href="/profile" className="hover:opacity-70 transition-opacity">
            <ArrowLeft className="size-6 text-foreground" />
          </Link>
          <h1 className="text-3xl font-bold">Team</h1>
        </div>

        <p className="text-muted-foreground">Manage workspace members and permissions</p>

        <Card>
          <CardHeader>
            <CardTitle>Team Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {members?.map((member: any) => (
                <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">
                      {member.user_profiles?.first_name && member.user_profiles?.last_name
                        ? `${member.user_profiles.first_name} ${member.user_profiles.last_name}`
                        : "Unknown User"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Joined {new Date(member.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {member.role}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  )
}
