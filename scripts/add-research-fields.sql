-- Add format and posting_date fields to research table
ALTER TABLE research ADD COLUMN IF NOT EXISTS format text;
ALTER TABLE research ADD COLUMN IF NOT EXISTS posting_date date;
