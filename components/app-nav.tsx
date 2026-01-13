"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { AtlasLogo } from "@/components/atlas-logo"
import { LayoutDashboard, FileText, Search, BarChart3, LogOut, User } from "lucide-react"
import { cn } from "@/lib/utils"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Content", href: "/content", icon: FileText },
  { name: "Research", href: "/research", icon: Search },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
]

export function AppNav({ userEmail }: { userEmail?: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

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

        <nav className="flex items-center gap-1 ml-6 flex-1">
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

        <Link
          href="/profile"
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
            pathname.startsWith("/profile")
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-foreground",
          )}
        >
          <User className="size-4" />
          <span className="hidden md:inline">Profile</span>
        </Link>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleLogout}
          className="text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <LogOut className="size-4" />
        </Button>
      </div>
    </div>
  )
}
