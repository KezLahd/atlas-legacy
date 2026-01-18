-- Create access_requests table for storing access requests
CREATE TABLE IF NOT EXISTS access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  first_name TEXT,
  last_name TEXT,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  verification_code TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_access_requests_email ON access_requests(email);

-- Enable RLS
ALTER TABLE access_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies - allow anyone to insert (for public access requests), but only owners can view/update
CREATE POLICY "Anyone can create access request" ON access_requests
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Owners can view access requests" ON access_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.user_id = auth.uid()
      AND wm.role = 'owner'
    )
  );

CREATE POLICY "Owners can update access requests" ON access_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.user_id = auth.uid()
      AND wm.role = 'owner'
    )
  );

COMMIT;
