'use client';

import { useState, useRef, useEffect } from 'react';
import { Bell, MailCheck, ShoppingCart, ClipboardCheck, AlertCircle, Check } from 'lucide-react';
import { useNotifications, Notification, NotificationType } from '@/hooks/useRealtime';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useRouter } from 'next/navigation';

export function NotificationsDropdown() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  
  const { 
    notifications, 
    unreadCount, 
    isLoading, 
    markAsRead, 
    markAllAsRead 
  } = useNotifications(user?.id || null, 10);

  // إغلاق القائمة عند النقر خارجها
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

  // الحصول على الأيقونة المناسبة لنوع الإشعار
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

  // معالجة النقر على الإشعار
  const handleNotificationClick = (notification: Notification) => {
    // تحديث الإشعار كمقروء
    markAsRead(notification.id);
    
    // توجيه المستخدم حسب نوع الإشعار
    if (notification.related_list_id) {
      router.push(`/lists/${notification.related_list_id}`);
    } else {
      router.push('/home');
    }
    
    // إغلاق القائمة
    setIsOpen(false);
  };

  // تنسيق التاريخ بشكل نسبي
  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { 
        addSuffix: true,
        locale: ar
      });
    } catch (error) {
      return 'وقت غير معروف';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className="relative p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="إشعارات"
      >
        <Bell className="h-6 w-6" />
        
        {/* عدد الإشعارات غير المقروءة */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* قائمة الإشعارات */}
      {isOpen && (
        <div className="absolute left-0 mt-2 w-80 sm:w-96 bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 z-50">
          <div className="p-3 bg-gray-50 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h3 className="font-semibold text-gray-800 dark:text-gray-200">الإشعارات</h3>
            
            {unreadCount > 0 && (
              <button 
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                onClick={() => {
                  markAllAsRead();
                }}
              >
                <div className="flex items-center gap-1">
                  <MailCheck className="h-4 w-4" />
                  <span>تعيين الكل كمقروء</span>
                </div>
              </button>
            )}
          </div>
          
          <div className="max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="flex justify-center items-center p-5">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              </div>
            ) : notifications.length > 0 ? (
              <ul>
                {notifications.map((notification) => (
                  <li 
                    key={notification.id}
                    className={`
                      border-b border-gray-100 dark:border-gray-700 last:border-0
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
                        <span className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500"></span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="py-6 px-4 text-center">
                <div className="flex justify-center mb-2">
                  <Bell className="h-12 w-12 text-gray-300 dark:text-gray-600" />
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  لا توجد إشعارات جديدة
                </p>
              </div>
            )}
          </div>
          
          <div className="p-2 bg-gray-50 dark:bg-gray-750 border-t border-gray-200 dark:border-gray-700">
            <button 
              className="w-full p-2 text-sm text-center text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              onClick={() => {
                router.push('/notifications');
                setIsOpen(false);
              }}
            >
              عرض كل الإشعارات
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 