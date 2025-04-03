# الـ Webhook Edge Function

هذه الدالة تحل محل نقطة API السابقة `/api/webhook` وتعمل على معالجة الإشعارات من Supabase للتحديثات الفورية.

## الوظيفة

تتلقى هذه الدالة إشعارات من جداول Supabase عند حدوث تغييرات:
- إضافة، تحديث، أو حذف العناصر في جدول `items`
- إضافة أو تحديث القوائم في جدول `lists`

## إعداد Database Webhooks في Supabase

لتفعيل الـ Webhook، يجب إعداد Database Webhook في لوحة تحكم Supabase:

### 1. إعداد Webhook للـ items:

1. انتقل إلى لوحة تحكم Supabase
2. اذهب إلى قسم Database → Webhooks
3. انقر على "Create a new webhook"
4. قم بتعبئة البيانات:
   - **Name**: `items-update`
   - **Table**: `items`
   - **Events**: حدد INSERT, UPDATE, DELETE
   - **URL**: عنوان الدالة المنشورة (مثل: `https://your-project-ref.functions.supabase.co/webhook`)
   - **HTTP Method**: POST
   - **Headers**: اترك فارغاً أو أضف حسب الحاجة
   - **Conditions**: يمكنك تركها فارغة أو إضافة شروط محددة
5. انقر على "Create"

### 2. إعداد Webhook للـ lists:

1. كرر الخطوات السابقة لإنشاء webhook جديد
2. قم بتعبئة البيانات:
   - **Name**: `lists-update`
   - **Table**: `lists`
   - **Events**: حدد INSERT, UPDATE
   - **URL**: نفس عنوان الدالة المستخدم سابقاً
   - **HTTP Method**: POST
   - ترك باقي الإعدادات كما هي

## اختبار الدالة

يمكن اختبار الدالة محلياً باستخدام:

```bash
npx supabase functions serve webhook
```

ثم إرسال طلب POST باستخدام Postman أو أي أداة أخرى بالبيانات التالية للمحاكاة:

```json
{
  "type": "INSERT",
  "table": "items",
  "record": {
    "id": "test-id",
    "name": "اختبار",
    "list_id": "test-list-id",
    "checked": false
  }
}
```

## ملاحظات التنفيذ

- استخدم الدالة `console.log` لتسجيل الأحداث ومراقبتها في سجلات Supabase
- تأكد من أن الجداول والأعمدة المشار إليها موجودة في قاعدة البيانات
- يمكن تخصيص معالجة الأحداث المختلفة حسب احتياجات التطبيق 