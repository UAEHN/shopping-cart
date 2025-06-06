وصف المشروع: تطبيق قوائم التسوق التفاعلية مع إدارة المستخدمين
تطبيق ويب يتيح للمستخدمين التسجيل باسم مستخدم فريد، إضافة أشخاص، وإنشاء قوائم تسوق تُصنف فوريًا أثناء الكتابة. عند إرسال القائمة، يتلقى المستلم إشعارًا خارجيًا على هاتفه وإشعارًا داخليًا في التطبيق، يرى من أرسلها، يفتح القائمة، يشطب المنتجات (مع إشعار للمرسل)، ويرد برسالة (مثل "لا يوجد برتقال") تصل للمرسل. يتم التركيز على تجربة مستخدم ممتازة على الهاتف.

التفاصيل الوظيفية
1. التسجيل وإدارة المستخدمين
تسجيل المستخدم: بريد إلكتروني، كلمة مرور، واسم مستخدم فريد (مثل mohammed123).
حفظ البيانات: الاسم الحقيقي وصورة شخصية (في Supabase Storage).
إضافة أشخاص: باستخدام اسم المستخدم الفريد.
2. إنشاء القائمة
واجهة الإدخال:
حقل نص، كتابة منتج (مثل "موز") والضغط على "إنتر" يضيفه فورًا للقائمة ويُصنفها.
تتكرر العملية مع كل منتج جديد.
إرسال القائمة:
زر "إرسال"، اختيار شخص (مثل sara456) من الأشخاص المضافين.
3. عرض القائمة للمستلم
إشعار الوصول:
إشعار خارجي: عند إرسال القائمة، يتلقى المستلم إشعارًا فوريًا على هاتفه (مثل "قائمة جديدة من mohammed123") حتى لو لم يكن في التطبيق، باستخدام تقنية Push Notifications.
إشعار داخلي: عند فتح التطبيق، يظهر تنبيه في صفحة "الرسائل" أو "القوائم الواردة".
واجهة الرسائل:
في صفحة "الرسائل"، يرى المستلم قائمة الرسائل الواردة مع:
اسم المرسل (مثل "محمد").
صورته الشخصية.
إشارة "جديد" (مثل نقطة حمراء).
فتح القائمة:
بالضغط على الرسالة، تفتح القائمة مع المنتجات (مثل "موز، برتقال") كعناصر قابلة للشطب.
4. تفاعل المستلم مع القائمة
شطب المنتجات:
المستلم يشطب منتجًا (مثل "موز")، يتغير حالته إلى "مشترى".
يصل إشعار خارجي وداخلي للمرسل (مثل "sara456 اشترت موز") عبر Supabase Realtime.
كتابة رد:
حقل نص أسفل القائمة لكتابة رسالة (مثل "لا يوجد برتقال").
زر "إرسال الرد" يرسل الرسالة.
الرد يصل للمرسل كإشعار خارجي وداخلي (مثل "رسالة من sara456: لا يوجد برتقال").
5. تجربة المستخدم على الهاتف
تصميم متجاوب: Tailwind CSS لتوافق مع الهواتف، أزرار وحقول كبيرة.
واجهة بسيطة:
صفحة "الرسائل" تعرض الرسائل الواردة مع صور وأسماء.
صفحة القائمة تحتوي على المنتجات وحقل رد.
الأداء: تحديثات فورية (Realtime)، تحميل سريع (Lazy Loading).
سهولة التنقل: شريط سفلي: "الرئيسية"، "الأشخاص"، "الرسائل".
هيكل قاعدة البيانات في Supabase
جدول المستخدمين (users):
id: معرف داخلي (UUID).
username: اسم مستخدم فريد.
name: الاسم الحقيقي.
email: البريد الإلكتروني.
avatar_url: رابط الصورة.
push_token: رمز الجهاز للإشعارات الخارجية (يُحدث عند تسجيل الدخول).
created_at: تاريخ التسجيل.
جدول الأشخاص المضافين (contacts):
id: معرف فريد.
user_id: معرف المستخدم الذي أضاف الشخص.
contact_username: اسم مستخدم الشخص المضاف.
added_at: تاريخ الإضافة.
جدول القوائم (lists):
id: معرف فريد.
share_code: رمز المشاركة.
creator_username: اسم مستخدم المنشئ.
recipient_username: اسم مستخدم المستلم.
status: حالة القائمة ("جديدة"، "مفتوحة").
created_at: تاريخ الإنشاء.
جدول المنتجات (items):
id: معرف فريد.
list_id: معرف القائمة.
name: اسم المنتج.
purchased: حالة الشراء (true/false).
updated_at: وقت التحديث.
جدول الرسائل/الردود (messages):
id: معرف فريد.
list_id: معرف القائمة.
sender_username: اسم مستخدم المرسل (المستلم الذي يرد).
text: نص الرد (مثل "لا يوجد برتقال").
created_at: تاريخ الإرسال.
التقنيات المطلوبة
Supabase:
Auth: لتسجيل المستخدمين.
Database: لتخزين البيانات.
Storage: للصور.
Realtime: لتحديثات فورية (شطب وردود).
إشعارات خارجية:
Firebase Cloud Messaging (FCM) أو خدمة مشابهة لإرسال Push Notifications.
دمج FCM مع Supabase عبر Functions لإرسال إشعار عند إنشاء قائمة أو رد.
الواجهة الأمامية:
React.js أو Next.js.
Tailwind CSS.وshadcn UI
@supabase/supabase-js.
مكتبة Firebase لتسجيل أجهزة المستخدمين.
استضافة: Vercel أو Netlify.
مثال عملي
"محمد" (mohammed123) يرسل قائمة "موز، برتقال" إلى sara456.
"سارة" تتلقى إشعارًا خارجيًا على هاتفها: "قائمة جديدة من محمد".
تدخل التطبيق، ترى في "الرسائل": "محمد" مع صورته و"جديد"، تضغط عليها.
تفتح القائمة، تشطب "موز"، "محمد" يتلقى إشعارًا خارجيًا: "sara456 اشترت موز".
"سارة" تكتب "لا يوجد برتقال" وترسله، "محمد" يتلقى إشعارًا خارجيًا: "رسالة من sara456: لا يوجد برتقال".
ملاحظات تنفيذ الإشعارات الخارجية
الخطوة 1: عند تسجيل الدخول، يسجل التطبيق رمز الجهاز (Push Token) في جدول users.
الخطوة 2: عند إرسال قائمة أو رد، يتم تشغيل Supabase Function لإرسال الإشعار عبر Firebase.
الخطوة 3: المستلم يتلقى الإشعار ويفتح التطبيق مباشرة عبر النقر عليه.