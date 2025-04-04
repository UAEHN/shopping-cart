import { useEffect } from 'react';
import { supabase } from '@/services/supabase';
import { toast } from '@/components/ui/toast';
import { useAuth } from '@/hooks/useAuth';
import { NotificationType } from './useRealtime';

// مراقبة الإشعارات على مستوى التطبيق
export const useGlobalRealtime = () => {
  const { user } = useAuth();
  
  useEffect(() => {
    if (!user) return;
    
    console.log(`إعداد اشتراك عالمي للإشعارات للمستخدم: ${user.id}`);
    
    // الاشتراك في التغييرات على جدول الإشعارات
    const channel = supabase
      .channel(`global-notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          // إظهار الإشعار الجديد كـ toast notification
          const notification = payload.new as {
            message: string;
            type: NotificationType;
          };
          
          console.log('تم استلام إشعار جديد:', notification);
          
          // تخصيص مدة ولون الإشعار بناءً على نوعه
          let duration = 3000;
          
          switch (notification.type) {
            case 'NEW_LIST':
              toast.info(notification.message, duration);
              break;
            case 'LIST_STATUS':
              toast.success(notification.message, duration);
              break;
            case 'NEW_ITEM':
              toast.info(notification.message, duration);
              break;
            case 'ITEM_STATUS':
              toast.success(notification.message, duration);
              break;
            default:
              toast.info(notification.message, duration);
          }
        }
      )
      .subscribe((status) => {
        console.log(`حالة اشتراك الإشعارات العالمية: ${status}`);
      });
    
    // تنظيف الاشتراك عند تفكيك المكوّن
    return () => {
      console.log(`إلغاء اشتراك الإشعارات العالمية للمستخدم: ${user.id}`);
      supabase.removeChannel(channel);
    };
  }, [user]);
  
  return null;
}; 