-- إعادة تعريف دالة التعامل مع قائمة جديدة لتضمين إدراج إشعار داخلي
CREATE OR REPLACE FUNCTION public.handle_new_list()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER -- مهم جداً للسماح بالوصول للبيانات واستدعاء الدوال بأمان
AS $$
DECLARE
  creator_username_val text;
  recipient_id_val uuid;
  notification_message text;
  supabase_url_val text := 'https://qijdcjmyhfzrsgorvsdv.supabase.co'; -- تم تثبيته هنا
  edge_function_url text := supabase_url_val || '/functions/v1/send-push-notification';
  service_role_key_val text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpamRjam15aGZ6cnNnb3J2c2R2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcxMjIwMDQ0NywiZXhwIjoyMDI3Nzc2NDQ3fQ.3o5MruQzF5-LCXld9H7k7DkcQJ7a6G2taUEQpI0r7zg'; -- تم تثبيته هنا (تحذير: الأفضل استخدام الأسرار)
BEGIN
  -- ضبط مسار البحث ليشمل الامتدادات الضرورية والجداول العامة
  SET search_path = extensions, public;

  -- الحصول على اسم المستخدم للمنشئ
  SELECT u.username INTO creator_username_val
  FROM public.users u WHERE u.id = NEW.creator_id;

  -- الحصول على معرّف المستخدم للمستلم
  SELECT u.id INTO recipient_id_val
  FROM public.users u WHERE u.username = NEW.recipient_username;

  -- التحقق من وجود المستلم
  IF recipient_id_val IS NULL THEN
    RAISE WARNING 'Recipient user % not found for new list notification.', NEW.recipient_username;
    RETURN NEW; -- أو يمكن رفع خطأ إذا كان مطلوباً
  END IF;

  -- صياغة رسالة الإشعار الداخلي
  notification_message := creator_username_val || ' أرسل لك قائمة تسوق جديدة';

  -- إدراج الإشعار الداخلي في جدول الإشعارات
  BEGIN
    INSERT INTO public.notifications (user_id, message, type, list_id)
    VALUES (recipient_id_val, notification_message, 'NEW_LIST', NEW.id);
  EXCEPTION WHEN others THEN
     RAISE WARNING 'Error inserting new list notification for user %: %', recipient_id_val, SQLERRM;
     -- لا نوقف العملية بسبب فشل الإشعار الداخلي، ولكن نسجل تحذيراً
  END;

  -- استدعاء Edge Function لإرسال إشعار الدفع (Push Notification)
  BEGIN
    PERFORM net.http_post(
      url := edge_function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key_val
      ),
      body := jsonb_build_object(
        'recipientUsername', NEW.recipient_username,
        'title', 'قائمة تسوق جديدة!',
        'message', notification_message,
        'listId', NEW.id,
        'type', 'NEW_LIST'
      )
    );
  EXCEPTION WHEN others THEN
      RAISE WARNING 'Could not send NEW_LIST push notification for list %: %', NEW.id, SQLERRM;
      -- لا نوقف العملية بسبب فشل إشعار الدفع، ولكن نسجل تحذيراً
  END;

  RETURN NEW;
END;
$$;

-- إعادة تعريف دالة التعامل مع شراء عنصر لتضمين إدراج إشعار داخلي
CREATE OR REPLACE FUNCTION public.handle_item_purchased()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER -- مهم جداً للسماح بالوصول للبيانات واستدعاء الدوال بأمان
AS $$
DECLARE
  list_creator_id uuid;
  list_recipient_username text;
  actor_username text;
  item_name_val text;
  notification_recipient_id uuid;
  notification_recipient_username text;
  notification_title text;
  notification_message text;
  supabase_url_val text := 'https://qijdcjmyhfzrsgorvsdv.supabase.co'; -- تم تثبيته هنا
  edge_function_url text := supabase_url_val || '/functions/v1/send-push-notification';
  service_role_key_val text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpamRjam15aGZ6cnNnb3J2c2R2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcxMjIwMDQ0NywiZXhwIjoyMDI3Nzc2NDQ3fQ.3o5MruQzF5-LCXld9H7k7DkcQJ7a6G2taUEQpI0r7zg'; -- تم تثبيته هنا (تحذير: الأفضل استخدام الأسرار)
BEGIN
  -- ضبط مسار البحث ليشمل الامتدادات الضرورية والجداول العامة
  SET search_path = extensions, public;

  -- فقط قم بتشغيل المنطق إذا تغيرت حالة الشراء
  IF OLD.purchased IS DISTINCT FROM NEW.purchased THEN
    -- الحصول على تفاصيل القائمة
    SELECT creator_id, recipient_username INTO list_creator_id, list_recipient_username
    FROM public.lists WHERE id = NEW.list_id;

    -- الحصول على اسم العنصر
    SELECT name INTO item_name_val FROM public.items WHERE id = NEW.id;

    -- الحصول على اسم المستخدم الذي قام بالتغيير (المشتري)
    -- إذا كان purchased_by هو NULL (لأنه ألغى الشراء)، استخدم OLD.purchased_by
    SELECT u.username INTO actor_username
    FROM public.users u WHERE u.id = COALESCE(NEW.purchased_by, OLD.purchased_by);

    -- تحديد مستلم الإشعار (المستخدم الآخر في القائمة)
    IF COALESCE(NEW.purchased_by, OLD.purchased_by) = list_creator_id THEN
      notification_recipient_username := list_recipient_username;
    ELSE
      SELECT u.username INTO notification_recipient_username
      FROM public.users u WHERE u.id = list_creator_id;
    END IF;

    -- الحصول على معرف مستلم الإشعار
    SELECT u.id INTO notification_recipient_id
    FROM public.users u WHERE u.username = notification_recipient_username;

    -- التحقق من وجود المستلم
    IF notification_recipient_id IS NULL THEN
      RAISE WARNING 'Recipient user % not found for item update notification.', notification_recipient_username;
      RETURN NEW;
    END IF;

    -- صياغة الرسالة والعنوان
    IF NEW.purchased THEN
      notification_title := 'تم شراء عنصر!';
      notification_message := actor_username || ' قام بشراء \"' || item_name_val || '\"';
    ELSE
      notification_title := 'تم تحديث عنصر!';
      notification_message := actor_username || ' ألغى شراء \"' || item_name_val || '\"';
    END IF;

    -- إدراج الإشعار الداخلي في جدول الإشعارات
    BEGIN
      INSERT INTO public.notifications (user_id, message, type, list_id, item_id)
      VALUES (notification_recipient_id, notification_message, 'ITEM_UPDATE', NEW.list_id, NEW.id);
    EXCEPTION WHEN others THEN
      RAISE WARNING 'Error inserting item update notification for user %: %', notification_recipient_id, SQLERRM;
      -- لا نوقف العملية بسبب فشل الإشعار الداخلي، ولكن نسجل تحذيراً
    END;

    -- استدعاء Edge Function لإرسال إشعار الدفع
    BEGIN
      PERFORM net.http_post(
        url := edge_function_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || service_role_key_val
        ),
        body := jsonb_build_object(
          'recipientUsername', notification_recipient_username,
          'title', notification_title,
          'message', notification_message,
          'listId', NEW.list_id,
          'itemId', NEW.id,
          'type', 'ITEM_UPDATE' -- أو يمكن استخدام ITEM_PURCHASED/ITEM_UNPURCHASED
        )
      );
    EXCEPTION WHEN others THEN
      RAISE WARNING 'Could not send ITEM_UPDATE push notification for item %: %', NEW.id, SQLERRM;
      -- لا نوقف العملية بسبب فشل إشعار الدفع، ولكن نسجل تحذيراً
    END;

  END IF; -- نهاية التحقق من تغيير حالة الشراء
  RETURN NEW;
END;
$$;
