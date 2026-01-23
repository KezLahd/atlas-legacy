"use server"

import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

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
    is_owner?: boolean // Flag to indicate this is the owner's creator profile
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
      // If this is the owner's creator profile, use their profile name
      let creatorName = creator.name
      if (creator.is_owner) {
        creatorName = `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Owner Creator"
      } else if (creator.entity_type === "brand") {
        creatorName = creator.brand_name || ""
      }

      const { data: creatorData, error: creatorError } = await serviceSupabase
        .from("creators")
        .insert({
          workspace_id: workspace.id,
          // For brands, store brand_name in name column, for creators use name, for owner use their profile name
          name: creatorName,
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

  // Generate referral codes for team member roles (excluding owner)
  // Owner: only one per workspace, no referral code needed
  // Creator: included for manager and team_agency workspaces (not personal_creator)
  const roles: Array<"manager" | "editor" | "viewer" | "strategist" | "creator"> = [
    "manager",
    "editor",
    "viewer",
    "strategist",
    ...(data.workspace.type !== "personal_creator" ? (["creator"] as const) : []),
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
        workspace_id: workspace.id,
        role,
        referral_code: code,
      })
    }
  }

  if (referralCodesData.length > 0) {
    await serviceSupabase.from("workspace_referral_codes").insert(referralCodesData)
  }

  // Return workspace ID for team/manager to show referral codes dialog
  if (data.workspace.type !== "personal_creator") {
    return { workspaceId: workspace.id }
  }

  redirect("/dashboard")
}

export async function joinWorkspaceWithReferralCode(referralCode: string) {
  const supabase = await createClient()
  const serviceSupabase = createServiceClient()

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: "Not authenticated: " + (authError?.message || "No user") }
  }

  // Check if user already has a workspace
  const { data: existingMembership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .single()

  if (existingMembership) {
    return { error: "You are already a member of a workspace" }
  }

  // Find the referral code
  const { data: referralCodeData, error: codeError } = await serviceSupabase
    .from("workspace_referral_codes")
    .select("workspace_id, role")
    .eq("referral_code", referralCode.toUpperCase().trim())
    .single()

  if (codeError || !referralCodeData) {
    return { error: "Invalid referral code. Please check the code and try again." }
  }

  // Ensure user_profiles has email populated
  const { data: existingProfile } = await supabase
    .from("user_profiles")
    .select("email")
    .eq("id", user.id)
    .single()

  if (!existingProfile?.email && user.email) {
    // Update user_profiles with email if missing
    await supabase
      .from("user_profiles")
      .update({ email: user.email })
      .eq("id", user.id)
  }

  // Add user as workspace member with the role from the referral code
  const { data: workspaceMember, error: memberError } = await serviceSupabase
    .from("workspace_members")
    .insert({
      workspace_id: referralCodeData.workspace_id,
      user_id: user.id,
      role: referralCodeData.role,
    })
    .select()
    .single()

  if (memberError || !workspaceMember) {
    return { error: memberError?.message || "Failed to join workspace" }
  }

  // If role is "creator", create a creator record
  if (referralCodeData.role === "creator") {
    // Get user profile for name
    const { data: userProfile } = await supabase
      .from("user_profiles")
      .select("first_name, last_name")
      .eq("id", user.id)
      .single()

    const creatorName = userProfile?.first_name && userProfile?.last_name
      ? `${userProfile.first_name} ${userProfile.last_name}`
      : user.email?.split("@")[0] || "Creator"

    // Create creator record with user_id
    const { data: creatorData, error: creatorError } = await serviceSupabase
      .from("creators")
      .insert({
        workspace_id: referralCodeData.workspace_id,
        user_id: user.id, // IMPORTANT: Link creator to user account
        name: creatorName,
        primary_niche: "", // Empty niche - user must complete setup
      })
      .select()
      .single()

    if (creatorError) {
      console.error("[v0] Error creating creator record:", creatorError)
      return { error: "Failed to create creator record: " + creatorError.message }
    } else if (creatorData) {
      // Create default posting framework for the creator
      await serviceSupabase.from("creator_posting_frameworks").insert({
        creator_id: creatorData.id,
        posting_frequency: 7, // Default to 7 posts/week
        content_type_order: [1, 2, 3, 4, 5, 6, 7], // Default order
        excluded_day_types: [],
      })

      // Add creator access for the new member
      await serviceSupabase.from("creator_access").insert({
        workspace_member_id: workspaceMember.id,
        creator_id: creatorData.id,
      })

      // Redirect to creator setup page instead of dashboard
      redirect(`/onboarding/creator-setup?creatorId=${creatorData.id}`)
      return
    }
  }

  redirect("/dashboard")
}

export async function updateCreatorProfile(data: {
  creatorId: string
  creator: {
    name: string
    brand_name?: string
    primary_niche: string
    sub_niches: string[]
    platforms: string[]
    posting_frequency: number
    excluded_day_types: number[]
    content_type_order: number[]
  }
}) {
  const supabase = await createClient()
  const serviceSupabase = createServiceClient()

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: "Not authenticated: " + (authError?.message || "No user") }
  }

  // Verify user has access to this creator
  const { data: creatorAccess } = await supabase
    .from("creator_access")
    .select("*, workspace_members!inner(user_id)")
    .eq("creator_id", data.creatorId)
    .eq("workspace_members.user_id", user.id)
    .single()

  if (!creatorAccess) {
    return { error: "You don't have access to update this creator" }
  }

  // Update creator record
  const { error: creatorError } = await serviceSupabase
    .from("creators")
    .update({
      name: data.creator.name || data.creator.brand_name || "Creator",
      brand_name: data.creator.brand_name || null,
      primary_niche: data.creator.primary_niche,
    })
    .eq("id", data.creatorId)

  if (creatorError) {
    return { error: creatorError.message || "Failed to update creator" }
  }

  // Update or create posting framework
  const { data: existingFramework } = await serviceSupabase
    .from("creator_posting_frameworks")
    .select("id")
    .eq("creator_id", data.creatorId)
    .single()

  if (existingFramework) {
    await serviceSupabase
      .from("creator_posting_frameworks")
      .update({
        posting_frequency: data.creator.posting_frequency,
        excluded_day_types: data.creator.excluded_day_types,
        content_type_order: data.creator.content_type_order,
      })
      .eq("id", existingFramework.id)
  } else {
    await serviceSupabase.from("creator_posting_frameworks").insert({
      creator_id: data.creatorId,
      posting_frequency: data.creator.posting_frequency,
      excluded_day_types: data.creator.excluded_day_types,
      content_type_order: data.creator.content_type_order,
    })
  }

  // Update sub-niches (delete existing and insert new)
  await serviceSupabase.from("creator_sub_niches").delete().eq("creator_id", data.creatorId)

  if (data.creator.sub_niches.length > 0) {
    await serviceSupabase.from("creator_sub_niches").insert(
      data.creator.sub_niches.map((niche) => ({
        creator_id: data.creatorId,
        sub_niche: niche,
      })),
    )
  }

  // Update platforms (delete existing and insert new)
  await serviceSupabase.from("creator_platforms").delete().eq("creator_id", data.creatorId)

  if (data.creator.platforms.length > 0) {
    await serviceSupabase.from("creator_platforms").insert(
      data.creator.platforms.map((platformId) => ({
        creator_id: data.creatorId,
        platform_id: platformId,
      })),
    )
  }

  revalidatePath("/profile/creators")
  revalidatePath("/dashboard")
  return { success: true }
}
