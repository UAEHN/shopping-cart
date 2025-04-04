'use client';

import { ReactNode } from 'react';
import { useGlobalRealtime } from '@/hooks/useGlobalRealtime';
import { toast } from '@/components/ui/toast';

/**
 * مكون للاستماع للتحديثات المباشرة على مستوى التطبيق
 * يستمع للتغييرات على جميع القوائم والعناصر ويعرض إشعارات مناسبة
 * 
 * يعتمد على مكونات Toast Notifications لعرض إشعارات للمستخدم
 * عند إضافة أو تعديل أو حذف العناصر أو القوائم
 * تُنفَّذ عمليات الإشعارات في هوك useGlobalRealtime
 */
export function GlobalRealtimeProvider({ children }: { children: ReactNode }) {
  // استخدام هوك الاستماع للتحديثات المباشرة
  // هذا الهوك يتضمن منطق عرض إشعارات Toast عند حدوث تغييرات في البيانات
  useGlobalRealtime();
  
  // هذا المكون لا يعرض أي واجهة مستخدم خاصة به وإنما يمرر الأبناء فقط
  return <>{children}</>;
} 