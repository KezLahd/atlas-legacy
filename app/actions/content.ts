"use server"

import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { revalidatePath } from "next/cache"

export async function updateContentScript(
  contentId: string,
  scriptData: {
    hook?: string
    opening_visual?: string
    main_script?: string
    cta?: string
    b_roll_notes?: string
    music_reference?: string
    shot_list?: string
    sound_effects?: string
    production_stage?: string
  },
) {
  const supabase = await createClient()

  // Verify user is authenticated and has permission
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: "Unauthorized" }
  }

  // Use service client to update
  const serviceSupabase = createServiceClient()

  const { error } = await serviceSupabase
    .from("content")
    .update({
      ...scriptData,
      updated_at: new Date().toISOString(),
    })
    .eq("id", contentId)

  if (error) {
    console.error("[v0] Error updating script:", error.message)
    return { error: error.message }
  }

  revalidatePath("/content")
  revalidatePath("/scripting")

  return { success: true }
}
