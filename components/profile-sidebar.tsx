"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { UserCircle, Video, UsersRound, Settings, ArrowLeft, Palette, LayoutDashboard, ChevronLeft, ChevronRight } from "lucide-react"
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
  const [isExpanded, setIsExpanded] = useState(true)

  return (
    <aside className={cn(
      "border-r bg-slate-50 dark:bg-slate-900 transition-all duration-300 sticky top-16 h-[calc(100vh-64px)] flex flex-col",
      isExpanded ? "w-64" : "w-20"
    )}>
      <div className="p-4 space-y-4 flex-1">
        {/* Dashboard Icon */}
        <div className="flex flex-col items-center space-y-2">
          <Link href="/dashboard">
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "transition-all duration-300",
                isExpanded ? "w-full justify-start" : "w-10 h-10"
              )}
              title="Dashboard"
            >
              <LayoutDashboard className="size-4" />
              {isExpanded && <span className="ml-2 text-sm font-medium">Dashboard</span>}
            </Button>
          </Link>
          <div className="w-full border-b" />
        </div>

        {/* Profile Navigation - Wrapped in accent container */}
        <div className={cn(
          "rounded-lg border bg-accent/30 border-accent/20",
          isExpanded ? "p-3" : "p-2"
        )}>
          <div className="space-y-1">
            {isExpanded && (
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Profile</h2>
            )}
            {profileNav.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isExpanded ? "justify-start" : "justify-center",
                    isActive
                      ? "bg-[#3a2415] text-white"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                  title={isExpanded ? undefined : item.name}
                >
                  <Icon className="size-4 flex-shrink-0" />
                  {isExpanded && <span>{item.name}</span>}
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      {/* Expand/Collapse Toggle */}
      <div className="p-4 border-t">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-center"
          title={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
        >
          {isExpanded ? (
            <ChevronLeft className="size-4" />
          ) : (
            <ChevronRight className="size-4" />
          )}
        </Button>
      </div>
    </aside>
  )
}
