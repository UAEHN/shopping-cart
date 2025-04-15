'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';

export function AppLogo({ size = 'normal', withLink = true }: { size?: 'small' | 'normal' | 'large', withLink?: boolean }) {
  const pathname = usePathname();
  const { t } = useTranslation();
  const [isMounted, setIsMounted] = useState(false);
  const isLoginPage = pathname === '/login';
  const targetHref = isLoginPage ? '/login' : '/home';
  
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // تحديد الأحجام بناءً على معامل الحجم
  const containerClasses = {
    small: "flex items-center gap-2 px-1",
    normal: "flex items-center gap-3 px-2",
    large: "flex items-center gap-4 px-3",
  };
  
  const iconSize = {
    small: "h-4 w-4",
    normal: "h-6 w-6",
    large: "h-7 w-7",
  };
  
  const textSize = {
    small: "text-sm",
    normal: "text-base",
    large: "text-xl",
  };
  
  const Logo = () => (
    <div className={`${containerClasses[size]} py-1 rounded-full transition-all`}>
      <div className="relative">
        <ShoppingCart className={`${iconSize[size]} text-blue-600 dark:text-blue-400 relative z-10`} />
      </div>
      <span className={`${textSize[size]} font-bold leading-none bg-gradient-to-r from-blue-600 to-blue-800 dark:from-blue-400 dark:to-blue-600 bg-clip-text text-transparent whitespace-nowrap`}>
        {isMounted ? t('common.appName') : <>&nbsp;</>}
      </span>
    </div>
  );
  
  return withLink ? (
    <Link href={targetHref} className="focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-full transition-all">
      <Logo />
    </Link>
  ) : (
    <Logo />
  );
} 