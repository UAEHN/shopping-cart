import { useState, useEffect } from 'react';
import { supabase } from '@/services/supabase';
import { ListItem } from '@/types/list';
import { ListMessage } from '@/types/message';

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
      setNotifications([]);
      setUnreadCount(0);
      setIsLoading(false);
      return;
    }

    console.log(`بدء تحميل الإشعارات للمستخدم: ${userId}`);

    // جلب الإشعارات الأولية
    const fetchNotifications = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (error) {
          console.error('خطأ في جلب الإشعارات:', error);
          throw error;
        }

        console.log(`تم جلب ${data?.length || 0} إشعار للمستخدم ${userId}:`, data);
        setNotifications(data as Notification[]);
        
        // حساب عدد الإشعارات غير المقروءة
        const unreadNotifications = data.filter(notification => !notification.is_read);
        setUnreadCount(unreadNotifications.length);
        console.log(`عدد الإشعارات غير المقروءة: ${unreadNotifications.length}`);
      } catch (err: any) {
        console.error('Error fetching notifications:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotifications();

    // استخدام اسم قناة ثابت بدلاً من اسم فريد لتجنب تعدد الاشتراكات
    const channelName = `notifications-list-${userId}`;
    console.log(`إنشاء قناة للإشعارات: ${channelName}`);

    // الاشتراك في التغييرات الجديدة في الإشعارات
    const notificationsSubscription = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          console.log('تم استلام إشعار جديد في useNotifications:', newNotification);
          
          // إضافة الإشعار الجديد في بداية القائمة مع المحافظة على الحد الأقصى
          setNotifications(prevNotifications => {
            const updatedNotifications = [newNotification, ...prevNotifications];
            // التأكد من أن عدد الإشعارات لا يتجاوز الحد المطلوب
            return updatedNotifications.slice(0, limit);
          });
          
          // تحديث عدد الإشعارات غير المقروءة
          setUnreadCount(prevCount => prevCount + 1);
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
          const updatedNotification = payload.new as Notification;
          console.log('تم تحديث حالة الإشعار:', updatedNotification);
          
          setNotifications(prevNotifications =>
            prevNotifications.map(notification =>
              notification.id === updatedNotification.id 
                ? updatedNotification 
                : notification
            )
          );
          
          // إعادة حساب عدد الإشعارات غير المقروءة
          setNotifications(currentNotifications => {
            const unreadCount = currentNotifications.filter(n => !n.is_read).length;
            setUnreadCount(unreadCount);
            return currentNotifications;
          });
        }
      )
      .subscribe((status) => {
        console.log(`حالة اشتراك قائمة الإشعارات (useNotifications): ${status}`);
        
        if (status === 'SUBSCRIBED') {
          console.log(`تم الاشتراك بنجاح في قناة الإشعارات للمستخدم: ${userId}`);
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          console.error(`فشل الاشتراك في قناة الإشعارات (useNotifications). الحالة: ${status}`);
          
          // محاولة إعادة الاتصال بعد فترة قصيرة
          setTimeout(() => {
            console.log('محاولة إعادة الاتصال بقناة الإشعارات...');
            notificationsSubscription.subscribe();
          }, 2000);
        }
      });

    // تنظيف الاشتراكات
    return () => {
      console.log(`إلغاء الاشتراك في قناة الإشعارات: ${channelName}`);
      supabase.removeChannel(notificationsSubscription);
    };
  }, [userId, limit]);

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