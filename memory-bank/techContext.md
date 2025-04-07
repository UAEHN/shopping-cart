# السياق التقني

## التقنيات الأساسية المستخدمة

*   **الواجهة الأمامية (Frontend):**
    *   **إطار العمل:** Next.js (الإصدار 14 أو الأحدث)
    *   **اللغة:** TypeScript
    *   **مكتبات الواجهة:**
        *   React.js (مضمن في Next.js)
        *   Tailwind CSS (لتصميم الواجهة وتوفير استجابة للشاشات المختلفة)
        *   Shadcn UI (مكتبة مكونات مبنية على Tailwind و Radix UI)
        *   Radix UI (مكونات واجهة مستخدم أساسية يمكن الوصول إليها)
    *   **إدارة الحالة:** React Context API و Hooks (مثل `useState`, `useEffect`, `useContext`), و hooks مخصصة.
    *   **التعامل مع البيانات:** `@supabase/supabase-js` للتفاعل مع Supabase.

*   **الواجهة الخلفية والخدمات (Backend & Services):**
    *   **Supabase:**
        *   **قاعدة البيانات:** PostgreSQL
        *   **المصادقة:** Supabase Auth
        *   **التخزين:** Supabase Storage (لتخزين صور المستخدمين)
        *   **الوقت الفعلي:** Supabase Realtime (للإشعارات الداخلية وتحديثات الحالة الفورية)
        *   **الوظائف (Functions):** سيتم استخدامها لاحقًا لإرسال الإشعارات الخارجية (Push Notifications).
    *   **الإشعارات الخارجية (Push Notifications):**
        *   Firebase Cloud Messaging (FCM) (سيتم التنفيذ لاحقًا)
        *   Firebase Admin SDK (سيتم استخدامه داخل Supabase Functions)
        *   Firebase JavaScript SDK (في الواجهة الأمامية لتسجيل الجهاز والحصول على `push_token`)

*   **الصوت:**
    *   HTML5 `<audio>` element لتشغيل التنبيهات الصوتية.

## إعدادات بيئة التطوير

*   **مدير الحزم:** npm أو Yarn (وفقًا لملف `package-lock.json` أو `yarn.lock`)
*   **بيئة التشغيل:** Node.js
*   **التحقق من الكود (Linting & Formatting):**
    *   ESLint (مع تكوين TypeScript)
    *   Prettier (لتنسيق الكود)
*   **نظام التحكم بالإصدارات (Version Control):** Git
*   **مستودع الكود:** GitHub (`https://github.com/UAEHN/shopping-cart`)

## الاستضافة والنشر (Hosting & Deployment)

*   **المنصة:** Vercel (مرتبطة بالمستودع على GitHub للنشر التلقائي).

## الاعتماديات الرئيسية (Key Dependencies - من `package.json`)

*   `next`
*   `react`, `react-dom`
*   `typescript`
*   `tailwindcss`
*   `@supabase/supabase-js`
*   مكتبات Shadcn UI / Radix UI (مثل `@radix-ui/react-slot`, `class-variance-authority`, `clsx`, `tailwind-merge` إلخ.)
*   `firebase` (لإدارة FCM في الواجهة الأمامية)

## قيود فنية واعتبارات

*   **قيود التشغيل التلقائي للصوت:** قد تمنع المتصفحات الحديثة التشغيل التلقائي للصوت قبل تفاعل المستخدم مع الصفحة.
*   **توافق الإشعارات الخارجية:** يعتمد استلام الإشعارات الخارجية على نظام تشغيل الجهاز وإعدادات المستخدم.
*   **حدود Supabase/Firebase:** يجب مراعاة حدود الاستخدام المجاني أو المدفوع لخدمات Supabase و Firebase (مثل عدد اتصالات Realtime، عدد الإشعارات المرسلة). 