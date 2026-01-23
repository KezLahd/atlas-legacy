-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_delete_brainstorms_on_user_deletion ON public.user_profiles CASCADE;
DROP FUNCTION IF EXISTS public.delete_brainstorms_on_user_deletion() CASCADE;

DROP TRIGGER IF EXISTS trigger_delete_brainstorms_on_member_deletion ON public.workspace_members CASCADE;
DROP FUNCTION IF EXISTS public.delete_brainstorms_on_member_deletion() CASCADE;

-- Create trigger to delete brainstorms when user is deleted
CREATE OR REPLACE FUNCTION public.delete_brainstorms_on_user_deletion()
RETURNS TRIGGER AS $$
BEGIN
  -- When a user_profile is deleted, delete their associated brainstorms
  DELETE FROM public.brainstorms WHERE user_id = old.id;
  RETURN old;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_delete_brainstorms_on_user_deletion
AFTER DELETE ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.delete_brainstorms_on_user_deletion();

-- Create trigger to delete brainstorms when workspace member is removed
CREATE OR REPLACE FUNCTION public.delete_brainstorms_on_member_deletion()
RETURNS TRIGGER AS $$
BEGIN
  -- When a workspace member is deleted, delete their associated brainstorms
  DELETE FROM public.brainstorms 
  WHERE workspace_id = old.workspace_id AND user_id = old.user_id;
  RETURN old;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_delete_brainstorms_on_member_deletion
AFTER DELETE ON public.workspace_members
FOR EACH ROW
EXECUTE FUNCTION public.delete_brainstorms_on_member_deletion();
