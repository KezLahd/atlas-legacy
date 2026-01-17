import type React from "react"
import { ProfileSidebar } from "@/components/profile-sidebar"
import { AppNav } from "@/components/app-nav"

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <AppNav />
      <div className="flex">
        <ProfileSidebar />
        <div className="flex-1 min-h-[calc(100vh-64px)]">{children}</div>
      </div>
    </div>
  )
}
