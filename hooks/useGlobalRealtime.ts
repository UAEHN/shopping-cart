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
    
    // اختبار الاتصال بالخادم
    const testConnection = async () => {
      try {
        const { count, error } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);
        
        if (error) {
          console.error('خطأ في اختبار الاتصال بجدول الإشعارات:', error);
        } else {
          console.log(`تم العثور على ${count} إشعار للمستخدم ${user.id}`);
        }
      } catch (err) {
        console.error('خطأ غير متوقع في اختبار الاتصال:', err);
      }
    };
    
    testConnection();
    
    // الاشتراك في التغييرات على جدول الإشعارات 
    // تم تغيير اسم القناة لتجنب أي تعارض مع اشتراكات موجودة
    const channel = supabase
      .channel(`global-realtime-${user.id}-${Date.now()}`)
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
            id: string;
          };
          
          console.log('تم استلام إشعار جديد في useGlobalRealtime:', notification);
          
          // تخصيص مدة ولون الإشعار بناءً على نوعه
          let duration = 5000; // زيادة المدة للتأكد من رؤية الإشعار
          
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
        console.log(`حالة اشتراك الإشعارات العالمية (useGlobalRealtime): ${status}`);
        
        // إذا كان الحالة هي SUBSCRIBED، نقوم بإجراء اختبار للاشتراك
        if (status === 'SUBSCRIBED') {
          console.log(`تم الاشتراك بنجاح في قناة الإشعارات العالمية للمستخدم: ${user.id}`);
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          console.error(`فشل الاشتراك في قناة الإشعارات العالمية. الحالة: ${status}`);
        }
      });
    
    // تنظيف الاشتراك عند تفكيك المكوّن
    return () => {
      console.log(`إلغاء اشتراك الإشعارات العالمية للمستخدم: ${user.id}`);
      supabase.removeChannel(channel);
    };
  }, [user]);
  
  return null;
}; 