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
      console.log('[v0] IncompleteProfileBanner: Starting profile check')
      const supabase = createClient()
      
      const {
        data: { user },
      } = await supabase.auth.getUser()
      
      console.log('[v0] IncompleteProfileBanner: User:', user?.id)
      if (!user) {
        console.log('[v0] IncompleteProfileBanner: No user found')
        return
      }

      // Get user's workspace
      const { data: membership } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", user.id)
        .single()

      console.log('[v0] IncompleteProfileBanner: Membership:', membership)
      if (!membership) {
        console.log('[v0] IncompleteProfileBanner: No membership found')
        return
      }

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

      console.log('[v0] IncompleteProfileBanner: Creators data:', creators)

      // If no creator exists at all, show banner
      if (!creators || creators.length === 0) {
        console.log('[v0] IncompleteProfileBanner: No creator found - showing banner')
        setShow(true)
        return
      }

      // If creator exists, check if it's incomplete
      const incompleteCreator = creators.find(
        (c) => {
          const hasNoPrimaryNiche = !c.primary_niche || c.primary_niche.trim() === ''
          const hasNoPlatforms = !c.creator_platforms || c.creator_platforms.length === 0
          console.log('[v0] IncompleteProfileBanner: Checking creator:', {
            id: c.id,
            primary_niche: c.primary_niche,
            hasNoPrimaryNiche,
            hasNoPlatforms,
            platforms_count: c.creator_platforms?.length || 0
          })
          return hasNoPrimaryNiche || hasNoPlatforms
        }
      )

      console.log('[v0] IncompleteProfileBanner: Incomplete creator found:', incompleteCreator?.id)

      if (incompleteCreator) {
        setCreatorId(incompleteCreator.id)
        setShow(true)
      }
    }

    checkProfile()
  }, [])

  const handleComplete = () => {
    // If there's a creatorId, resume setup for that creator
    // Otherwise, start fresh onboarding
    if (creatorId) {
      router.push(`/onboarding/creator-setup?creatorId=${creatorId}`)
    } else {
      router.push('/onboarding/creator-setup')
    }
  }

  if (!show || dismissed) return null

  return (
    <div className="sticky top-0 z-[60] bg-accent text-accent-foreground border-b border-accent/20 shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-3 gap-4">
          <div className="flex items-center gap-3 flex-1">
            <AlertCircle className="size-5 flex-shrink-0" />
            <p className="text-sm font-medium">
              Your creator profile is incomplete! Complete setup to access batching, calendar, and analytics features.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleComplete}
              size="sm"
              className="bg-accent-foreground hover:bg-accent-foreground/90 text-accent font-semibold"
            >
              Continue Setup
            </Button>
            <Button
              onClick={() => setDismissed(true)}
              size="sm"
              variant="ghost"
              className="text-accent-foreground hover:bg-accent-foreground/20"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
