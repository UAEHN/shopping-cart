-- SQL migration script: create_notification_triggers

-- تأكد من تمكين امتداد http إذا لم يكن ممكّنًا بالفعل
-- CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- 1. دالة لإرسال إشعار عند إنشاء قائمة جديدة
CREATE OR REPLACE FUNCTION public.handle_new_list()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER -- ضروري لاستدعاء الوظيفة بمفتاح الخدمة
SET search_path = public
AS $$
DECLARE
  creator_name TEXT;
  notification_payload JSONB;
  function_url TEXT := supabase_url() || '/functions/v1/send-push-notification'; -- قم بتحديث اسم الوظيفة إذا كان مختلفًا
  service_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtcHFvbWt1eHB6bWdreHhlYnhkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcxNTYzNjM0OCwiZXhwIjoyMDMxMjEyMzQ4fQ.6J_qK5_q_p9b4X3r2I2W7p4N0L9j3z1H6b8o9j0D3f0'; -- استبدل بمفتاح الخدمة الفعلي (أو استخدم طريقة آمنة لقراءته)
BEGIN
  -- جلب اسم المنشئ
  SELECT name INTO creator_name
  FROM public.users
  WHERE id = NEW.creator_id;

  -- إعداد حمولة الإشعار
  notification_payload := jsonb_build_object(
    'recipientUserId', NEW.recipient_id,
    'title', 'قائمة تسوق جديدة', -- عنوان الإشعار
    'body', 'قائمة جديدة من ' || COALESCE(creator_name, 'مستخدم غير معروف'), -- نص الإشعار
    'data', jsonb_build_object('listId', NEW.id::text) -- بيانات إضافية (معرف القائمة)
  );

  -- استدعاء وظيفة Supabase Edge
  PERFORM net.http_post(
    url := function_url,
    body := notification_payload,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    )
  );

  RETURN NEW;
END;
$$;

-- 2. Trigger لتشغيل الدالة عند إنشاء قائمة جديدة
CREATE TRIGGER on_new_list
AFTER INSERT ON public.lists
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_list();

-- 3. دالة لإرسال إشعار عند شراء منتج
CREATE OR REPLACE FUNCTION public.handle_item_purchased()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  buyer_name TEXT;
  creator_id_of_list UUID;
  item_name_text TEXT;
  notification_payload JSONB;
  function_url TEXT := supabase_url() || '/functions/v1/send-push-notification';
  service_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtcHFvbWt1eHB6bWdreHhlYnhkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcxNTYzNjM0OCwiZXhwIjoyMDMxMjEyMzQ4fQ.6J_qK5_q_p9b4X3r2I2W7p4N0L9j3z1H6b8o9j0D3f0'; -- استبدل بمفتاح الخدمة الفعلي (أو استخدم طريقة آمنة لقراءته)
BEGIN
  -- تأكد من أن التحديث هو تغيير purchased من false إلى true
  IF NEW.purchased = TRUE AND OLD.purchased = FALSE THEN
    -- جلب اسم المشتري (إذا كان مسجلًا في التحديث)
    IF NEW.purchased_by IS NOT NULL THEN
      SELECT name INTO buyer_name
      FROM public.users
      WHERE id = NEW.purchased_by;
    ELSE
      buyer_name := 'شخص ما'; -- قيمة افتراضية إذا لم يتم تحديد المشتري
    END IF;

    -- جلب معرف منشئ القائمة واسم المنتج
    SELECT l.creator_id, i.name INTO creator_id_of_list, item_name_text
    FROM public.lists l
    JOIN public.items i ON l.id = i.list_id
    WHERE i.id = NEW.id;

    -- إعداد حمولة الإشعار
    notification_payload := jsonb_build_object(
      'recipientUserId', creator_id_of_list,
      'title', 'تحديث القائمة',
      'body', COALESCE(buyer_name, 'شخص ما') || ' اشترى ' || COALESCE(item_name_text, 'عنصرًا'),
      'data', jsonb_build_object('listId', NEW.list_id::text, 'itemId', NEW.id::text)
    );

    -- استدعاء وظيفة Supabase Edge
    PERFORM net.http_post(
      url := function_url,
      body := notification_payload,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_key
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- 4. Trigger لتشغيل الدالة عند تحديث عنصر
CREATE TRIGGER on_item_purchased
AFTER UPDATE ON public.items
FOR EACH ROW
WHEN (OLD.purchased IS DISTINCT FROM NEW.purchased) -- تشغيل فقط عند تغيير purchased
EXECUTE FUNCTION public.handle_item_purchased();
