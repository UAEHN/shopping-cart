// هذا ملف فارغ يستخدم لمنع أخطاء 404 عند طلب ملف service worker
// تمت إزالة Firebase من المشروع فلا حاجة لهذا الملف، لكنه موجود لمنع الأخطاء

// استيراد مكتبات Firebase اللازمة
importScripts("https://www.gstatic.com/firebasejs/9.15.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.15.0/firebase-messaging-compat.js");

// --- تهيئة Firebase --- 
// ملاحظة: يجب أن تتطابق هذه القيم مع ما هو موجود في .env.local
// ستحتاج إلى طريقة لوضع القيم الفعلية هنا. 
// الحل الأكثر شيوعًا هو استبدال هذه العناصر النائبة أثناء عملية البناء (build process)
// أو استخدام API مخصص لجلب الإعدادات.
// كحل بسيط الآن، سنفترض أن القيم متوفرة (يجب استبدالها يدويًا أو آليًا لاحقًا).
const firebaseConfig = {
    apiKey: "AIzaSyDP2GEOi2rszYH7-GEc_ct95ovRIGo1S_0",
    authDomain: "my-basket-27d79.firebaseapp.com",
    projectId: "my-basket-27d79",
    storageBucket: "my-basket-27d79.appspot.com",
    messagingSenderId: "237850221493",
    appId: "1:237850221493:web:761c75b4b8f49d406a17fc",
    measurementId: "G-QZ1FL452X5"
};

try {
    firebase.initializeApp(firebaseConfig);
    console.log("Firebase Initialized in Service Worker");

    // استرداد مثيل Firebase Messaging لتسجيل معالج الخلفية
    const messaging = firebase.messaging();

    // --- معالج استقبال الرسائل في الخلفية --- 
    messaging.onBackgroundMessage((payload) => {
        console.log(
        "[firebase-messaging-sw.js] Received background message ",
        payload
        );
        // تخصيص الإشعار هنا
        const notificationTitle = payload.notification?.title || "إشعار جديد";
        const notificationOptions = {
            body: payload.notification?.body || "لديك رسالة جديدة.",
            icon: "/icons/icon-192x192.png", // تأكد من وجود هذا المسار
            data: payload.data // تمرير البيانات لحدث النقر
        };

        // عرض الإشعار
        self.registration.showNotification(notificationTitle, notificationOptions);
    });

    console.log("Background message handler registered.");

} catch (error) {
    console.error("Error initializing Firebase in Service Worker:", error);
}


// --- معالج النقر على الإشعار --- 
self.addEventListener("notificationclick", (event) => {
    console.log("[firebase-messaging-sw.js] Notification click Received.", event);

    event.notification.close();

    const notificationData = event.notification.data;
    let targetUrl = '/'; // رابط افتراضي

    // تحديد الرابط المستهدف بناءً على البيانات المرفقة
    if (notificationData && notificationData.listId) {
        targetUrl = `/lists/${notificationData.listId}`;
        console.log("Target URL from data:", targetUrl);
    } else {
        console.log("No specific data found, opening home.");
    }

    // هذا يفتح علامة تبويب جديدة أو يركز على علامة تبويب موجودة للرابط
    event.waitUntil(
        clients.matchAll({
            type: "window",
            includeUncontrolled: true
        }).then((clientList) => {
            // تحقق مما إذا كان هناك نافذة مفتوحة بالفعل للرابط المستهدف
            for (const client of clientList) {
                // قد تحتاج إلى تعديل هذا الشرط ليتناسب مع كيفية عمل الـ routing لديك
                if (client.url && client.url.includes(targetUrl) && 'focus' in client) {
                    console.log("Found existing client, focusing...");
                    return client.focus();
                }
            }
            // إذا لم يتم العثور على نافذة، افتح واحدة جديدة
            console.log("No existing client found, opening new window...");
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});

// --- معالجات Service Worker الأساسية (للتثبيت والتفعيل) ---
self.addEventListener('install', () => {
  console.log('Service Worker installing...');
  self.skipWaiting(); // فرض التفعيل الفوري
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  // تنظيف الـ caches القديمة إذا لزم الأمر
  event.waitUntil(clients.claim()); // التحكم الفوري بالصفحات
});

self.addEventListener('fetch', (event) => {
  // مجرد خطاف فارغ للـ fetch
});