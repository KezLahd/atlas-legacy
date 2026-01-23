"use server"

import { createServiceClient } from "@/lib/supabase/service"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function deleteCreator(creatorId: string, isOwner: boolean) {
  try {
    const supabase = await createClient()
    const serviceSupabase = createServiceClient()

    // Get the current user
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      throw new Error("Not authenticated")
    }

    // Get creator details to find the associated user_id
    const { data: creator, error: creatorError } = await serviceSupabase
      .from("creators")
      .select("id, name, user_id, workspace_id")
      .eq("id", creatorId)
      .single()

    if (creatorError || !creator) {
      throw new Error("Creator not found")
    }

    const userId = creator.user_id
    const workspaceId = creator.workspace_id

    if (isOwner) {
      // Owner removing themselves as creator - keep account but remove creator access
      // Delete batch_creators links
      await serviceSupabase.from("batch_creators").delete().eq("creator_id", creatorId)

      // Delete content created FOR this creator
      await serviceSupabase.from("content").delete().eq("creator_id", creatorId)

      // Handle calendar events
      const { data: calendarEvents } = await serviceSupabase
        .from("calendar_events")
        .select("id, created_by, assignee_id")
        .or(`assignee_id.eq.${userId},created_by.eq.${userId}`)

      if (calendarEvents && calendarEvents.length > 0) {
        for (const event of calendarEvents) {
          if (event.created_by === userId) {
            await serviceSupabase.from("calendar_events").delete().eq("id", event.id)
          } else {
            await serviceSupabase.from("calendar_events").update({ assignee_id: null }).eq("id", event.id)
          }
        }
      }

      // Delete the creator record
      await serviceSupabase.from("creators").delete().eq("id", creatorId)

      // Remove creator access from workspace_members
      await serviceSupabase
        .from("workspace_members")
        .update({ role: "owner" })
        .eq("user_id", userId)
        .eq("workspace_id", workspaceId)

      return { success: true, message: "You have been removed as a creator. Your account remains active." }
    } else {
      // Manager/owner deleting another creator - delete entire account
      if (!userId) {
        throw new Error("Creator has no associated user account")
      }

      // Delete all audit logs created by this user
      await serviceSupabase.from("content_audit_log").delete().eq("created_by", userId)
      await serviceSupabase.from("event_audit_log").delete().eq("created_by", userId)
      await serviceSupabase.from("research_audit_log").delete().eq("created_by", userId)
      await serviceSupabase.from("script_audit_log").delete().eq("created_by", userId)

      // Delete records CREATED BY this user (not just assigned to them)
      await serviceSupabase.from("batches").delete().eq("created_by", userId)
      await serviceSupabase.from("sfx").delete().eq("created_by", userId)
      await serviceSupabase.from("broll").delete().eq("created_by", userId)
      await serviceSupabase.from("research_trends").delete().eq("created_by", userId)

      // Delete batch_creators links
      await serviceSupabase.from("batch_creators").delete().eq("creator_id", creatorId)

      // Delete content created FOR this creator
      await serviceSupabase.from("content").delete().eq("creator_id", creatorId)

      // Delete series for this creator
      await serviceSupabase.from("series").delete().eq("creator_id", creatorId)

      // Handle calendar events - delete ones created by this user, unassign others
      const { data: calendarEvents } = await serviceSupabase
        .from("calendar_events")
        .select("id, created_by, assignee_id")
        .or(`assignee_id.eq.${userId},created_by.eq.${userId}`)

      if (calendarEvents && calendarEvents.length > 0) {
        for (const event of calendarEvents) {
          if (event.created_by === userId) {
            await serviceSupabase.from("calendar_events").delete().eq("id", event.id)
          } else if (event.assignee_id === userId) {
            await serviceSupabase.from("calendar_events").update({ assignee_id: null }).eq("id", event.id)
          }
        }
      }

      // Delete event team member assignments
      await serviceSupabase.from("event_team_members").delete().eq("user_id", userId)

      // Delete creator access assignments
      await serviceSupabase.from("creator_access").delete().or(`creator_id.eq.${creatorId},user_id.eq.${userId}`)

      // IMPORTANT: Delete the creator record BEFORE deleting auth user
      // This prevents CASCADE issues where auth.users deletion tries to find the creators table
      const { error: creatorDeleteError } = await serviceSupabase.from("creators").delete().eq("id", creatorId)
      
      if (creatorDeleteError) {
        console.error("[v0] Error deleting creator:", creatorDeleteError)
        throw new Error("Failed to delete creator record")
      }

      // Delete from workspace_members BEFORE deleting auth user
      const { error: memberDeleteError } = await serviceSupabase
        .from("workspace_members")
        .delete()
        .eq("user_id", userId)
        .eq("workspace_id", workspaceId)
      
      if (memberDeleteError) {
        console.error("[v0] Error deleting workspace member:", memberDeleteError)
      }

      // Delete from user_profiles BEFORE deleting auth user
      const { error: profileDeleteError } = await serviceSupabase.from("user_profiles").delete().eq("id", userId)
      
      if (profileDeleteError) {
        console.error("[v0] Error deleting user profile:", profileDeleteError)
      }

      // Finally, delete the auth user (all public schema references should be gone now)
      const { error: authDeleteError } = await serviceSupabase.auth.admin.deleteUser(userId)

      if (authDeleteError) {
        console.error("[v0] Error deleting auth user:", authDeleteError)
        throw new Error(`Failed to delete auth user: ${authDeleteError.message}`)
      }

      revalidatePath("/profile/creators")
      return { success: true, message: "Creator and associated user account have been permanently deleted." }
    }
  } catch (error: any) {
    console.error("[v0] Error in deleteCreator:", error)
    throw new Error(error.message || "Failed to delete creator")
  }
}
