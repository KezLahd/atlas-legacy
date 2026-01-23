-- Fix trigger functions to use correct column names
-- The trigger on user_profiles deletion should delete creators where user_id = old.id (not old.creator_id)

DROP TRIGGER IF EXISTS trigger_delete_creator_on_user_deletion ON public.user_profiles;
DROP FUNCTION IF EXISTS public.delete_creator_on_user_deletion();

CREATE OR REPLACE FUNCTION public.delete_creator_on_user_deletion()
RETURNS TRIGGER AS $$
BEGIN
  -- When a user_profile is deleted, delete their associated creators
  -- old.id is the user_id in user_profiles table
  DELETE FROM public.creators WHERE user_id = old.id;
  RETURN old;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_delete_creator_on_user_deletion
AFTER DELETE ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.delete_creator_on_user_deletion();

-- Also fix the workspace_members trigger
DROP TRIGGER IF EXISTS trigger_delete_creator_on_member_deletion ON public.workspace_members;
DROP FUNCTION IF EXISTS public.delete_creator_on_member_deletion();

CREATE OR REPLACE FUNCTION public.delete_creator_on_member_deletion()
RETURNS TRIGGER AS $$
BEGIN
  -- When a workspace member is deleted, delete their associated creators
  DELETE FROM public.creators 
  WHERE workspace_id = old.workspace_id AND user_id = old.user_id;
  RETURN old;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_delete_creator_on_member_deletion
AFTER DELETE ON public.workspace_members
FOR EACH ROW
EXECUTE FUNCTION public.delete_creator_on_member_deletion();
