-- Add default posting frameworks for creators who don't have them
-- This ensures all creators have posting framework data visible on their detail pages

INSERT INTO creator_posting_frameworks (creator_id, posting_frequency, content_type_order, excluded_day_types)
SELECT
  c.id,
  7, -- Default 7 posts per week
  ARRAY[1,2,3,4,5,6,7], -- Default content type order (all 7 types)
  ARRAY[]::integer[] -- No excluded days
FROM creators c
LEFT JOIN creator_posting_frameworks cpf ON c.id = cpf.creator_id
WHERE cpf.creator_id IS NULL;

-- Add comment explaining the default frameworks
COMMENT ON TABLE creator_posting_frameworks IS 'Posting frameworks for creators. Default frameworks are automatically created for all creators with 7 posts/week and standard content type order.';
