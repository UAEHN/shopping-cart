'use client';

import { useState, useRef, useEffect } from 'react';
import { Bell, MailCheck, ShoppingCart, ClipboardCheck, AlertCircle, Check, X, Trash2 } from 'lucide-react';
import { useNotifications, Notification, NotificationType } from '@/hooks/useRealtime';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { hideNotification as hideNotificationService, hideAllNotifications } from '@/services/supabase';

export function NotificationsDropdown() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  
  const [displayedNotifications, setDisplayedNotifications] = useState<Notification[]>([]);

  // سجل عند تحميل المكون
  useEffect(() => {
    if (user) {
      console.log(`تحميل مكون NotificationsDropdown للمستخدم: ${user.id}`);
    }
  }, [user]);
  
  const { 
    notifications: fetchedNotifications,
    unreadCount, 
    isLoading, 
    markAsRead, 
    markAllAsRead,
  } = useNotifications(user?.id || null, 10);

  useEffect(() => {
    setDisplayedNotifications(fetchedNotifications);
  }, [fetchedNotifications]);

  useEffect(() => {
    if (user) {
      console.log(`NotificationsDropdown: عدد الإشعارات (المعروضة): ${displayedNotifications.length}, غير مقروءة: ${unreadCount}`);
    }
  }, [displayedNotifications, unreadCount, user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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

  const handleNotificationClick = (notification: Notification) => {
    console.log(`النقر على الإشعار: ${notification.id}`);
    
    markAsRead(notification.id);
    
    if (notification.related_list_id) {
      router.push(`/lists/${notification.related_list_id}`);
    } else {
      router.push('/home');
    }
    
    setIsOpen(false);
  };

  const formatDate = (dateString: string) => {
    try {
      const locale = i18n.language === 'ar' ? ar : enUS;
      return formatDistanceToNow(new Date(dateString), { 
        addSuffix: true,
        locale: locale
      });
    } catch (error) {
      return t('common.unknownTime');
    }
  };

  const handleToggleDropdown = () => {
    setIsOpen(!isOpen);
    console.log(`تبديل حالة القائمة: ${!isOpen}`);
    
    if (!isOpen) {
      console.log('معلومات الإشعارات الحالية (المعروضة):', displayedNotifications);
    }
  };

  const handleMarkAllAsRead = () => {
    console.log('تعيين جميع الإشعارات كمقروءة');
    markAllAsRead();
  };

  const handleHideNotification = async (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    console.log(`إخفاء الإشعار: ${notificationId}`);
    setDisplayedNotifications(prev => prev.filter(n => n.id !== notificationId));
    const { error } = await hideNotificationService(notificationId);
    if (error) {
      console.error("Error hiding notification:", error);
      setDisplayedNotifications(fetchedNotifications);
    } else {
        console.log(`تم إخفاء الإشعار بنجاح: ${notificationId}`);
    }
  };

  const handleHideAllNotificationsDropdown = async () => {
    console.log('إخفاء جميع الإشعارات (قائمة منسدلة)');
    const currentlyDisplayed = [...displayedNotifications];
    setDisplayedNotifications([]);
    const { error } = await hideAllNotifications();
    if (error) {
      console.error("Error hiding all notifications (dropdown):", error);
      setDisplayedNotifications(currentlyDisplayed);
    } else {
      console.log('تم إخفاء جميع الإشعارات بنجاح (قائمة منسدلة)');
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className="relative p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
        onClick={handleToggleDropdown}
        aria-label={t('notifications.ariaLabel')}
      >
        <Bell className="h-6 w-6" />
        
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div 
           className="
             absolute mt-2 z-50 
             w-[calc(100vw-2rem)] sm:w-96
             max-w-[calc(100vw-1rem)]
             bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden 
             border border-gray-200 dark:border-gray-700
             ltr:right-0 rtl:left-0
           "
         >
          <div className="p-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-base">{t('notifications.dropdownTitle')}</h3>
            
            {displayedNotifications.length > 0 && (
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button 
                    className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30"
                    onClick={handleMarkAllAsRead}
                    title={t('notifications.markAllAsRead')}
                    disabled={isLoading}
                  >
                    <MailCheck className="h-4 w-4" />
                  </button>
                )}
                <button 
                  className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30"
                  onClick={handleHideAllNotificationsDropdown}
                  title={t('notifications.hideAll')}
                  disabled={isLoading}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
          
          <div className="max-h-[65vh] overflow-y-auto">
            {isLoading ? (
              <div className="flex justify-center items-center p-5">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              </div>
            ) : displayedNotifications.length > 0 ? (
              <ul>
                {displayedNotifications.map((notification) => (
                  <li 
                    key={notification.id}
                    className={`
                      relative group border-b border-gray-100 dark:border-gray-700 last:border-0
                      ${!notification.is_read ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                    `}
                  >
                    <button
                      className="w-full p-3 flex items-start gap-3 text-left hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex-shrink-0 mt-1">
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
                        <span className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500 self-center"></span>
                      )}
                    </button>
                    <button
                        onClick={(e) => handleHideNotification(notification.id, e)}
                        className={`
                          absolute top-1/2 -translate-y-1/2 
                          ltr:right-2 rtl:left-2 
                          p-1 rounded-full 
                          text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300
                          bg-gray-100 dark:bg-gray-700 
                          opacity-0 group-hover:opacity-100 focus:opacity-100 
                          transition-opacity
                        `}
                        aria-label={t('common.delete')}
                      >
                        <X className="h-4 w-4" />
                      </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="py-6 px-4 text-center">
                <div className="flex justify-center mb-2">
                  <Bell className="h-12 w-12 text-gray-300 dark:text-gray-500" />
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  {t('notifications.noNewNotifications')}
                </p>
              </div>
            )}
          </div>
          
          <div className="p-2 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
            <button 
              className="w-full p-2 text-sm text-center text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              onClick={() => {
                router.push('/notifications');
                setIsOpen(false);
              }}
            >
              {t('notifications.viewAll')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 