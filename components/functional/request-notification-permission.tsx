'use client';

import { useEffect, useState } from 'react';
import { fetchToken } from '@/lib/firebase'; // استيراد دالة جلب الرمز
import { updateUserPushToken } from '@/lib/supabase/users'; // استيراد دالة تحديث الرمز
import { supabase } from '@/services/supabase';

function RequestNotificationPermission() {
  const [permissionRequested, setPermissionRequested] = useState(false);

  useEffect(() => {
    // التأكد من أن هذا الكود يعمل فقط في المتصفح
    if (typeof window === 'undefined' || permissionRequested) {
      return;
    }

    const setupNotifications = async () => {
      setPermissionRequested(true); // لمنع إعادة التشغيل

      const { data: { user } } = await supabase.auth.getUser();

      // فقط للمستخدمين المسجلين دخولهم
      if (user) {
        console.log('[Permission] User is logged in, checking notification permission...');
        // التحقق من دعم المتصفح للإشعارات
        if ('Notification' in window) {
          console.log('[Permission] Checking notification permission. Current state:', Notification.permission);
          if (Notification.permission === 'granted') {
            console.log('[Permission] Notification permission already granted.');
            console.log('[Permission] Attempting to fetch token after permission check...');
            const token = await fetchToken();
            if (token) {
              console.log('[Permission] Attempting to update token in Supabase:', token);
              const { error: updateError } = await updateUserPushToken(user.id, token);
              if (updateError) {
                  console.error('[Permission] Failed to update token in Supabase.', updateError);
              }
            }
          } else if (Notification.permission === 'default') {
            // طلب الإذن فقط إذا لم يتم رفضه صراحةً
            console.log('[Permission] Requesting notification permission popup...');
            try {
              const permission = await Notification.requestPermission();
              if (permission === 'granted') {
                console.log('[Permission] Permission granted by user.');
                console.log('[Permission] Attempting to fetch token after permission check...');
                const token = await fetchToken();
                if (token) {
                  console.log('[Permission] Attempting to update token in Supabase:', token);
                  const { error: updateError } = await updateUserPushToken(user.id, token);
                  if (updateError) {
                      console.error('[Permission] Failed to update token in Supabase.', updateError);
                  }
                }
              } else {
                console.log('[Permission] Permission denied by user.');
              }
            } catch (error) {
                console.error('[Permission] Error requesting notification permission:', error);
            }
          } else {
            console.log('Notification permission denied by user.');
          }
        } else {
            console.warn('Notifications not supported by this browser.');
        }
      } else {
        console.log('User not logged in, skipping notification setup.');
      }
    };

    // تأخير بسيط للسماح بتهيئة Supabase Auth و Firebase Messaging
    const timer = setTimeout(setupNotifications, 2000);

    return () => clearTimeout(timer); // تنظيف المؤقت عند إلغاء تحميل المكون

  }, [permissionRequested]); // إزالة supabase من الاعتماديات لأنه الآن مستورد من الخارج

  // هذا المكون لا يعرض شيئًا في الواجهة
  return null;
}

export default RequestNotificationPermission; 