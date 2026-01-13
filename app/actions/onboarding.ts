"use server"

import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { redirect } from "next/navigation"

export async function createWorkspaceWithCreators(data: {
  workspace: {
    name: string
    type: "personal_creator" | "manager" | "team_agency"
  }
  creators: Array<{
    name: string
    brand_name?: string
    primary_niche: string
    sub_niches: string[]
    platforms: string[]
    entity_type?: "creator" | "brand"
    posting_frequency: number
    excluded_day_types: number[]
    content_type_order: number[] // Added content type order
  }>
  invitations: Array<{
    first_name: string
    last_name: string
    email: string
    role: "owner" | "manager" | "editor" | "viewer" | "strategist" | "creator"
  }>
}) {
  const supabase = await createClient()

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: "Not authenticated: " + (authError?.message || "No user") }
  }

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("id, is_admin, first_name, last_name")
    .eq("id", user.id)
    .single()

  if (profileError || !profile) {
    return { error: "Profile not found: " + (profileError?.message || "No profile exists") }
  }

  if (!profile.is_admin) {
    return { error: "User does not have admin privileges to create workspaces" }
  }

  const serviceSupabase = createServiceClient()

  // Create workspace
  const { data: workspace, error: workspaceError } = await serviceSupabase
    .from("workspaces")
    .insert({
      name: data.workspace.name,
      type: data.workspace.type,
    })
    .select()
    .single()

  if (workspaceError || !workspace) {
    return { error: workspaceError?.message || "Failed to create workspace" }
  }

  // Add user as workspace owner
  const { data: workspaceMember, error: memberError } = await serviceSupabase
    .from("workspace_members")
    .insert({
      workspace_id: workspace.id,
      user_id: user.id,
      role: "owner",
    })
    .select()
    .single()

  if (memberError || !workspaceMember) {
    return { error: memberError?.message || "Failed to add workspace member" }
  }

  if (data.workspace.type === "personal_creator") {
    const creatorName = `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Personal Creator"
    const creatorData = data.creators[0] // Get niches/platforms from form

    const { data: personalCreator, error: creatorError } = await serviceSupabase
      .from("creators")
      .insert({
        workspace_id: workspace.id,
        name: creatorName,
        brand_name: null, // Personal creators don't have separate brand names
        primary_niche: creatorData.primary_niche,
      })
      .select()
      .single()

    if (creatorError || !personalCreator) {
      return { error: "Failed to create personal creator: " + creatorError?.message }
    }

    await serviceSupabase.from("creator_posting_frameworks").insert({
      creator_id: personalCreator.id,
      posting_frequency: creatorData.posting_frequency,
      excluded_day_types: creatorData.excluded_day_types,
      content_type_order: creatorData.content_type_order, // Added content type order
    })

    // Add creator access for the user
    await serviceSupabase.from("creator_access").insert({
      workspace_member_id: workspaceMember.id,
      creator_id: personalCreator.id,
    })

    if (creatorData.sub_niches.length > 0) {
      await serviceSupabase.from("creator_sub_niches").insert(
        creatorData.sub_niches.map((niche) => ({
          creator_id: personalCreator.id,
          sub_niche: niche,
        })),
      )
    }

    // Add platforms
    if (creatorData.platforms.length > 0) {
      await serviceSupabase.from("creator_platforms").insert(
        creatorData.platforms.map((platformId) => ({
          creator_id: personalCreator.id,
          platform_id: platformId,
        })),
      )
    }
  } else {
    for (const creator of data.creators) {
      const { data: creatorData, error: creatorError } = await serviceSupabase
        .from("creators")
        .insert({
          workspace_id: workspace.id,
          // For brands, store brand_name in name column, for creators use name
          name: creator.entity_type === "brand" ? creator.brand_name || "" : creator.name,
          brand_name: creator.entity_type === "brand" ? creator.brand_name || null : creator.brand_name || null,
          primary_niche: creator.primary_niche,
        })
        .select()
        .single()

      if (creatorError || !creatorData) continue

      await serviceSupabase.from("creator_posting_frameworks").insert({
        creator_id: creatorData.id,
        posting_frequency: creator.posting_frequency,
        excluded_day_types: creator.excluded_day_types,
        content_type_order: creator.content_type_order, // Added content type order
      })

      // Add creator access for the owner
      await serviceSupabase.from("creator_access").insert({
        workspace_member_id: workspaceMember.id,
        creator_id: creatorData.id,
      })

      if (creator.sub_niches.length > 0) {
        await serviceSupabase.from("creator_sub_niches").insert(
          creator.sub_niches.map((niche) => ({
            creator_id: creatorData.id,
            sub_niche: niche,
          })),
        )
      }

      // Add platforms
      if (creator.platforms.length > 0) {
        await serviceSupabase.from("creator_platforms").insert(
          creator.platforms.map((platformId) => ({
            creator_id: creatorData.id,
            platform_id: platformId,
          })),
        )
      }
    }
  }

  // Create team invitations
  if (data.invitations.length > 0) {
    await serviceSupabase.from("team_invitations").insert(
      data.invitations.map((inv) => ({
        workspace_id: workspace.id,
        first_name: inv.first_name,
        last_name: inv.last_name,
        email: inv.email,
        role: inv.role,
        invited_by: user.id,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })),
    )
  }

  redirect("/dashboard")
}
