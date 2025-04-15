'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ShoppingCart, Bell, Users } from 'lucide-react';
import { supabase } from '@/services/supabase';
import { toast } from '@/components/ui/toast';
import { useNotifications, Notification, NotificationType } from '@/hooks/useRealtime';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { ClipboardCheck, Check, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

export default function HomePage() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const [userName, setUserName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  
  const dateLocale = i18n.language.startsWith('ar') ? ar : enUS;

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast.info(t('auth.loginRequired')); 
          router.push('/login');
          return;
        }
        const welcomeShown = sessionStorage.getItem(`welcome_shown_${user.id}`);
        const { data: profile } = await supabase
          .from('users')
          .select('name')
          .eq('id', user.id)
          .single();
        if (profile && profile.name) {
          setUserName(profile.name);
          if (!welcomeShown) {
            toast.success(t('home.welcomeMessage', { name: profile.name })); 
            sessionStorage.setItem(`welcome_shown_${user.id}`, 'true');
          }
        } else {
          const { data: metadata } = await supabase.auth.getUser();
          const userMetadata = metadata.user?.user_metadata;
          let displayName = '';
          if (userMetadata && userMetadata.name) {
            displayName = userMetadata.name;
          } else if (userMetadata && userMetadata.username) {
            displayName = userMetadata.username;
          }
          setUserName(displayName);
          if (!welcomeShown && displayName) {
            toast.success(t('home.welcomeMessage', { name: displayName })); 
            sessionStorage.setItem(`welcome_shown_${user.id}`, 'true');
          }
        }
      } catch (error) {
        console.error('Error checking auth:', error);
        toast.error(t('auth.authCheckError')); 
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, [router, t]);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setIsLoadingUser(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();
        if (userError) throw userError;
        if (userData) {
          setUserData(userData);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        toast.error(t('home.dataLoadError')); 
      } finally {
        setIsLoadingUser(false);
      }
    };
    fetchUserData();
  }, [router, t]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-xl flex flex-col items-center gap-4">
          <div className="animate__pulse h-16 w-16 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
            <ShoppingCart className="h-8 w-8 text-blue-500 dark:text-blue-300" />
          </div>
          <span>{t('common.loading')}</span>
        </div>
      </div>
    );
  }

  const handleCreateNewList = () => {
    router.push('/create-list');
    toast.info(t('home.creatingNewList'));
  };

  return (
    <div className="p-4 pt-0 pb-20">
      <Header />
      
      <div className="space-y-6 mt-4">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-2xl font-bold bg-gradient-to-l from-blue-600 to-blue-800 dark:from-blue-500 dark:to-blue-300 bg-clip-text text-transparent py-2"
        >
          {userName ? t('home.welcome', { name: userName }) : t('home.welcomeFallback')}
        </motion.h1>
        
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950 dark:to-gray-900 dark:border-blue-800 transition-all duration-300 hover:shadow-lg rounded-2xl overflow-hidden">
          <CardContent className="p-0">
            <div className="p-6 flex flex-col items-center text-center space-y-4">
              <div className="bg-blue-100 dark:bg-blue-900 p-5 rounded-full mt-4 shadow-inner">
                <ShoppingCart className="h-12 w-12 text-blue-600 dark:text-blue-300" />
              </div>
              <div>
                <h2 className="font-bold text-xl text-blue-800 dark:text-blue-300">{t('home.createNewListTitle')}</h2>
                <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm">
                  {t('home.createNewListDescription')}
                </p>
              </div>
              <motion.div
                className="w-full"
                whileHover={{ scale: 1.03, y: -3, transition: { duration: 0.2 } }}
                whileTap={{ scale: 0.97 }}
              >
                <Button
                  className="w-full rounded-xl py-3 text-lg font-medium bg-blue-600 hover:bg-blue-700 dark:bg-blue-800 dark:hover:bg-blue-700 text-white shadow-md"
                  onClick={handleCreateNewList}
                >
                  {t('home.newListButton')}
                </Button>
              </motion.div>
            </div>
          </CardContent>
        </Card>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
          <Link href="/lists" className="block">
            <Card variant="lifted" className="h-full cursor-pointer">
              <CardContent cardVariant="lifted" className="p-4 flex flex-col items-center text-center h-full">
                <div className="bg-gray-100 dark:bg-zinc-800 p-3 rounded-full mt-2 mb-3">
                  <ShoppingCart className="h-6 w-6 text-gray-600 dark:text-gray-300" />
                </div>
                <h3 className="font-medium text-sm text-gray-900 dark:text-gray-100">{t('home.shoppingListsCardTitle')}</h3>
                <span className="mt-2 text-blue-600 dark:text-blue-400 text-xs">
                  {t('home.viewAllLink')}
                </span>
              </CardContent>
            </Card>
          </Link>

          <Link href="/contacts" className="block">
            <Card variant="lifted" className="h-full cursor-pointer">
              <CardContent cardVariant="lifted" className="p-4 flex flex-col items-center text-center h-full">
                <div className="bg-gray-100 dark:bg-zinc-800 p-3 rounded-full mt-2 mb-3">
                  <Users className="h-6 w-6 text-gray-600 dark:text-gray-300" />
                </div>
                <h3 className="font-medium text-sm text-gray-900 dark:text-gray-100">{t('home.contactsCardTitle')}</h3>
                <span className="mt-2 text-blue-600 dark:text-blue-400 text-xs">
                  {t('home.viewAllLink')}
                </span>
              </CardContent>
            </Card>
          </Link>
        </div>
        
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">{t('home.latestNotificationsTitle')}</h2>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs p-1 h-auto flex items-center gap-1"
              onClick={() => router.push('/notifications')}
            >
              <Bell className="h-4 w-4" />
              <span>{t('home.viewAllLink')}</span>
            </Button>
          </div>
          
          {isLoadingUser ? (
            <Card className="rounded-xl overflow-hidden border-gray-200 dark:border-gray-700 transition-all duration-300">
              <CardContent className="p-6 text-center text-gray-500 dark:text-gray-400">
                {t('notifications.loading')}
              </CardContent>
            </Card>
          ) : (
            <NotificationsList userId={userData?.id} limit={3} showEmpty={true} />
          )}
        </div>
      </div>
    </div>
  );
}

function NotificationsList({ userId, limit = 3, showEmpty = true }: { userId?: string, limit?: number, showEmpty?: boolean }) {
  const { notifications, isLoading, markAsRead } = useNotifications(userId || null, limit);
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const dateLocale = i18n.language.startsWith('ar') ? ar : enUS;

  const formatDate = (dateString: string) => {
    if (!isMounted) {
      return <span className="inline-block h-3 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></span>;
    }
    try {
      return formatDistanceToNow(new Date(dateString), { 
        addSuffix: true,
        locale: dateLocale 
      });
    } catch (error) {
      return t('common.unknownTime'); 
    }
  };

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
    markAsRead(notification.id);
    
    if (notification.related_list_id) {
      router.push(`/lists/${notification.related_list_id}`);
    }
  };

  if (isLoading) {
    return (
      <Card className="rounded-xl">
        <CardContent className="p-4 text-center text-gray-500">
          {t('notifications.loading')}
        </CardContent>
      </Card>
    );
  }

  if (!notifications.length && showEmpty) {
    return (
      <Card className="bg-gradient-to-r from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 rounded-xl overflow-hidden border-gray-200 dark:border-gray-700 transition-all duration-300 border-dashed border-2">
        <CardContent className="p-10 text-center">
          <div className="flex justify-center items-center mb-5 relative h-12">
            <div className="bg-gray-100 dark:bg-gray-800 size-12 grid place-items-center rounded-xl relative z-10 shadow-md ring-1 ring-border">
              <Bell className="w-6 h-6 text-muted-foreground" />
            </div>
            <div className="bg-gray-100 dark:bg-gray-800 size-10 grid place-items-center rounded-xl absolute left-1/2 -translate-x-[80%] top-1.5 rotate-[-15deg] shadow-md ring-1 ring-border opacity-70">
              <ShoppingCart className="w-5 h-5 text-muted-foreground" />
            </div>
          </div>
          <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mt-4">{t('notifications.noNotificationsTitle')}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            {t('notifications.noNotificationsDescription')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
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
  );
} 