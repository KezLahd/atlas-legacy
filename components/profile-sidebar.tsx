"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { UserCircle, Video, UsersRound, Settings, ArrowLeft, Palette } from "lucide-react"
import { Button } from "@/components/ui/button"

const profileNav = [
  { name: "Account", href: "/profile/account", icon: UserCircle },
  { name: "Appearance", href: "/profile/appearance", icon: Palette }, // Added Appearance link
  { name: "Creators", href: "/profile/creators", icon: Video },
  { name: "Team", href: "/profile/team", icon: UsersRound },
  { name: "Settings", href: "/profile/settings", icon: Settings },
]

export function ProfileSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 border-r bg-muted/10 sticky top-16 h-[calc(100vh-64px)] flex flex-col">
      <div className="p-4 space-y-4 flex-1">
        <div>
          <Link href="/dashboard">
            <Button variant="ghost" className="w-full justify-start text-sm font-medium">
              <ArrowLeft className="size-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div className="border-b mt-4 mb-4" />
        </div>

        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Profile</h2>
          {profileNav.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-[#3a2415] text-white" // Changed from text-accent-foreground to text-white for better contrast on brown background
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </aside>
  )
}
