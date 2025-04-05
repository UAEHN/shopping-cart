-- Fix for notifications table Row Level Security policy
-- This migration addresses the RLS policy violation error when creating notifications

-- First, let's check if the notifications table exists and create it if not
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  related_item_id UUID REFERENCES items(id) ON DELETE SET NULL,
  related_list_id UUID REFERENCES lists(id) ON DELETE SET NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Drop existing RLS policies for the notifications table if they exist
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Service role can insert notifications" ON notifications;

-- Enable Row Level Security on the notifications table
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to view only their own notifications
CREATE POLICY "Users can view their own notifications" 
ON notifications 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create policy to allow users to update only their own notifications (for marking as read)
CREATE POLICY "Users can update their own notifications" 
ON notifications 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create policy to allow the service role to insert notifications for any user
-- This is crucial for the create-notification function to work
CREATE POLICY "Service role can insert notifications" 
ON notifications 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Grant necessary permissions to authenticated users and service_role
GRANT SELECT, UPDATE ON notifications TO authenticated;
GRANT ALL ON notifications TO service_role;
