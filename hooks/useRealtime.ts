import { useState, useEffect } from 'react';
import { supabase } from '@/services/supabase';
import { ListItem } from '@/types/list';
import { ListMessage } from '@/types/message';
import { RealtimeChannel } from '@supabase/supabase-js';

// أنواع الإشعارات
export type NotificationType = 'NEW_LIST' | 'LIST_STATUS' | 'NEW_ITEM' | 'ITEM_STATUS';

// نوع الإشعار
export interface Notification {
  id: string;
  user_id: string;
  message: string;
  related_item_id?: string;
  related_list_id?: string;
  type: NotificationType;
  is_read: boolean;
  created_at: string;
}

// Hook لمراقبة التغييرات في المنتجات
export const useListItemsRealtime = (listId: string) => {
  const [items, setItems] = useState<ListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // جلب المنتجات الأولية
    const fetchItems = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('items')
          .select('*')
          .eq('list_id', listId)
          .order('created_at', { ascending: true });

        if (error) {
          throw error;
        }

        setItems(data as ListItem[]);
      } catch (err: any) {
        console.error('Error fetching items:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchItems();

    // الاشتراك في التغييرات
    const subscription = supabase
      .channel(`items-${listId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'items',
          filter: `list_id=eq.${listId}`
        },
        (payload) => {
          setItems((prevItems) => [...prevItems, payload.new as ListItem]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'items',
          filter: `list_id=eq.${listId}`
        },
        (payload) => {
          setItems((prevItems) =>
            prevItems.map((item) =>
              item.id === payload.new.id ? (payload.new as ListItem) : item
            )
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'items',
          filter: `list_id=eq.${listId}`
        },
        (payload) => {
          setItems((prevItems) =>
            prevItems.filter((item) => item.id !== payload.old.id)
          );
        }
      )
      .subscribe();

    // تنظيف الاشتراك
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [listId]);

  return { items, isLoading, error };
};

// Hook لمراقبة التغييرات في الرسائل
export const useListMessagesRealtime = (listId: string) => {
  const [messages, setMessages] = useState<ListMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // جلب الرسائل الأولية
    const fetchMessages = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('list_id', listId)
          .order('created_at', { ascending: true });

        if (error) {
          throw error;
        }

        setMessages(data as ListMessage[]);
      } catch (err: any) {
        console.error('Error fetching messages:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMessages();

    // الاشتراك في التغييرات
    const subscription = supabase
      .channel(`messages-${listId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `list_id=eq.${listId}`
        },
        (payload) => {
          setMessages((prevMessages) => [...prevMessages, payload.new as ListMessage]);
        }
      )
      .subscribe();

    // تنظيف الاشتراك
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [listId]);

  return { messages, isLoading, error };
};

// Hook لمراقبة الإشعارات الجديدة
export const useNotifications = (userId: string | null, limit: number = 10) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      // Reset state if no user ID is provided
      setNotifications([]);
      setUnreadCount(0);
      setIsLoading(false);
      setError(null); // Clear any previous errors
      return;
    }

    // Set loading state only when starting for a new user ID
    setIsLoading(true);
    setError(null); // Clear previous errors
    console.log(`useNotifications: Starting effect for user: ${userId}`);

    let isMounted = true; // Flag to prevent state updates after unmount
    let channel: RealtimeChannel | null = null; // Keep track of the channel instance

    // جلب الإشعارات الأولية
    const fetchNotifications = async () => {
      console.log(`useNotifications: Fetching initial notifications for user: ${userId}`);
      try {
        const { data, error: fetchError } = await supabase
          .from('notifications')
          .select('*', { count: 'exact' }) // Use count for unread calculation later if needed
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (!isMounted) return; // Don't update state if component unmounted

        if (fetchError) {
          console.error('useNotifications: Error fetching notifications:', fetchError);
          setError(fetchError.message);
          setNotifications([]); // Clear notifications on error
          setUnreadCount(0);
        } else {
          console.log(`useNotifications: Fetched ${data?.length || 0} notifications for user ${userId}:`, data);
          setNotifications(data as Notification[]);
          const unread = data.filter(n => !n.is_read).length;
          setUnreadCount(unread);
          console.log(`useNotifications: Initial unread count: ${unread}`);
        }
      } catch (err: any) {
        if (isMounted) {
          console.error('useNotifications: Exception fetching notifications:', err);
          setError(err.message || 'An unexpected error occurred');
          setNotifications([]);
          setUnreadCount(0);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchNotifications();

    // --- Realtime Subscription Setup ---
    const channelName = `notifications-list-${userId}`;
    console.log(`useNotifications: Setting up channel: ${channelName}`);

    // Remove existing channel first if any (safer approach)
    supabase.channel(channelName, { // Provide config with broadcast and presence keys if needed
        config: {
          broadcast: { self: true }, // Example config
        },
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log(`useNotifications: New notification received for user ${userId}:`, payload.new);
          const newNotification = payload.new as Notification;

          // Add to the beginning of the list & update unread count
          if (isMounted) { // Check if component is still mounted
            setNotifications(prev => [newNotification, ...prev.slice(0, limit - 1)]);
            setUnreadCount(prev => prev + 1);

            // Play notification sound
            try {
              const audio = new Audio('/sounds/notification.mp3'); // Path relative to public folder
              audio.play().catch(playError => {
                // Autoplay might be blocked by the browser initially
                // Log the error but don't crash
                console.warn('Audio play failed (possibly due to autoplay restrictions):', playError);
              });
            } catch (audioError) {
              console.error('Error creating or playing audio:', audioError);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          if (!isMounted) return;
          const updatedNotification = payload.new as Notification;
          console.log('useNotifications: Received updated notification:', updatedNotification);
          setNotifications(prev =>
            prev.map(n => n.id === updatedNotification.id ? updatedNotification : n)
          );
          // Recalculate unread count after update
          setNotifications(currentNotifications => {
             const newUnreadCount = currentNotifications.filter(n => !n.is_read).length;
             if (newUnreadCount !== unreadCount) { // Only update state if changed
                setUnreadCount(newUnreadCount);
                console.log(`useNotifications: Unread count updated to: ${newUnreadCount}`);
             }
             return currentNotifications; // Important: return the current state for map iteration
          });
        }
      )
      .subscribe((status, err) => {
        console.log(`useNotifications: Channel ${channelName} subscription status: ${status}`);
        if (!isMounted) return;

        if (status === 'SUBSCRIBED') {
          console.log(`useNotifications: Successfully subscribed to channel: ${channelName}`);
          setError(null); // Clear error on successful subscription
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error(`useNotifications: Channel subscription error/timeout. Status: ${status}`, err);
          setError(`Subscription failed: ${status}. ${err?.message || ''}`);
          // Consider implementing a retry mechanism with backoff here if needed
          // For now, just log the error. Automatic retries might be handled by the SDK.
        } else if (status === 'CLOSED') {
           console.warn(`useNotifications: Channel ${channelName} was closed.`);
           // The channel might close intentionally on cleanup or due to network issues.
           // No automatic retry here unless specifically required.
        }
      });

      // Store the channel instance
      channel = supabase.channel(channelName);


    // --- Cleanup Function ---
    return () => {
      console.log(`useNotifications: Cleaning up effect for user: ${userId}, removing channel: ${channelName}`);
      isMounted = false; // Mark as unmounted
      if (channel) {
        supabase.removeChannel(channel)
          .then((status) => console.log(`useNotifications: Channel ${channelName} removal status: ${status}`))
          .catch((error) => console.error(`useNotifications: Error removing channel ${channelName}:`, error));
        channel = null; // Clear the reference
      } else {
         // Attempt removal by name if channel reference is lost (less ideal)
         supabase.removeChannel(supabase.channel(channelName))
             .then((status) => console.log(`useNotifications: Channel ${channelName} (removed by name) status: ${status}`))
             .catch((error) => console.error(`useNotifications: Error removing channel ${channelName} by name:`, error));
      }
    };
  }, [userId, limit]); // Re-run effect if userId or limit changes

  // وظيفة لتحديث حالة الإشعار إلى مقروء
  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) {
        throw error;
      }

      // تحديث القائمة المحلية
      setNotifications(prevNotifications =>
        prevNotifications.map(notification =>
          notification.id === notificationId
            ? { ...notification, is_read: true }
            : notification
        )
      );
      
      // تحديث عدد الإشعارات غير المقروءة
      setUnreadCount(prevCount => Math.max(0, prevCount - 1));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  // وظيفة لتحديث حالة جميع الإشعارات إلى مقروءة
  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) {
        throw error;
      }

      // تحديث القائمة المحلية
      setNotifications(prevNotifications =>
        prevNotifications.map(notification => ({
          ...notification,
          is_read: true
        }))
      );
      
      // إعادة تعيين عدد الإشعارات غير المقروءة
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead
  };
}; 