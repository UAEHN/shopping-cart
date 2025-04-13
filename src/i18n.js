import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
// إزالة استيراد Backend
// import Backend from 'i18next-http-backend';
// إعادة تفعيل استيراد LanguageDetector
import LanguageDetector from 'i18next-browser-languagedetector';

// استيراد ملفات الترجمة من المسار الجديد داخل src
import translationEN from './locales/en/translation.json';
import translationAR from './locales/ar/translation.json';

// تعريف الموارد
const resources = {
  en: {
    translation: translationEN
  },
  ar: {
    translation: translationAR
  }
};

i18n
  // إزالة استخدام Backend
  // .use(Backend)
  // إعادة تفعيل استخدام LanguageDetector
  // اكتشاف لغة المستخدم
  .use(LanguageDetector)
  // تمرير نسخة i18n إلى react-i18next
  .use(initReactI18next)
  // تهيئة i18next
  .init({
    resources, // استخدام الموارد المضمنة
    supportedLngs: ['en', 'ar'], 
    fallbackLng: 'ar', // الاعتماد على اللغة العربية كافتراضي أولي
    // لا حاجة لـ backend.loadPath الآن
    // backend: {
    //   loadPath: '/locales/{{lng}}/translation.json', 
    // },
    debug: process.env.NODE_ENV === 'development', 

    // إعادة تفعيل قسم detection وتهيئته لـ localStorage
    detection: {
      // ترتيب البحث: localStorage أولاً، ثم لغة المتصفح
      order: ['localStorage', 'navigator'],
      // تحديد التخزين المؤقت المستخدم
      caches: ['localStorage'],
      // اسم المفتاح في localStorage
      lookupLocalStorage: 'i18nextLng', 
    },

    interpolation: {
      escapeValue: false, 
    },
  });

// إزالة مستمع الحدث من هنا - سيتم نقله إلى مكون العميل
// i18n.on('languageChanged', (lng) => {
//   document.documentElement.setAttribute('dir', i18n.dir(lng));
// });

export default i18n; 