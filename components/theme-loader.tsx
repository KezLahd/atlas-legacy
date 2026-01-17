"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

export function ThemeLoader() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    loadAndApplyTheme()
  }, [])

  const loadAndApplyTheme = async () => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    const { data: profile } = await supabase.from("user_profiles").select("theme_preset").eq("id", user.id).single()

    if (profile?.theme_preset) {
      applyTheme(profile.theme_preset)
      localStorage.setItem("atlas-theme", profile.theme_preset)
    } else {
      applyTheme("about-a-boy")
      localStorage.setItem("atlas-theme", "about-a-boy")
    }
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
  }

  if (!mounted) return null

  return null
}
