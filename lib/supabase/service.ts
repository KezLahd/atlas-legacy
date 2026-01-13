import { createClient } from "@supabase/supabase-js"

// Service role client bypasses RLS - use ONLY for admin operations after verifying permissions
export function createServiceClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEW_SUPABASE_SERVICE_ROLE_KEY!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
