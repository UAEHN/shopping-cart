import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/services/supabase';
import { toast } from '@/components/ui/toast';
import { useAuth } from '@/hooks/useAuth';
import { NotificationType, Notification } from './useRealtime';

// مراقبة الإشعارات على مستوى التطبيق
export const useGlobalRealtime = (userId: string | null) => {
  const [isConnected, setIsConnected] = useState(false);
  const notificationDisplay = useRef<{[key: string]: boolean}>({});

  useEffect(() => {
    if (!userId) {
      console.log('لا يوجد مستخدم مسجل الدخول. لن يتم الاشتراك في الإشعارات العالمية.');
      return;
    }

    console.log(`بدء الاشتراك في الإشعارات العالمية للمستخدم: ${userId}`);

    // استخدام اسم قناة ثابت لتجنب تعدد الاشتراكات
    const channelName = `global-notifications-${userId}`;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    
    // اختبار الاتصال بقاعدة البيانات قبل الاشتراك في القناة
    const testConnection = async () => {
      try {
        // اختبار الاتصال بجدول الإشعارات
        const { error } = await supabase
          .from('notifications')
          .select('id')
          .limit(1);
        
        if (error) {
          console.error('فشل اختبار الاتصال بالخادم:', error);
          return false;
        }
        
        console.log('تم التحقق من الاتصال بالخادم بنجاح');
        return true;
      } catch (err) {
        console.error('خطأ أثناء اختبار الاتصال:', err);
        return false;
      }
    };
    
    // وظيفة إنشاء القناة والاشتراك
    const subscribeToChannel = async () => {
      // التحقق من الاتصال أولاً
      const isServerConnected = await testConnection();
      if (!isServerConnected) {
        console.error('لا يمكن الاتصال بالخادم. لن يتم الاشتراك في الإشعارات العالمية.');
        
        // محاولة إعادة الاتصال بعد فترة
        if (reconnectAttempts < maxReconnectAttempts) {
          reconnectAttempts++;
          console.log(`محاولة إعادة الاتصال (${reconnectAttempts}/${maxReconnectAttempts}) بعد 5 ثوانٍ...`);
          setTimeout(subscribeToChannel, 5000);
        }
        return;
      }
      
      console.log(`إنشاء قناة الإشعارات العالمية: ${channelName}`);
      const channel = supabase.channel(channelName);
      
      channel
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`
          },
          (payload) => {
            // التأكد من عدم إظهار الإشعار مرتين
            const notification = payload.new as Notification;
            const notificationId = notification.id;
            
            if (notificationDisplay.current[notificationId]) {
              console.log(`تم استلام إشعار مكرر (${notificationId})، يتم تجاهله`);
              return;
            }
            
            console.log('تم استلام إشعار جديد في useGlobalRealtime:', notification);
            notificationDisplay.current[notificationId] = true;
            
            // إظهار الإشعار مع وقت عرض أطول (5 ثوانٍ)
            switch (notification.type) {
              case 'NEW_LIST':
                toast.info(notification.message, 5000);
                break;
              case 'LIST_STATUS':
                toast.success(notification.message, 5000);
                break;
              case 'NEW_ITEM':
                toast.info(notification.message, 5000);
                break;
              case 'ITEM_STATUS':
                toast.success(notification.message, 5000);
                break;
              default:
                toast.info(notification.message, 5000);
            }
          }
        )
        .subscribe((status) => {
          console.log(`حالة اشتراك قناة الإشعارات العالمية: ${status}`);
          
          if (status === 'SUBSCRIBED') {
            console.log('تم الاشتراك بنجاح في قناة الإشعارات العالمية.');
            setIsConnected(true);
            reconnectAttempts = 0; // إعادة ضبط عدد محاولات إعادة الاتصال
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            console.error(`فشل الاشتراك في قناة الإشعارات العالمية. الحالة: ${status}`);
            setIsConnected(false);
            
            // محاولة إعادة الاتصال إذا كان عدد المحاولات أقل من الحد الأقصى
            if (reconnectAttempts < maxReconnectAttempts) {
              reconnectAttempts++;
              console.log(`محاولة إعادة الاتصال (${reconnectAttempts}/${maxReconnectAttempts}) بعد 3 ثوانٍ...`);
              
              // إنشاء قناة جديدة بعد فترة قصيرة
              setTimeout(() => {
                console.log('محاولة إعادة الاشتراك في قناة الإشعارات العالمية...');
                channel.subscribe();
              }, 3000);
            } else {
              console.error(`تم الوصول للحد الأقصى من محاولات الاتصال (${maxReconnectAttempts}). توقف عن المحاولة.`);
            }
          }
        });
      
      // تنظيف الاشتراك
      return () => {
        console.log(`إلغاء الاشتراك في قناة الإشعارات العالمية: ${channelName}`);
        supabase.removeChannel(channel);
      };
    };
    
    // بدء الاشتراك
    const cleanup = subscribeToChannel();
    
    // تنظيف الاشتراكات عند إزالة المكون
    return () => {
      if (cleanup && typeof cleanup === 'function') {
        cleanup();
      }
    };
  }, [userId]);

  return isConnected;
}; 