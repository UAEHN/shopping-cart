// هذا ملف فارغ يستخدم لمنع أخطاء 404 عند طلب ملف service worker
// تمت إزالة Firebase من المشروع فلا حاجة لهذا الملف، لكنه موجود لمنع الأخطاء

self.addEventListener('install', () => {
  console.log('Service Worker installed');
  self.skipWaiting();
});

self.addEventListener('activate', () => {
  console.log('Service Worker activated');
});

self.addEventListener('fetch', (event) => {
  // مجرد خطاف فارغ للـ fetch
});