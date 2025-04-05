import { useEffect } from 'react';
import { supabase } from '@/services/supabase';
import { toast } from '@/components/ui/toast';
import { useAuth } from '@/hooks/useAuth';
import { NotificationType } from './useRealtime';
import { RealtimeChannel } from '@supabase/supabase-js';

// مراقبة الإشعارات على مستوى التطبيق
export const useGlobalRealtime = () => {
  const { user } = useAuth();
  
  useEffect(() => {
    if (!user) return;
    
    console.log(`useGlobalRealtime: Setting up global subscription for user: ${user.id}`);
    let isMounted = true;
    let channel: RealtimeChannel | null = null;
    
    const channelName = `global-notifications-${user.id}`;
    console.log(`useGlobalRealtime: Channel name: ${channelName}`);
    
    // Remove existing channel first (safer approach)
    channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: true }, // Example config
      },
    });
    
    channel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (!isMounted) return;
          // إظهار الإشعار الجديد كـ toast notification
          const notification = payload.new as {
            message: string;
            type: NotificationType;
            // Add other fields if needed for toast customization
          };
          
          console.log('useGlobalRealtime: Received new notification payload:', payload);
          
          // تخصيص مدة ولون الإشعار بناءً على نوعه
          let duration = 3000;
          let toastFunction = toast.info; // Default toast function
          
          switch (notification.type) {
            case 'NEW_LIST':
              // toast.info(notification.message, duration);
              toastFunction = toast.info;
              break;
            case 'LIST_STATUS':
              // toast.success(notification.message, duration);
              toastFunction = toast.success;
              break;
            case 'NEW_ITEM': // Assuming you might have this type
              // toast.info(notification.message, duration);
              toastFunction = toast.info;
              break;
            case 'ITEM_STATUS': // Assuming you might have this type
              // toast.success(notification.message, duration);
              toastFunction = toast.success;
              break;
            default:
              // toast.info(notification.message, duration);
              toastFunction = toast.info;
          }
          
          // Call the selected toast function
          if (notification.message) {
              toastFunction(notification.message, duration);
          } else {
              console.warn('useGlobalRealtime: Received notification with no message:', notification);
          }
        }
      )
      .subscribe((status, err) => {
         console.log(`useGlobalRealtime: Channel ${channelName} subscription status: ${status}`);
        if (!isMounted) return;

        if (status === 'SUBSCRIBED') {
          console.log(`useGlobalRealtime: Successfully subscribed to channel: ${channelName}`);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error(`useGlobalRealtime: Channel subscription error/timeout. Status: ${status}`, err);
          // Optionally notify user or retry with backoff
        } else if (status === 'CLOSED') {
           console.warn(`useGlobalRealtime: Channel ${channelName} was closed.`);
        }
      });
    
    // Cleanup function
    return () => {
      console.log(`useGlobalRealtime: Cleaning up global subscription for user: ${user.id}, removing channel: ${channelName}`);
      isMounted = false;
      if (channel) {
         supabase.removeChannel(channel)
           .then((status) => console.log(`useGlobalRealtime: Channel ${channelName} removal status: ${status}`))
           .catch((error) => console.error(`useGlobalRealtime: Error removing channel ${channelName}:`, error));
         channel = null;
      } else {
         // Attempt removal by name if channel reference is lost
         supabase.removeChannel(supabase.channel(channelName))
           .then((status) => console.log(`useGlobalRealtime: Channel ${channelName} (removed by name) status: ${status}`))
           .catch((error) => console.error(`useGlobalRealtime: Error removing channel ${channelName} by name:`, error));
      }
    };
  }, [user]); // Re-run effect if user changes
}; 