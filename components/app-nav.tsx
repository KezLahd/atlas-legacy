"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { AtlasLogo } from "@/components/atlas-logo"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  LayoutDashboard,
  FileText,
  Search,
  BarChart3,
  LogOut,
  UserCircle,
  Video,
  UsersRound,
  Settings,
  Palette,
  Lightbulb,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { UserAvatar } from "@/components/user-avatar"
import { useEffect, useState } from "react"
import { IncompleteProfileBanner } from "@/components/incomplete-profile-banner"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Content", href: "/content", icon: FileText },
  { name: "Brainstorm", href: "/brainstorm", icon: Lightbulb },
  { name: "Research", href: "/research", icon: Search },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
]

export function AppNav({ userEmail }: { userEmail?: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from("user_profiles").select("*").eq("id", user.id).single()
        setProfile(data)
      }
      setLoading(false)
    }
    loadProfile()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/auth/login")
    router.refresh()
  }

  return (
    <div className="sticky top-0 z-50 border-b border-border bg-white">
      <div className="flex h-16 items-center px-4 gap-4">
        <Link href="/dashboard">
          <AtlasLogo className="size-8" showText />
        </Link>

        <nav className="flex items-center gap-1 ml-1 md:ml-6">
          {navigation.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                <span className="hidden md:inline">{item.name}</span>
              </Link>
            )
          })}
        </nav>

        <div className="md:ml-auto">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  "flex items-center gap-2 px-3 py-2",
                  pathname.startsWith("/profile") ? "bg-[#3a2415] text-white hover:bg-[#3a2415]/90" : "",
                )}
              >
                {!loading && profile ? <UserAvatar profile={profile} size="sm" /> : <UserCircle className="size-5" />}
                <span className="hidden md:inline text-sm">Profile</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" align="end">
              <div className="space-y-1">
                <Link
                  href="/profile/account"
                  className="flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-accent transition-colors"
                >
                  <UserCircle className="size-4" />
                  <span>Account</span>
                </Link>
                <Link
                  href="/profile/appearance"
                  className="flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-accent transition-colors"
                >
                  <Palette className="size-4" />
                  <span>Appearance</span>
                </Link>
                <Link
                  href="/profile/creators"
                  className="flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-accent transition-colors"
                >
                  <Video className="size-4" />
                  <span>Creators</span>
                </Link>
                <Link
                  href="/profile/team"
                  className="flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-accent transition-colors"
                >
                  <UsersRound className="size-4" />
                  <span>Team</span>
                </Link>
                <Link
                  href="/profile/settings"
                  className="flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-accent transition-colors"
                >
                  <Settings className="size-4" />
                  <span>Workspace Settings</span>
                </Link>
                <div className="border-t my-1" />
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-accent transition-colors w-full text-left text-red-600"
                >
                  <LogOut className="size-4" />
                  <span>Logout</span>
                </button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  )
}
