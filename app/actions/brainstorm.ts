"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function createBrainstorm(data: {
  workspaceId: string
  title: string
  description?: string
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Unauthorized" }
  }

  const { error } = await supabase.from("brainstorms").insert({
    user_id: user.id,
    workspace_id: data.workspaceId,
    title: data.title,
    description: data.description || null,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/brainstorm")
  return { success: true }
}

export async function updateBrainstorm(data: {
  id: string
  title: string
  description?: string
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Unauthorized" }
  }

  const { error } = await supabase
    .from("brainstorms")
    .update({
      title: data.title,
      description: data.description || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", data.id)
    .eq("user_id", user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/brainstorm")
  return { success: true }
}

export async function deleteBrainstorm(id: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Unauthorized" }
  }

  const { error } = await supabase
    .from("brainstorms")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/brainstorm")
  return { success: true }
}

export async function linkBrainstormToContent(brainstormId: string, contentId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Unauthorized" }
  }

  const { error } = await supabase
    .from("brainstorms")
    .update({
      content_id: contentId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", brainstormId)
    .eq("user_id", user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/brainstorm")
  return { success: true }
}
