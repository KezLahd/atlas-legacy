-- Drop triggers first, then functions, then recreate with proper schema qualification

-- Drop triggers on user_profiles
DROP TRIGGER IF EXISTS trigger_delete_creator_on_user_deletion ON public.user_profiles CASCADE;
DROP TRIGGER IF EXISTS trigger_delete_creator_on_member_deletion ON public.workspace_members CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS public.delete_creator_on_user_deletion();
DROP FUNCTION IF EXISTS public.delete_creator_on_member_deletion();

-- Recreate delete_creator_on_user_deletion function with proper schema qualification
CREATE OR REPLACE FUNCTION public.delete_creator_on_user_deletion()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.creators WHERE public.creators.user_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Recreate delete_creator_on_member_deletion function with proper schema qualification
CREATE OR REPLACE FUNCTION public.delete_creator_on_member_deletion()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.creators WHERE public.creators.user_id = OLD.user_id AND public.creators.workspace_id = OLD.workspace_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Recreate triggers
CREATE TRIGGER trigger_delete_creator_on_user_deletion
AFTER DELETE ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.delete_creator_on_user_deletion();

CREATE TRIGGER trigger_delete_creator_on_member_deletion
AFTER DELETE ON public.workspace_members
FOR EACH ROW
EXECUTE FUNCTION public.delete_creator_on_member_deletion();
