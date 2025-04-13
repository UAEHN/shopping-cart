'use client';

import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
// استيراد ملف التهيئة i18next هنا لتشغيله في جانب العميل
// افترض أن ملف i18n موجود في src/i18n.js
import '../src/i18n'; 

interface I18nInitializerProps {
  children: React.ReactNode;
}

// يمكنك استخدام هذا المكون لتغليف أجزاء التطبيق التي تحتاج إلى ترجمة
const I18nInitializer: React.FC<I18nInitializerProps> = ({ children }) => {
  const { i18n } = useTranslation(); // الحصول على نسخة i18n

  useEffect(() => {
    // دالة لتحديث السمة dir
    const updateDirection = (lng: string | undefined) => {
      if (lng) {
        const dir = i18n.dir(lng); // الحصول على الاتجاه من i18next
        document.documentElement.setAttribute('dir', dir);
        // يمكنك أيضًا تحديث lang إذا أردت
        // document.documentElement.setAttribute('lang', lng);
      }
    };

    // تحديث الاتجاه عند تحميل المكون لأول مرة
    updateDirection(i18n.language);

    // تسجيل المستمع لتغيير اللغة
    i18n.on('languageChanged', updateDirection);

    // دالة التنظيف لإزالة المستمع عند إلغاء تحميل المكون
    return () => {
      i18n.off('languageChanged', updateDirection);
    };
  }, [i18n]); // الاعتماد على i18n لضمان تحديث المستمع إذا تغيرت النسخة

  // إرجاع الأطفال مباشرة بدون Suspense
  return <>{children}</>;
};

export default I18nInitializer; 