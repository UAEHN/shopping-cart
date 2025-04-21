'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  HomeIcon, 
  Users, 
  User,
  ShoppingCart,
  Settings
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

import type { LucideIcon } from 'lucide-react';

interface NavItem {
  key: string;
  href: string;
  icon: LucideIcon;
}

const navItemConfig: NavItem[] = [
  { key: 'nav.lists', href: '/lists', icon: ShoppingCart },
  { key: 'nav.contacts', href: '/contacts', icon: Users },
  { key: 'nav.settings', href: '/settings', icon: Settings },
];

export default function Navbar() {
  const pathname = usePathname();
  const { t } = useTranslation();
  
  if (pathname === '/login') {
    return null;
  }

  const tubelightTransition = {
    type: "spring",
    stiffness: 400,
    damping: 30,
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shadow-lg backdrop-blur-sm bg-opacity-95 dark:bg-opacity-95">
      <div className="flex items-stretch justify-around h-16 px-1 sm:px-2 max-w-screen-md mx-auto">
        {navItemConfig.map((item) => {
          const isActive = pathname === item.href || (item.href === '/lists' && pathname === '/');
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-1 flex-col items-center justify-center text-xs space-y-1 p-1 pt-2 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:focus-visible:ring-blue-400 group transition-colors duration-200",
                isActive
                  ? 'text-blue-600 dark:text-blue-400 font-medium'
                  : 'text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200'
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="tubelight-indicator"
                  className="absolute -top-[1px] left-1/2 -translate-x-1/2"
                  initial={false}
                  transition={tubelightTransition}
                >
                  <div className="w-8 h-1 bg-blue-500 dark:bg-blue-400 rounded-t-full">
                    <div className="absolute w-12 h-6 bg-blue-500/20 dark:bg-blue-400/20 rounded-full blur-md -top-2 -left-2" />
                    <div className="absolute w-8 h-6 bg-blue-500/20 dark:bg-blue-400/20 rounded-full blur-md -top-1" />
                    <div className="absolute w-4 h-4 bg-blue-500/20 dark:bg-blue-400/20 rounded-full blur-sm top-0 left-2" />
                  </div>
                </motion.div>
              )}

              <motion.div
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
              >
                <Icon className="h-5 w-5" />
              </motion.div>

              <span>{t(item.key)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
} 