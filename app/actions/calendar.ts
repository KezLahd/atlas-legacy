"use server"

import { createClient } from "@/lib/supabase/server"

export async function updateEventTeamMembers(eventId: string, userIds: string[]) {
  const supabase = await createClient()

  // Delete existing team members
  const { error: deleteError } = await supabase.from("event_team_members").delete().eq("event_id", eventId)

  if (deleteError) {
    console.error("[v0] Error deleting team members:", deleteError)
    return { success: false, error: deleteError.message }
  }

  // Insert new team members
  if (userIds.length > 0) {
    const { error: insertError } = await supabase.from("event_team_members").insert(
      userIds.map((userId) => ({
        event_id: eventId,
        user_id: userId,
      })),
    )

    if (insertError) {
      console.error("[v0] Error inserting team members:", insertError)
      return { success: false, error: insertError.message }
    }
  }

  return { success: true }
}

export async function deleteEvent(eventId: string) {
  const supabase = await createClient()

  // Delete the event using server-side client with elevated permissions
  const { error: deleteError } = await supabase.from("calendar_events").delete().eq("id", eventId)

  if (deleteError) {
    console.error("[v0] Error deleting event:", deleteError)
    return { error: deleteError.message }
  }

  return { error: null }
}
