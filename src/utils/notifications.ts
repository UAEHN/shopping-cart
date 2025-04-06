import { supabase } from '@/services/supabase';
import { toast } from '@/components/ui/toast'; // Assuming toast is importable like this

/**
 * Creates a notification entry in the database.
 * 
 * @param recipientUser - Object containing the recipient's id and username. Can be null.
 * @param message - The notification message content.
 * @param type - The type of notification (e.g., 'NEW_LIST', 'ITEM_UPDATE').
 * @param itemId - Optional ID of the related item.
 * @param listId - Optional ID of the related list.
 */
export const createNotification = async (
  recipientUser: { id: string; username: string; } | null,
  message: string,
  type: string,
  itemId: string | null = null,
  listId: string | null = null
) => {
  if (!recipientUser) {
    // Keep this error for invalid input
    console.error('createNotification: Invalid recipientUser object provided.');
    return;
  }

  const notificationData = {
    user_id: recipientUser.id, // Use recipient's ID
    message: message,
    type: type,
    related_item_id: itemId,
    related_list_id: listId,
    is_read: false, // Default to unread
  };

  try {
    // Using direct insert
    const { data, error } = await supabase
      .from('notifications')
      .insert(notificationData)
      .select(); // Select the inserted data to confirm insertion

    if (error) {
      // Handle potential errors during insert (though RLS is currently disabled)
      toast.error(`خطأ في إنشاء الإشعار: ${error.message}`, 3000);
    } 
    // No need to log success/warnings anymore after debugging
    
  } catch (err) {
    // Handle unexpected errors
    toast.error('حدث خطأ غير متوقع أثناء إنشاء الإشعار', 3000);
  }
}; 