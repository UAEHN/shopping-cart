-- Add the purchased_by column to the items table
ALTER TABLE public.items
ADD COLUMN purchased_by UUID;

-- Add a foreign key constraint to link purchased_by to the users table
-- Assuming the users table is public.users. Change if it's auth.users.
ALTER TABLE public.items
ADD CONSTRAINT fk_purchased_by_user
FOREIGN KEY (purchased_by)
REFERENCES public.users (id)
ON DELETE SET NULL; -- Set purchased_by to NULL if the purchasing user is deleted

-- Optionally, add an index for performance
CREATE INDEX IF NOT EXISTS idx_items_purchased_by ON public.items (purchased_by);
