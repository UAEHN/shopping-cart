'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  HomeIcon, 
  Users, 
  MessageSquare, 
  User,
  ShoppingCart
} from 'lucide-react';

const navItems = [
  { name: 'عربة التسوق', href: '/home', icon: HomeIcon },
  { name: 'القوائم', href: '/lists', icon: ShoppingCart },
  { name: 'الأشخاص', href: '/contacts', icon: Users },
  { name: 'الرسائل', href: '/messages', icon: MessageSquare },
  { name: 'الملف الشخصي', href: '/profile', icon: User },
];

export default function Navbar() {
  const pathname = usePathname();
  
  // Don't show navbar on login page
  if (pathname === '/login') {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-850 border-t border-gray-200 dark:border-gray-700 shadow-lg backdrop-blur-sm bg-opacity-95 dark:bg-opacity-95">
      <div className="flex items-center justify-around h-16 px-4 max-w-screen-lg mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-col items-center text-xs space-y-1 transition-all duration-200 p-2 rounded-lg
                ${isActive 
                  ? 'text-blue-600 dark:text-blue-400 font-medium' 
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
            >
              <div className={`relative ${isActive ? 'animate__pulse' : ''}`}>
                <Icon className={`h-5 w-5 transition-all duration-200 ${
                  isActive ? 'text-blue-600 dark:text-blue-400 scale-110' : ''
                }`} />
                {isActive && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 bg-blue-600 dark:bg-blue-400 rounded-full"></span>
                )}
              </div>
              <span className={`transition-all duration-200 ${isActive ? 'scale-105' : ''}`}>{item.name}</span>
              {isActive && (
                <div className="absolute -bottom-1 left-1/2 w-10 h-1 bg-blue-600 dark:bg-blue-400 rounded-full transform -translate-x-1/2"></div>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
} 