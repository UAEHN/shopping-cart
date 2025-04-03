'use client';

import * as React from 'react';
import { Slide, ToastContainer, toast as reactToast, cssTransition } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useTheme } from '@/components/theme-provider';

// منع ظهور نفس الإشعار أكثر من مرة في فترة زمنية محددة
const activeToasts = new Set<string>();
const TOAST_DEBOUNCE_TIME = 1500; // تقليل فترة منع التكرار إلى 1.5 ثانية

// تأثير انتقالي مخصص لتحسين الإشعارات
const slideTransition = cssTransition({
  enter: 'animate__animated animate__slideInRight',
  exit: 'animate__animated animate__slideOutRight',
  collapseDuration: 200, // تسريع وقت الخروج
});

// مسح جميع الإشعارات الحالية
export const clearAllToasts = () => {
  reactToast.dismiss();
};

export function Toaster() {
  const { theme } = useTheme();
  const [toastTheme, setToastTheme] = React.useState<'dark' | 'light'>('light');
  
  // استخدام useEffect للتأكد من أن الكود يعمل فقط في المتصفح
  React.useEffect(() => {
    // التحقق من وجود واجهة المستخدم (client-side)
    const isDarkMode = 
      theme === 'dark' || 
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    setToastTheme(isDarkMode ? 'dark' : 'light');
    
    // إضافة مستمع للتغييرات في وضع النظام إذا كان الوضع "system"
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent) => {
        setToastTheme(e.matches ? 'dark' : 'light');
      };
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  return (
    <ToastContainer
      position="top-center"
      autoClose={1500} // تقليل وقت الظهور إلى 1.5 ثانية
      hideProgressBar={false}
      newestOnTop
      closeOnClick
      rtl={true}
      pauseOnFocusLoss={false} // لا يتوقف عند فقدان التركيز
      draggable
      pauseOnHover={false} // عدم التوقف عند تمرير المؤشر
      transition={Slide} // استخدام تأثير Slide الافتراضي لتحسين الأداء
      theme={toastTheme}
      limit={3} // زيادة الحد الأقصى للإشعارات التي تظهر في نفس الوقت
      toastClassName="rounded-lg shadow-md overflow-hidden border border-gray-100 dark:border-gray-700"
      progressClassName="bg-blue-500 dark:bg-blue-400"
      closeButton={({ closeToast }) => (
        <button 
          onClick={closeToast} 
          className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}
    />
  );
}

type ToastProps = {
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  autoClose?: number;
};

// منع التكرار للإشعارات
const debounceToast = (message: string, toastFunc: (message: string, options?: any) => void, autoCloseTime?: number) => {
  // تجاهل الإشعار إذا كان نفس الإشعار قيد التنفيذ
  const toastKey = message.toLowerCase().trim();
  if (activeToasts.has(toastKey)) {
    return;
  }
  
  // إضافة الإشعار إلى القائمة النشطة
  activeToasts.add(toastKey);
  
  // تنفيذ الإشعار مع خيارات مخصصة
  toastFunc(message, {
    className: 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200',
    bodyClassName: 'text-sm font-medium py-1',
    progressStyle: { height: '3px' },
    autoClose: autoCloseTime || 1500, // استخدام وقت مخصص أو 1.5 ثانية افتراضياً
    onClose: () => {
      // إزالة الإشعار من القائمة النشطة عند إغلاقه
      activeToasts.delete(toastKey);
    }
  });
  
  // إزالة الإشعار من القائمة النشطة بعد الوقت المحدد
  setTimeout(() => {
    activeToasts.delete(toastKey);
  }, TOAST_DEBOUNCE_TIME);
};

export const toast = {
  success: (message: string, autoClose?: number) => {
    debounceToast(message, (msg, options) => 
      reactToast.success(msg, {
        ...options,
        icon: '✓',
        progressStyle: { background: '#10b981' }
      }),
      autoClose
    );
  },
  error: (message: string, autoClose?: number) => {
    debounceToast(message, (msg, options) => 
      reactToast.error(msg, {
        ...options,
        icon: '✗',
        progressStyle: { background: '#ef4444' },
        autoClose: autoClose || 2500 // السماح بوقت أطول للأخطاء
      }),
      autoClose
    );
  },
  info: (message: string, autoClose?: number) => {
    debounceToast(message, (msg, options) => 
      reactToast.info(msg, {
        ...options,
        icon: 'ℹ',
        progressStyle: { background: '#3b82f6' }
      }),
      autoClose
    );
  },
  warning: (message: string, autoClose?: number) => {
    debounceToast(message, (msg, options) => 
      reactToast.warning(msg, {
        ...options,
        icon: '⚠',
        progressStyle: { background: '#f59e0b' }
      }),
      autoClose
    );
  },
}; 