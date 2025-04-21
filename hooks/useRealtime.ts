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
  is_hidden: boolean;
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
          .select('id, user_id, message, related_item_id, related_list_id, type, is_read, is_hidden, created_at', { count: 'exact' })
          .eq('user_id', userId)
          .eq('is_hidden', false)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (!isMounted) return;

        if (fetchError) {
          console.error('useNotifications: Error fetching notifications:', fetchError);
          setError(fetchError.message);
          setNotifications([]);
          setUnreadCount(0);
        } else {
          console.log(`useNotifications: Fetched ${data?.length || 0} non-hidden notifications for user ${userId}:`, data);
          setNotifications(data as Notification[]);
          const unread = data.filter(n => !n.is_read).length;
          setUnreadCount(unread);
          console.log(`useNotifications: Initial unread count (non-hidden): ${unread}`);
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
    channel = supabase.channel(channelName, { // Assign to channel variable
        config: {
          broadcast: { self: true },
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
          // --- Add console log for incoming notification ---
          console.log('[useNotifications] Realtime INSERT received:', payload.new);
          // --------------------------------------------------
          if (isMounted) {
            const newNotification = payload.new as Notification;
            // Prevent adding if already hidden (though fetch shouldn't get hidden ones)
            if (newNotification.is_hidden) return;

            setNotifications(prev => {
              // Avoid duplicates if event arrives multiple times
              if (prev.some(n => n.id === newNotification.id)) return prev;
              // Add to the beginning and maintain limit
              const updated = [newNotification, ...prev];
              return updated.slice(0, limit);
            });
            // Increment unread count only if the new one is unread
            if (!newNotification.is_read) {
              setUnreadCount(prev => prev + 1);
              console.log('[useNotifications] Incremented unread count.');
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
          const oldNotification = payload.old as Partial<Notification>; // Old might not have all fields
          console.log('useNotifications: Received UPDATE event:', updatedNotification, 'Old:', oldNotification);

          setNotifications((prev) => {
            const existingIndex = prev.findIndex(n => n.id === updatedNotification.id);
            
            // If the notification becomes hidden, remove it from the list
            if (updatedNotification.is_hidden) {
                 console.log('Notification became hidden, removing from list:', updatedNotification.id);
                 return prev.filter(n => n.id !== updatedNotification.id);
            } 
            // If it wasn't hidden and doesn't exist in list (e.g., due to limit), add it
            else if (existingIndex === -1) {
                 console.log('Notification updated but not hidden and not in list, adding:', updatedNotification.id);
                 return [
                    updatedNotification, 
                    ...prev
                 ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, limit);
            }
            // Otherwise, update the existing notification in the list
            else {
                console.log('Updating existing notification in list:', updatedNotification.id);
                const newList = [...prev];
                newList[existingIndex] = updatedNotification;
                return newList;
            }
          });

          // Update unread count based on is_read changes
          const wasRead = oldNotification.is_read === true;
          const isRead = updatedNotification.is_read === true;
          const wasHidden = oldNotification.is_hidden === true;
          const isHidden = updatedNotification.is_hidden === true;

          if (!isRead && wasRead && !isHidden) setUnreadCount((prev) => prev + 1); // Became unread
          if (isRead && !wasRead && !isHidden) setUnreadCount((prev) => Math.max(0, prev - 1)); // Became read
          if (!wasHidden && isHidden && !isRead) setUnreadCount((prev) => Math.max(0, prev - 1)); // Became hidden while unread
          if (wasHidden && !isHidden && !isRead) setUnreadCount((prev) => prev + 1); // Became visible while unread
        }
      )
      .subscribe((status, err) => {
        if (err) {
          console.error(`useNotifications: Realtime subscription error on ${channelName}:`, err);
          setError('Failed to subscribe to real-time updates.');
        }
        console.log(`useNotifications: Realtime subscription status on ${channelName}: ${status}`);
      });

    console.log(`useNotifications: Channel ${channelName} subscription initiated.`);

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