import { supabase } from './supabase';

export interface CreateNotificationParams {
  recipientUserId: string;
  message: string;
  type: string;
  relatedItemId?: string;
  relatedListId?: string;
}

/**
 * Creates a notification using the Supabase Edge Function
 * This handles the RLS policy by using a dedicated serverless function with admin privileges
 */
export async function createNotification(params: CreateNotificationParams) {
  try {
    console.log('Creating notification with params:', params);
    
    // Get the current session for authentication
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.error('No active session found when creating notification');
      throw new Error('Authentication required to create notifications');
    }
    
    // Call the Edge Function with proper authentication
    const { data, error } = await supabase.functions.invoke('create-notification', {
      body: params,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });
    
    if (error) {
      console.error('Function Error creating notification:', error.message);
      throw new Error(`An error occurred while creating the notification: ${error.message}`);
    }
    
    console.log('Notification created successfully:', data);
    return data;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error creating notification:', errorMessage);
    throw new Error(`Failed to create notification: ${errorMessage}`);
  }
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(notificationId: string) {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .select()
      .single();
      
    if (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
    
    return data;
  } catch (err) {
    console.error('Exception marking notification as read:', err);
    throw err;
  }
}

/**
 * Mark all notifications for the current user as read
 */
export async function markAllNotificationsAsRead(userId: string) {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false)
      .select();
      
    if (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
    
    return data;
  } catch (err) {
    console.error('Exception marking all notifications as read:', err);
    throw err;
  }
}
