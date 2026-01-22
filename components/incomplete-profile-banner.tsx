"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"
import { X } from "lucide-react"

export function IncompleteProfileBanner() {
  const router = useRouter()
  const [show, setShow] = useState(false)
  const [creatorId, setCreatorId] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    async function checkProfile() {
      const supabase = createClient()
      
      const {
        data: { user },
      } = await supabase.auth.getUser()
      
      if (!user) return

      // Get user's workspace
      const { data: membership } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", user.id)
        .single()

      if (!membership) return

      // Check for creators in the workspace with incomplete profiles
      const { data: creators } = await supabase
        .from("creators")
        .select(`
          id,
          primary_niche,
          creator_platforms(platform_id)
        `)
        .eq("workspace_id", membership.workspace_id)
        .eq("user_id", user.id)

      if (creators && creators.length > 0) {
        const incompleteCreator = creators.find(
          (c) => !c.primary_niche || !c.creator_platforms || c.creator_platforms.length === 0
        )

        if (incompleteCreator) {
          setCreatorId(incompleteCreator.id)
          setShow(true)
        }
      }
    }

    checkProfile()
  }, [])

  const handleComplete = () => {
    if (creatorId) {
      router.push(`/onboarding/creator-setup?creatorId=${creatorId}`)
    }
  }

  if (!show) return null

  return (
    <div className="bg-accent text-accent-foreground border-b border-accent-foreground/20">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-3 gap-4">
          <div className="flex items-center gap-3 flex-1">
            <AlertCircle className="size-5 flex-shrink-0" />
            <p className="text-sm font-medium">
              Complete your creator profile to unlock full access to Atlas
            </p>
          </div>
          <Button
            onClick={handleComplete}
            size="sm"
            variant="secondary"
            className="bg-background hover:bg-background/90 text-foreground"
          >
            Complete Setup
          </Button>
        </div>
      </div>
    </div>
  )
}
