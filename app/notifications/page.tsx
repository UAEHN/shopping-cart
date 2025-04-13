'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Bell, 
  ShoppingCart, 
  ClipboardCheck, 
  Check, 
  AlertCircle, 
  CheckCircle 
} from 'lucide-react';
import { supabase } from '@/services/supabase';
import { toast } from '@/components/ui/toast';
import { useNotifications, Notification, NotificationType } from '@/hooks/useRealtime';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

export default function NotificationsPage() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setIsLoadingUser(true);
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          toast.error(t('auth.loginRequired'));
          router.push('/login');
          return;
        }
        
        setUserId(user.id);
      } catch (error) {
        console.error('Error checking auth:', error);
        toast.error(t('auth.authCheckError'));
      } finally {
        setIsLoadingUser(false);
      }
    };
    
    checkAuth();
  }, [router, t]);
  
  const { 
    notifications, 
    unreadCount, 
    isLoading: isLoadingNotifications, 
    markAsRead,
    markAllAsRead
  } = useNotifications(userId, 50);
  
  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'NEW_LIST':
        return <ShoppingCart className="h-5 w-5 text-blue-500 dark:text-blue-400" />;
      case 'LIST_STATUS':
        return <ClipboardCheck className="h-5 w-5 text-green-500 dark:text-green-400" />;
      case 'NEW_ITEM':
        return <ShoppingCart className="h-5 w-5 text-purple-500 dark:text-purple-400" />;
      case 'ITEM_STATUS':
        return <Check className="h-5 w-5 text-green-500 dark:text-green-400" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500 dark:text-gray-400" />;
    }
  };
  
  const formatDate = (dateString: string) => {
    try {
      const locale = i18n.language.startsWith('ar') ? ar : enUS;
      return formatDistanceToNow(new Date(dateString), { 
        addSuffix: true,
        locale: locale
      });
    } catch (error) {
      return t('common.unknownTime');
    }
  };
  
  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    
    if (notification.related_list_id) {
      router.push(`/lists/${notification.related_list_id}`);
    }
  };
  
  const isLoading = isLoadingUser || isLoadingNotifications;
  
  return (
    <div className="p-4 pt-0 pb-20">
      <Header title={t('notifications.pageTitle')} showBackButton />
      
      <div className="mt-6 space-y-4">
        {unreadCount > 0 && (
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('notifications.unreadCountMessage', { count: unreadCount })}
            </p>
            <Button 
              variant="outline" 
              size="sm"
              className="text-xs flex items-center gap-1"
              onClick={() => markAllAsRead()}
            >
              <CheckCircle className="h-3 w-3" />
              <span>{t('notifications.markAllAsRead')}</span>
            </Button>
          </div>
        )}
        
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="rounded-xl overflow-hidden border-gray-200 dark:border-gray-700">
                <CardContent className="p-4">
                  <div className="animate-pulse flex items-start gap-3">
                    <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full flex-shrink-0"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : notifications.length > 0 ? (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <Card 
                key={notification.id}
                className={`rounded-xl overflow-hidden border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-300 cursor-pointer
                  ${!notification.is_read ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800/30' : ''}`}
                onClick={() => handleNotificationClick(notification)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 flex-shrink-0">
                      {getNotificationIcon(notification.type as NotificationType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!notification.is_read ? 'font-semibold text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300'}`}>
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {formatDate(notification.created_at)}
                      </p>
                    </div>
                    {!notification.is_read && (
                      <span className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500"></span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="bg-gradient-to-r from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 rounded-xl overflow-hidden border-gray-200 dark:border-gray-700 transition-all duration-300">
            <CardContent className="p-10 text-center">
              <p className="text-gray-500 dark:text-gray-400 flex flex-col items-center gap-3">
                <Bell className="h-16 w-16 text-gray-400 dark:text-gray-500 opacity-50" />
                <span className="text-lg">{t('notifications.noNotificationsTitle')}</span>
                <span className="text-sm">{t('notifications.noNotificationsDescription')}</span>
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 