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

export async function generateReferralCodes(workspaceId: string) {
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

    // Verify user is owner or manager
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .single()

    if (!membership || (membership.role !== "owner" && membership.role !== "manager")) {
      return { error: "Unauthorized - only owners and managers can generate referral codes" }
    }

    // Check if referral codes already exist
    const { data: existingCodes } = await serviceSupabase
      .from("workspace_referral_codes")
      .select("id")
      .eq("workspace_id", workspaceId)
      .limit(1)

    if (existingCodes && existingCodes.length > 0) {
      return { error: "Referral codes already exist for this workspace" }
    }

    // Generate referral codes for team member roles (excluding owner)
    // Owner: only one per workspace, no referral code needed
    // Creator: included for manager and team_agency workspaces (not personal_creator)
    // Need to check workspace type
    const { data: workspaceData } = await serviceSupabase
      .from("workspaces")
      .select("type")
      .eq("id", workspaceId)
      .single()

    const roles: Array<"manager" | "editor" | "viewer" | "strategist" | "creator"> = [
      "manager",
      "editor",
      "viewer",
      "strategist",
      ...(workspaceData?.type !== "personal_creator" ? ["creator"] : []),
    ]

    // Helper function to generate a random referral code
    const generateReferralCode = () => {
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // Exclude confusing chars like 0, O, I, 1
      let code = ""
      for (let i = 0; i < 12; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length))
      }
      return code
    }

    // Generate unique referral codes for each role
    const referralCodesData = []
    for (const role of roles) {
      let code: string
      let isUnique = false
      let attempts = 0
      // Ensure uniqueness
      while (!isUnique && attempts < 10) {
        code = generateReferralCode()
        const { data: existing } = await serviceSupabase
          .from("workspace_referral_codes")
          .select("id")
          .eq("referral_code", code)
          .single()
        if (!existing) {
          isUnique = true
        }
        attempts++
      }
      if (code!) {
        referralCodesData.push({
          workspace_id: workspaceId,
          role,
          referral_code: code,
        })
      }
    }

    if (referralCodesData.length > 0) {
      const { error: insertError } = await serviceSupabase
        .from("workspace_referral_codes")
        .insert(referralCodesData)

      if (insertError) {
        throw insertError
      }
    }

    revalidatePath("/profile/settings")
    revalidatePath("/profile/team")
    return { success: true }
  } catch (error: any) {
    console.error("[v0] Generate referral codes error:", error)
    return { error: error.message || "Failed to generate referral codes" }
  }
}

export async function getWorkspaceMembersWithEmails(workspaceId: string) {
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

    // Verify user is a member of the workspace
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .single()

    if (!membership) {
      return { error: "Not a member of this workspace" }
    }

    // Get all workspace members with their profiles
    const { data: members } = await serviceSupabase
      .from("workspace_members")
      .select("*, user_profiles(first_name, last_name, email, avatar_type, avatar_bg_color, avatar_text_color, avatar_storage_path)")
      .eq("workspace_id", workspaceId)
      .order("created_at")

    // For each member, ensure email is populated from auth.users if missing
    const membersWithEmails = await Promise.all((members || []).map(async (member: any) => {
      if (!member.user_profiles?.email && member.user_id) {
        // Use service client to get email from auth.users
        const { data: authUser } = await serviceSupabase.auth.admin.getUserById(member.user_id)
        if (authUser?.user?.email) {
          if (!member.user_profiles) {
            member.user_profiles = {}
          }
          member.user_profiles.email = authUser.user.email
          
          // Update user_profiles.email for future queries
          await serviceSupabase
            .from("user_profiles")
            .update({ email: authUser.user.email })
            .eq("id", member.user_id)
        }
      }
      return member
    }))

    return { data: membersWithEmails }
  } catch (error: any) {
    console.error("[v0] Error fetching workspace members:", error)
    return { error: error.message || "Failed to fetch workspace members" }
  }
}
