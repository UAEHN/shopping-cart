'use client';

import { usePathname } from 'next/navigation';
import { ArrowRight, Plus, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ThemeSwitcher } from '@/components/ui/theme-switcher';
import { AppLogo } from '@/components/ui/app-logo';
import { NotificationsDropdown } from '@/components/notifications/notifications-dropdown';
import { toast } from '@/components/ui/toast';
import { useTranslation } from 'react-i18next';

interface HeaderProps {
  showBackButton?: boolean;
  title?: string;
  extras?: React.ReactNode;
  shareCode?: string | null;
}

export default function Header({
  showBackButton = false,
  title,
  extras,
  shareCode
}: HeaderProps) {
  const pathname = usePathname();
  const { t } = useTranslation();
  
  // تحديد العنوان الافتراضي بناءً على المسار
  const getDefaultTitle = () => {
    if (pathname === '/home') return ''; // سنعرض الشعار بدلاً من النص
    if (pathname === '/contacts') return t('header.contacts');
    if (pathname === '/lists') return t('header.lists');
    if (pathname === '/profile') return t('header.profile');
    if (pathname === '/create-list') return t('header.createList');
    if (pathname.includes('/lists/')) return t('header.listDetails');
    if (pathname === '/notifications') return t('header.notifications');
    return '';
  };
  
  const displayTitle = title || getDefaultTitle();
  const isHomePage = pathname === '/home';
  
  // Don't show header on login page
  if (pathname === '/login') {
    return null;
  }

  // Function to handle copying the share link
  const handleShare = () => {
    if (!shareCode) return;
    // IMPORTANT: Replace '[yourdomain.com]' with your actual domain
    const shareUrl = `${window.location.origin}/link/${shareCode}`;
    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        toast.success(t('header.linkCopiedSuccess'), 1500);
      })
      .catch(err => {
        console.error('Failed to copy link: ', err);
        toast.error(t('header.linkCopiedError'), 1500);
      });
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-md dark:shadow-gray-950/30 transition-all duration-300 ease-in-out backdrop-blur-sm bg-opacity-95 dark:bg-opacity-95">
      <div className="flex items-center justify-between h-16 px-4 max-w-screen-lg mx-auto">
        <div className="flex items-center">
          {showBackButton ? (
            <Button
              variant="ghost"
              size="icon"
              className="ml-2 transition-all duration-200 hover:scale-105 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-700 dark:text-gray-300"
              asChild
            >
              <Link href={
                pathname.includes('/lists/') ? '/lists' :
                pathname === '/create-list' ? '/lists' :
                pathname === '/notifications' ? '/lists' :
                '/home'
              }>
                <ArrowRight className="h-5 w-5 text-gray-700 dark:text-gray-300" />
              </Link>
            </Button>
          ) : isHomePage ? (
            <AppLogo size="normal" withLink={false} />
          ) : null}
          
          {!isHomePage && (
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 dark:from-blue-400 dark:to-blue-600 bg-clip-text text-transparent animate__fadeIn line-clamp-1 break-all">{displayTitle}</h1>
          )}
        </div>
        
        <div className="flex items-center space-x-reverse space-x-1 sm:space-x-2">
          {shareCode && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleShare}
              className="transition-all duration-200 hover:scale-105 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-400"
              aria-label={t('header.shareListAriaLabel')}
            >
              <Share2 className="h-5 w-5" />
            </Button>
          )}
          {extras}
          
          <NotificationsDropdown />
          
          {/* ThemeSwitcher removed */}
          {/* <ThemeSwitcher /> */}
        </div>
      </div>
    </header>
  );
} 