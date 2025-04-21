import { initializeApp, getApp, getApps } from 'firebase/app';
import { getMessaging, getToken, isSupported, Messaging } from 'firebase/messaging';

// تأكد من وجود متغيرات البيئة الضرورية
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// تهيئة Firebase فقط إذا لم يكن قد تم تهيئته بالفعل
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

let messagingInstance: Messaging | null = null;

// تهيئة Messaging فقط في بيئة المتصفح و إذا كان مدعومًا
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      messagingInstance = getMessaging(app);
      console.log('Firebase Messaging is supported.');
    } else {
      console.log('Firebase Messaging is not supported in this browser.');
    }
  });
}

/**
 * يطلب رمز FCM من المستخدم.
 * يتطلب تشغيل Service Worker.
 * @returns {Promise<string | null>} رمز FCM أو null في حالة الخطأ أو عدم الدعم.
 */
export const fetchToken = async (): Promise<string | null> => {
  if (!messagingInstance) {
    console.error('Firebase Messaging is not initialized or not supported.');
    // انتظر قليلاً لإعطاء فرصة للتهيئة غير المتزامنة
    await new Promise(resolve => setTimeout(resolve, 1000));
    if (!messagingInstance) {
        console.error('Firebase Messaging still not initialized.');
        return null;
    }
  }

  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  if (!vapidKey) {
    console.error('VAPID key is not defined in environment variables.');
    return null;
  }

  try {
    console.log('[Firebase] Attempting to get FCM token...');
    const currentToken = await getToken(messagingInstance, { vapidKey: vapidKey });
    if (currentToken) {
      console.log('[Firebase] Successfully got FCM token:', currentToken);
      return currentToken;
    } else {
      console.log('[Firebase] No token available, permission might be needed.');
      // عرض هذا للمستخدمين المتقدمين
      console.log('No registration token available. Request permission to generate one.');
      // يمكنك هنا إضافة منطق لطلب الإذن بشكل صريح إذا لم يتم منحه
      // alert('Please allow notification permission to receive updates.');
      return null;
    }
  } catch (err) {
    console.error('[Firebase] Error retrieving FCM token:', err);
    console.error('An error occurred while retrieving token. ', err);
    // alert('Error retrieving notification token. Please check console.');
    return null;
  }
};

export { messagingInstance }; // تصدير للوصول المباشر إذا لزم الأمر 