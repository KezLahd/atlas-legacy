"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Palette } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { AtlasLogo } from "@/components/atlas-logo"
import { UserAvatar } from "@/components/user-avatar"

export default function AppearancePage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [selectedTheme, setSelectedTheme] = useState<string>("about-a-boy")

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

    const { data: profileData } = await supabase.from("user_profiles").select("*").eq("id", authUser.id).single()

    if (profileData) {
      setProfile(profileData)
      setSelectedTheme(profileData.theme_preset || "about-a-boy")
      applyTheme(profileData.theme_preset || "about-a-boy")
    }

    setLoading(false)
  }

  const applyTheme = (theme: string) => {
    if (theme === "what-about-the-girl") {
      document.documentElement.setAttribute("data-theme", "girl")
    } else if (theme === "dubai-chocolate") {
      document.documentElement.setAttribute("data-theme", "dubai")
    } else if (theme === "mocha") {
      document.documentElement.setAttribute("data-theme", "mocha")
    } else {
      document.documentElement.setAttribute("data-theme", "boy")
    }
    localStorage.setItem("atlas-theme", theme)
  }

  const handleThemeChange = async (theme: string) => {
    setSelectedTheme(theme)
    applyTheme(theme)

    // Save immediately to database
    try {
      await supabase
        .from("user_profiles")
        .update({
          theme_preset: theme,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)
    } catch (err) {
      console.error("Failed to save theme:", err)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <main className="container mx-auto p-6 space-y-6 flex-1 max-w-3xl">
          <Skeleton className="h-9 w-48 bg-muted" />
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32 bg-muted" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full bg-muted" />
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="container mx-auto p-6 space-y-6 flex-1 max-w-4xl">
        <div className="flex items-center gap-3">
          <Palette className="size-8 text-primary" />
          <h1 className="text-3xl font-bold">Appearance</h1>
        </div>

        <p className="text-muted-foreground">Customize the look and feel of your Atlas workspace</p>

        <Card>
          <CardHeader>
            <CardTitle>Theme Preset</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {/* About a Boy Theme */}
                <button
                  type="button"
                  className={`group relative overflow-hidden border-2 rounded-xl text-left transition-all ${
                    selectedTheme === "about-a-boy"
                      ? "ring-4 ring-[#89cff0]/30 border-[#89cff0] shadow-lg"
                      : "border-border hover:border-[#89cff0]/50 hover:shadow-md"
                  }`}
                  onClick={() => handleThemeChange("about-a-boy")}
                >
                  <div className="bg-[#faf7f2] p-4">
                    <div className="flex items-center justify-between mb-3 pb-3 border-b border-[#d9d4ca]">
                      <div className="flex items-center gap-2">
                        <AtlasLogo className="size-4" />
                        <span className="text-xs font-semibold">
                          <span className="text-[#89cff0]">at</span>
                          <span className="text-[#3a2415]">las</span>
                        </span>
                      </div>
                      {profile && (
                        <UserAvatar
                          profile={{
                            ...profile,
                            avatar_bg_color: profile.avatar_bg_color || "#89cff0",
                          }}
                          size="sm"
                        />
                      )}
                    </div>

                    {/* Calendar Grid */}
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-[#3a2415] mb-2">January 2026</div>
                      <div className="grid grid-cols-7 gap-1">
                        {[...Array(7)].map((_, i) => (
                          <div key={i} className="h-1.5 bg-[#ebe7df] rounded" />
                        ))}
                        {[...Array(28)].map((_, i) => (
                          <div
                            key={i}
                            className={`h-9 rounded flex items-center justify-center text-[10px] ${
                              i === 15
                                ? "bg-[#89cff0] text-white font-semibold ring-2 ring-[#89cff0]/50"
                                : i === 10 || i === 20
                                  ? "bg-[#89cff0]/40 hover:bg-[#89cff0]/60"
                                  : "bg-white hover:bg-[#89cff0]/20"
                            }`}
                          >
                            {i + 1}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-white">
                    <h3 className="font-semibold text-lg">about a boy</h3>
                  </div>

                  {selectedTheme === "about-a-boy" && (
                    <div className="absolute bottom-3 right-3 size-7 rounded-full bg-[#89cff0] flex items-center justify-center shadow-md">
                      <svg className="size-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>

                {/* What About the Girl Theme */}
                <button
                  type="button"
                  className={`group relative overflow-hidden border-2 rounded-xl text-left transition-all ${
                    selectedTheme === "what-about-the-girl"
                      ? "ring-4 ring-[#ffc0cb]/30 border-[#ffc0cb] shadow-lg"
                      : "border-border hover:border-[#ffc0cb]/50 hover:shadow-md"
                  }`}
                  onClick={() => handleThemeChange("what-about-the-girl")}
                >
                  <div className="bg-[#faf7f2] p-4">
                    <div className="flex items-center justify-between mb-3 pb-3 border-b border-[#d9d4ca]">
                      <div className="flex items-center gap-2">
                        <AtlasLogo className="size-4" />
                        <span className="text-xs font-semibold">
                          <span className="text-[#ffc0cb]">at</span>
                          <span className="text-[#3a2415]">las</span>
                        </span>
                      </div>
                      {profile && (
                        <UserAvatar
                          profile={{
                            ...profile,
                            avatar_bg_color: profile.avatar_bg_color || "#ffc0cb",
                          }}
                          size="sm"
                        />
                      )}
                    </div>

                    {/* Calendar Grid */}
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-[#3a2415] mb-2">January 2026</div>
                      <div className="grid grid-cols-7 gap-1">
                        {[...Array(7)].map((_, i) => (
                          <div key={i} className="h-1.5 bg-[#ebe7df] rounded" />
                        ))}
                        {[...Array(28)].map((_, i) => (
                          <div
                            key={i}
                            className={`h-9 rounded flex items-center justify-center text-[10px] ${
                              i === 15
                                ? "bg-[#ffc0cb] text-white font-semibold ring-2 ring-[#ffc0cb]/50"
                                : i === 10 || i === 20
                                  ? "bg-[#ffc0cb]/40 hover:bg-[#ffc0cb]/60"
                                  : "bg-white hover:bg-[#ffc0cb]/20"
                            }`}
                          >
                            {i + 1}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-white">
                    <h3 className="font-semibold text-lg">what about the girl?</h3>
                  </div>

                  {selectedTheme === "what-about-the-girl" && (
                    <div className="absolute bottom-3 right-3 size-7 rounded-full bg-[#ffc0cb] flex items-center justify-center shadow-md">
                      <svg className="size-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>

                {/* Dubai Chocolate Theme */}
                <button
                  type="button"
                  className={`group relative overflow-hidden border-2 rounded-xl text-left transition-all ${
                    selectedTheme === "dubai-chocolate"
                      ? "ring-4 ring-[#D0E9C0]/30 border-[#D0E9C0] shadow-lg"
                      : "border-border hover:border-[#D0E9C0]/50 hover:shadow-md"
                  }`}
                  onClick={() => handleThemeChange("dubai-chocolate")}
                >
                  <div className="bg-[#faf7f2] p-4">
                    <div className="flex items-center justify-between mb-3 pb-3 border-b border-[#d9d4ca]">
                      <div className="flex items-center gap-2">
                        <AtlasLogo className="size-4" />
                        <span className="text-xs font-semibold">
                          <span className="text-[#D0E9C0]">at</span>
                          <span className="text-[#3a2415]">las</span>
                        </span>
                      </div>
                      {profile && (
                        <UserAvatar
                          profile={{
                            ...profile,
                            avatar_bg_color: profile.avatar_bg_color || "#D0E9C0",
                          }}
                          size="sm"
                        />
                      )}
                    </div>

                    {/* Calendar Grid */}
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-[#3a2415] mb-2">January 2026</div>
                      <div className="grid grid-cols-7 gap-1">
                        {[...Array(7)].map((_, i) => (
                          <div key={i} className="h-1.5 bg-[#ebe7df] rounded" />
                        ))}
                        {[...Array(28)].map((_, i) => (
                          <div
                            key={i}
                            className={`h-9 rounded flex items-center justify-center text-[10px] ${
                              i === 15
                                ? "bg-[#D0E9C0] text-white font-semibold ring-2 ring-[#D0E9C0]/50"
                                : i === 10 || i === 20
                                  ? "bg-[#D0E9C0]/40 hover:bg-[#D0E9C0]/60"
                                  : "bg-white hover:bg-[#D0E9C0]/20"
                            }`}
                          >
                            {i + 1}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-white">
                    <h3 className="font-semibold text-lg">dubai chocolate</h3>
                  </div>

                  {selectedTheme === "dubai-chocolate" && (
                    <div className="absolute bottom-3 right-3 size-7 rounded-full bg-[#D0E9C0] flex items-center justify-center shadow-md">
                      <svg className="size-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>

                {/* Mocha Theme */}
                <button
                  type="button"
                  className={`group relative overflow-hidden border-2 rounded-xl text-left transition-all ${
                    selectedTheme === "mocha"
                      ? "ring-4 ring-[#8F6251]/30 border-[#8F6251] shadow-lg"
                      : "border-border hover:border-[#8F6251]/50 hover:shadow-md"
                  }`}
                  onClick={() => handleThemeChange("mocha")}
                >
                  <div className="bg-[#faf7f2] p-4">
                    <div className="flex items-center justify-between mb-3 pb-3 border-b border-[#d9d4ca]">
                      <div className="flex items-center gap-2">
                        <AtlasLogo className="size-4" />
                        <span className="text-xs font-semibold">
                          <span className="text-[#8F6251]">at</span>
                          <span className="text-[#3a2415]">las</span>
                        </span>
                      </div>
                      {profile && (
                        <UserAvatar
                          profile={{
                            ...profile,
                            avatar_bg_color: profile.avatar_bg_color || "#8F6251",
                          }}
                          size="sm"
                        />
                      )}
                    </div>

                    {/* Calendar Grid */}
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-[#3a2415] mb-2">January 2026</div>
                      <div className="grid grid-cols-7 gap-1">
                        {[...Array(7)].map((_, i) => (
                          <div key={i} className="h-1.5 bg-[#ebe7df] rounded" />
                        ))}
                        {[...Array(28)].map((_, i) => (
                          <div
                            key={i}
                            className={`h-9 rounded flex items-center justify-center text-[10px] ${
                              i === 15
                                ? "bg-[#8F6251] text-white font-semibold ring-2 ring-[#8F6251]/50"
                                : i === 10 || i === 20
                                  ? "bg-[#8F6251]/40 hover:bg-[#8F6251]/60"
                                  : "bg-white hover:bg-[#8F6251]/20"
                            }`}
                          >
                            {i + 1}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-white">
                    <h3 className="font-semibold text-lg">mocha</h3>
                  </div>

                  {selectedTheme === "mocha" && (
                    <div className="absolute bottom-3 right-3 size-7 rounded-full bg-[#8F6251] flex items-center justify-center shadow-md">
                      <svg className="size-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>
              </div>

              <p className="text-xs text-muted-foreground mt-4">
                Your theme choice will update all accent colors throughout the application, including hover effects,
                focus states, and interactive elements
              </p>
            </div>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  )
}
