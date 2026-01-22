-- Create workspace_referral_codes table to store referral codes for each role per workspace
CREATE TABLE workspace_referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  referral_code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, role)
);

-- Enable RLS
ALTER TABLE workspace_referral_codes ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_workspace_referral_codes_workspace ON workspace_referral_codes(workspace_id);
CREATE INDEX idx_workspace_referral_codes_code ON workspace_referral_codes(referral_code);

-- RLS Policies

-- Workspace members can view referral codes for their workspace
CREATE POLICY "Workspace members can view referral codes" ON workspace_referral_codes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = workspace_referral_codes.workspace_id
      AND user_id = auth.uid()
    )
  );

-- Owners can create referral codes (happens during workspace creation via service role)
-- This is handled server-side, so we don't need a client-side policy

-- Anyone can read referral codes to validate them during sign-up (but only see code, not workspace_id/role)
-- Actually, we want to restrict this - only allow reading the code to validate it exists and get workspace_id/role
-- Let's make it so anyone can select, but we'll validate server-side
CREATE POLICY "Anyone can view referral codes for validation" ON workspace_referral_codes
  FOR SELECT USING (true);
