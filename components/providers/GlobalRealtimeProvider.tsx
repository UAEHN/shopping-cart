'use client';

import { ReactNode } from 'react';
import { useGlobalRealtime } from '@/hooks/useGlobalRealtime';
import { useAuth } from '@/hooks/useAuth';

export function GlobalRealtimeProvider({ children }: { children: ReactNode }) {
  // استخدام hook لطلب معلومات المستخدم الحالي
  const { user } = useAuth();
  
  // استخدام معرف المستخدم في hook للإشعارات العالمية
  useGlobalRealtime(user?.id || null);
  
  // هذا المكون لا يؤثر على العرض، إنما يستمع فقط للإشعارات
  return <>{children}</>;
} 