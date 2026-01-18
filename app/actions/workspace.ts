"use server"

import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { revalidatePath } from "next/cache"
import type { WorkspaceType } from "@/lib/types/database"

export async function updateWorkspace(data: {
  workspaceId: string
  workspace: {
    name: string
    type: WorkspaceType
  }
  creators: Array<{
    id?: string
    name: string
    sub_niches: string[]
    platforms: string[]
  }>
}) {
  try {
    const supabase = await createClient()
    const serviceSupabase = createServiceClient()

    // Check auth
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return { error: "Not authenticated" }
    }

    // Verify user is owner or admin
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", data.workspaceId)
      .eq("user_id", user.id)
      .single()

    if (!membership || membership.role !== "owner") {
      return { error: "Unauthorized - only owners can edit workspace" }
    }

    // Update workspace
    const { error: workspaceError } = await serviceSupabase
      .from("workspaces")
      .update({
        name: data.workspace.name,
        type: data.workspace.type,
      })
      .eq("id", data.workspaceId)

    if (workspaceError) throw workspaceError

    // Handle creators
    for (const creator of data.creators) {
      if (creator.id) {
        // Update existing creator
        const { error: creatorError } = await serviceSupabase
          .from("creators")
          .update({ name: creator.name })
          .eq("id", creator.id)

        if (creatorError) throw creatorError

        // Delete old sub-niches and platforms
        await serviceSupabase.from("creator_sub_niches").delete().eq("creator_id", creator.id)
        await serviceSupabase.from("creator_platforms").delete().eq("creator_id", creator.id)

        // Insert new sub-niches
        if (creator.sub_niches.length > 0) {
          await serviceSupabase.from("creator_sub_niches").insert(
            creator.sub_niches.map((sn) => ({
              creator_id: creator.id,
              sub_niche: sn,
              insecurity_id: null,
            })),
          )
        }

        // Insert new platforms
        if (creator.platforms.length > 0) {
          await serviceSupabase.from("creator_platforms").insert(
            creator.platforms.map((p) => ({
              creator_id: creator.id,
              platform_id: p,
            })),
          )
        }
      } else {
        // Create new creator
        const { data: newCreator, error: creatorError } = await serviceSupabase
          .from("creators")
          .insert({
            workspace_id: data.workspaceId,
            name: creator.name,
            primary_niche: creator.sub_niches[0] || "General",
          })
          .select("id")
          .single()

        if (creatorError) throw creatorError

        // Insert sub-niches
        if (creator.sub_niches.length > 0) {
          await serviceSupabase.from("creator_sub_niches").insert(
            creator.sub_niches.map((sn) => ({
              creator_id: newCreator.id,
              sub_niche: sn,
              insecurity_id: null,
            })),
          )
        }

        // Insert platforms
        if (creator.platforms.length > 0) {
          await serviceSupabase.from("creator_platforms").insert(
            creator.platforms.map((p) => ({
              creator_id: newCreator.id,
              platform_id: p,
            })),
          )
        }
      }
    }

    revalidatePath("/settings")
    revalidatePath("/dashboard")
    return { success: true }
  } catch (error: any) {
    console.error("[v0] Workspace update error:", error)
    return { error: error.message || "Failed to update workspace" }
  }
}

export async function deleteWorkspace(workspaceId: string) {
  try {
    const supabase = await createClient()
    const serviceSupabase = createServiceClient()

    // Check auth
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return { error: "Not authenticated" }
    }

    // Verify user is owner
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .single()

    if (!membership || membership.role !== "owner") {
      return { error: "Unauthorized - only owners can delete workspace" }
    }

    // Delete workspace (cascade will handle related records)
    const { error: deleteError } = await serviceSupabase.from("workspaces").delete().eq("id", workspaceId)

    if (deleteError) throw deleteError

    revalidatePath("/dashboard")
    revalidatePath("/settings")
    return { success: true }
  } catch (error: any) {
    console.error("[v0] Workspace deletion error:", error)
    return { error: error.message || "Failed to delete workspace" }
  }
}

export async function upgradeWorkspaceType(workspaceId: string, newType: WorkspaceType) {
  try {
    const supabase = await createClient()
    const serviceSupabase = createServiceClient()

    // Check auth
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return { error: "Not authenticated" }
    }

    // Verify user is owner or admin
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .single()

    if (!membership || membership.role !== "owner") {
      return { error: "Unauthorized - only owners can upgrade workspace" }
    }

    console.log("[v0] Server action: Upgrading workspace", workspaceId, "to", newType)

    // Update workspace type using service client to bypass RLS
    const { error: workspaceError } = await serviceSupabase
      .from("workspaces")
      .update({ type: newType })
      .eq("id", workspaceId)

    if (workspaceError) {
      console.error("[v0] Server action error:", workspaceError)
      throw workspaceError
    }

    console.log("[v0] Server action: Workspace upgraded successfully")
    revalidatePath("/profile/settings")
    revalidatePath("/profile/team")
    revalidatePath("/profile/creators")
    return { success: true }
  } catch (error: any) {
    console.error("[v0] Workspace upgrade error:", error)
    return { error: error.message || "Failed to upgrade workspace" }
  }
}
