// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

// Follow this pattern to import remote modules:
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@^2.44.0";
// تعديل: استيراد الأجزاء المطلوبة فقط من firebase-admin
import {
  initializeApp,
  cert,
  getApps,
  getApp,
  type App
} from "npm:firebase-admin@^12.0.0/app";
import { getMessaging, type Message } from "npm:firebase-admin@^12.0.0/messaging";

console.log("Function send-push-notification started.");

// --- تهيئة Firebase Admin ---
let firebaseAdminApp: App | null = null; // استخدام النوع App المستورد
try {
  const serviceAccountString = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_KEY");
  if (!serviceAccountString) {
    throw new Error("Firebase service account key secret not found.");
  }
  const serviceAccount = JSON.parse(serviceAccountString);

  // استخدام getApps و getApp المستوردة
  if (getApps().length === 0) {
      firebaseAdminApp = initializeApp({
        credential: cert(serviceAccount), // استخدام cert المستوردة
      });
      console.log("Firebase Admin SDK initialized successfully.");
  } else {
      firebaseAdminApp = getApp(); // استخدام getApp المستوردة
      console.log("Using existing Firebase Admin SDK instance.");
  }
} catch (e: unknown) {
  console.error("Error initializing Firebase Admin SDK:", (e instanceof Error) ? e.message : e);
}

serve(async (req: Request) => {
  if (!firebaseAdminApp) {
      return new Response(JSON.stringify({ error: "Firebase Admin SDK not initialized." }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
  }

  // 1. استخراج البيانات من الطلب
  let recipientUserId: string | null = null;
  let title: string | null = null;
  let body: string | null = null;
  let data: { [key: string]: string } = {}; // بيانات إضافية (مثل listId)

  try {
    const payload = await req.json();
    recipientUserId = payload.recipientUserId;
    title = payload.title;
    body = payload.body;
    data = payload.data || {}; // التأكد من وجود كائن بيانات

    if (!recipientUserId || !title || !body) {
      throw new Error("Missing required fields: recipientUserId, title, body");
    }
  } catch (error: unknown) {
    console.error("Error parsing request body:", (error instanceof Error) ? error.message : error);
    return new Response(JSON.stringify({ error: `Bad request: ${(error instanceof Error) ? error.message : error}` }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  console.log(`Processing notification for user: ${recipientUserId}`);
  console.log(`Title: ${title}, Body: ${body}`);
  console.log("Data:", data);

  try {
    // 2. تهيئة عميل Supabase Admin (يستخدم مفتاح Service Role)
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceRoleKey) {
        throw new Error("Supabase URL or Service Role Key not found in environment variables.");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    // 3. جلب رمز الدفع للمستخدم المستلم
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('push_token')
      .eq('id', recipientUserId)
      .single(); // نفترض وجود مستخدم واحد فقط بهذا الـ ID

    if (userError) {
      console.error("Error fetching user push token:", userError);
      // لا نرجع خطأ 500 هنا، قد يكون المستخدم غير موجود أو لا يوجد رمز
    }

    if (!userData || !userData.push_token) {
      console.log(`No push token found for user ${recipientUserId}. Skipping notification.`);
      // لا يزال يعتبر نجاحًا من وجهة نظر الوظيفة، حيث لا يوجد شيء آخر لفعله
      return new Response(JSON.stringify({ message: "No push token found for user." }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const pushToken = userData.push_token;
    console.log(`Found push token for user ${recipientUserId}: ${pushToken}`);

    // 4. بناء رسالة FCM (تحتوي فقط على بيانات data)
    // يجب أن يتطابق هيكل البيانات مع ما يتوقعه Service Worker
    const messagePayload = {
      token: pushToken,
      data: {
        title: title, // تمرير العنوان عبر البيانات
        body: body,   // تمرير النص عبر البيانات
        icon: "/icons/icon-192x192.png", // تمرير الأيقونة (اختياري، يمكن للـ SW تحديدها أيضاً)
        ...data // دمج أي بيانات إضافية موجودة مسبقاً (مثل listId)
      },
      // --- تمت إزالة الجزء notification من هنا --- 
      // notification: {
      //   title: title,
      //   body: body,
      // },
       // يمكن إضافة إعدادات webpush إذا لزم الأمر للتحكم في سلوك العرض
       webpush: {
         headers: {
           Urgency: 'high',
         },
         fcmOptions: {
           // link: data.clickAction || '/' // الرابط عند النقر، سيتم التعامل معه في SW
         },
         // يمكن إزالة هذا إذا كان SW سيعرض الإشعار دائماً
         // notification: { 
         //   // يمكنك تحديد بعض الخصائص هنا، لكن SW سيقوم بالتجاوز غالباً
         //   // title: title,
         //   // body: body,
         //   // icon: "/icons/icon-192x192.png"
         // }
       },
       android: {
         priority: 'high'
       },
       apns: {
         headers: {
           'apns-priority': '10'
         }
       }
    };

    // 5. إرسال الإشعار باستخدام Firebase Admin
    const messaging = getMessaging(firebaseAdminApp);
    // تأكد من أن النوع المرسل متوافق. قد نحتاج لتأكيد النوع إذا كان Message يتطلب notification
    // إذا حدث خطأ في النوع، قد نحتاج لتعريف نوع مخصص أو استخدام as any بحذر
    const response = await messaging.send(messagePayload as any); // استخدام as any مؤقتاً لتجاوز فحص النوع الصارم
    console.log("Successfully sent DATA-ONLY message:", response);

    return new Response(JSON.stringify({ success: true, messageId: response }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: unknown) {
    console.error("Error processing notification:", (error instanceof Error) ? error.message : error);
    return new Response(JSON.stringify({ error: `Internal server error: ${(error instanceof Error) ? error.message : error}` }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/send-push-notification' \
    --header 'Authorization: Bearer ' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
