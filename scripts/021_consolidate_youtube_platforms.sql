-- Consolidate YouTube Shorts and YouTube Long into single YouTube platform

-- First, get the IDs
DO $$
DECLARE
  youtube_id UUID;
  youtube_shorts_id UUID;
  youtube_long_id UUID;
BEGIN
  -- Check if YouTube platform exists
  SELECT id INTO youtube_id FROM platforms WHERE name = 'YouTube';
  
  -- If YouTube doesn't exist, create it
  IF youtube_id IS NULL THEN
    INSERT INTO platforms (name) VALUES ('YouTube') RETURNING id INTO youtube_id;
  END IF;
  
  -- Get YouTube Shorts and YouTube Long IDs
  SELECT id INTO youtube_shorts_id FROM platforms WHERE name = 'YouTube Shorts';
  SELECT id INTO youtube_long_id FROM platforms WHERE name = 'YouTube Long';
  
  -- Fix creator_platforms migration to handle duplicates properly
  -- Update all creator_platforms references to point to YouTube
  IF youtube_shorts_id IS NOT NULL THEN
    -- Only update records where the creator doesn't already have YouTube
    UPDATE creator_platforms 
    SET platform_id = youtube_id 
    WHERE platform_id = youtube_shorts_id
    AND NOT EXISTS (
      SELECT 1 FROM creator_platforms cp2 
      WHERE cp2.creator_id = creator_platforms.creator_id 
      AND cp2.platform_id = youtube_id
    );
    
    DELETE FROM creator_platforms WHERE platform_id = youtube_shorts_id;
  END IF;
  
  IF youtube_long_id IS NOT NULL THEN
    UPDATE creator_platforms 
    SET platform_id = youtube_id 
    WHERE platform_id = youtube_long_id
    AND NOT EXISTS (
      SELECT 1 FROM creator_platforms cp2 
      WHERE cp2.creator_id = creator_platforms.creator_id 
      AND cp2.platform_id = youtube_id
    );
    
    DELETE FROM creator_platforms WHERE platform_id = youtube_long_id;
  END IF;
  
  -- Fix content_platforms migration to handle duplicates properly
  -- Update all content_platforms references to point to YouTube
  IF youtube_shorts_id IS NOT NULL THEN
    UPDATE content_platforms 
    SET platform_id = youtube_id 
    WHERE platform_id = youtube_shorts_id
    AND NOT EXISTS (
      SELECT 1 FROM content_platforms cp2 
      WHERE cp2.content_id = content_platforms.content_id 
      AND cp2.platform_id = youtube_id
    );
    
    DELETE FROM content_platforms WHERE platform_id = youtube_shorts_id;
  END IF;
  
  IF youtube_long_id IS NOT NULL THEN
    UPDATE content_platforms 
    SET platform_id = youtube_id 
    WHERE platform_id = youtube_long_id
    AND NOT EXISTS (
      SELECT 1 FROM content_platforms cp2 
      WHERE cp2.content_id = content_platforms.content_id 
      AND cp2.platform_id = youtube_id
    );
    
    DELETE FROM content_platforms WHERE platform_id = youtube_long_id;
  END IF;
  
  -- Delete the old YouTube Shorts and YouTube Long platforms
  DELETE FROM platforms WHERE name IN ('YouTube Shorts', 'YouTube Long');
END $$;
