'use client';

import { usePathname } from 'next/navigation';
import { ArrowRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ThemeSwitcher } from '@/components/ui/theme-switcher';
import { AppLogo } from '@/components/ui/app-logo';

interface HeaderProps {
  showBackButton?: boolean;
  showCreateButton?: boolean;
  title?: string;
  extras?: React.ReactNode;
}

export default function Header({
  showBackButton = false,
  showCreateButton = false,
  title,
  extras
}: HeaderProps) {
  const pathname = usePathname();
  
  // تحديد العنوان الافتراضي بناءً على المسار
  const getDefaultTitle = () => {
    if (pathname === '/home') return ''; // سنعرض الشعار بدلاً من النص
    if (pathname === '/contacts') return 'الأشخاص';
    if (pathname === '/messages') return 'الرسائل';
    if (pathname === '/lists') return 'قوائم التسوق';
    if (pathname === '/profile') return 'الملف الشخصي';
    if (pathname === '/create-list') return 'قائمة جديدة';
    if (pathname.includes('/lists/')) return 'تفاصيل القائمة';
    return '';
  };
  
  const displayTitle = title || getDefaultTitle();
  const isHomePage = pathname === '/home';
  
  // Don't show header on login page
  if (pathname === '/login') {
    return null;
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-md dark:shadow-gray-950/30 transition-all duration-300 ease-in-out backdrop-blur-sm bg-opacity-95 dark:bg-opacity-95">
      <div className="flex items-center justify-between h-16 px-4 max-w-screen-lg mx-auto">
        <div className="flex items-center">
          {showBackButton ? (
            <Button
              variant="ghost"
              size="icon"
              className="mr-2 transition-all duration-200 hover:scale-105 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-700 dark:text-gray-300"
              asChild
            >
              <Link href={
                pathname.includes('/lists/') ? '/lists' :
                pathname === '/create-list' ? '/lists' :
                '/home'
              }>
                <ArrowRight className="h-5 w-5 text-gray-700 dark:text-gray-300" />
              </Link>
            </Button>
          ) : isHomePage ? (
            <AppLogo size="normal" withLink={false} />
          ) : null}
          
          {!isHomePage && (
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 dark:from-blue-400 dark:to-blue-600 bg-clip-text text-transparent animate__fadeIn">{displayTitle}</h1>
          )}
        </div>
        
        <div className="flex items-center space-x-reverse space-x-2">
          {extras}
          
          <ThemeSwitcher />
          
          {showCreateButton && (
            <Button
              size="icon"
              className="rounded-full transition-all duration-200 hover:scale-105 shadow-sm hover:shadow-md bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
              asChild
            >
              <Link href="/create-list">
                <Plus className="h-5 w-5" />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
} 