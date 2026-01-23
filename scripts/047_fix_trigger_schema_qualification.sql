-- Drop the problematic triggers first
DROP TRIGGER IF EXISTS delete_creator_on_user_deletion_trigger ON auth.users;
DROP TRIGGER IF EXISTS delete_creator_on_member_deletion_trigger ON public.workspace_members;

-- Drop and recreate the functions with proper schema qualification
DROP FUNCTION IF EXISTS public.delete_creator_on_user_deletion();
DROP FUNCTION IF EXISTS public.delete_creator_on_member_deletion();

-- Recreate delete_creator_on_user_deletion with schema-qualified table names
CREATE FUNCTION public.delete_creator_on_user_deletion()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete creators directly linked to this user
  DELETE FROM public.creators
  WHERE user_id = OLD.id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate delete_creator_on_member_deletion with schema-qualified table names
CREATE FUNCTION public.delete_creator_on_member_deletion()
RETURNS TRIGGER AS $$
BEGIN
  -- When a workspace_member is deleted, check if they had creator_access
  -- If so, delete the associated creator(s) if this was their only access
  DELETE FROM public.creators
  WHERE id IN (
    SELECT creator_id 
    FROM public.creator_access 
    WHERE workspace_member_id = OLD.id
  )
  AND NOT EXISTS (
    -- Only delete if no other workspace_members have access to this creator
    SELECT 1 
    FROM public.creator_access ca
    JOIN public.workspace_members wm ON ca.workspace_member_id = wm.id
    WHERE ca.creator_id = public.creators.id
    AND wm.id != OLD.id
  );
  
  -- Also delete creators directly linked to this user via user_id
  DELETE FROM public.creators
  WHERE user_id = OLD.user_id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the triggers
CREATE TRIGGER delete_creator_on_user_deletion_trigger
BEFORE DELETE ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.delete_creator_on_user_deletion();

CREATE TRIGGER delete_creator_on_member_deletion_trigger
BEFORE DELETE ON public.workspace_members
FOR EACH ROW
EXECUTE FUNCTION public.delete_creator_on_member_deletion();
