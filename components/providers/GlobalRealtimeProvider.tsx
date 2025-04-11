'use client';

import { ReactNode } from 'react';
import { useGlobalRealtime } from '@/hooks/useGlobalRealtime';

export function GlobalRealtimeProvider({ children }: { children: ReactNode }) {
  // استخدام hook لإعداد الاستماع للإشعارات العالمية
  useGlobalRealtime();
  
  // هذا المكون لا يؤثر على العرض، إنما يستمع فقط للإشعارات
  return <>{children}</>;
} 