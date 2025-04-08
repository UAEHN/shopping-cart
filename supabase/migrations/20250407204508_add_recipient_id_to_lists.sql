-- Add the recipient_id column to the lists table
ALTER TABLE public.lists
ADD COLUMN recipient_id UUID;

-- Add a foreign key constraint to link recipient_id to the users table (assuming your users table is public.users)
-- If your users table is auth.users, change public.users to auth.users
ALTER TABLE public.lists
ADD CONSTRAINT fk_recipient_user
FOREIGN KEY (recipient_id)
REFERENCES public.users (id)
ON DELETE SET NULL; -- Or ON DELETE CASCADE depending on desired behavior

-- Optionally, add an index for better performance on queries involving recipient_id
CREATE INDEX IF NOT EXISTS idx_lists_recipient_id ON public.lists (recipient_id);
