'use client';

import { ReactNode } from 'react';
import { useGlobalRealtime } from '@/hooks/useGlobalRealtime';

/**
 * مكون للاستماع للتحديثات المباشرة على مستوى التطبيق
 * يستمع للتغييرات على جميع القوائم والعناصر ويعرض إشعارات مناسبة
 */
export function GlobalRealtimeProvider({ children }: { children: ReactNode }) {
  // استخدام هوك الاستماع للتحديثات المباشرة
  useGlobalRealtime();
  
  // هذا المكون لا يعرض أي واجهة مستخدم خاصة به وإنما يمرر الأبناء فقط
  return <>{children}</>;
} 