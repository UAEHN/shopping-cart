-- إعادة دالة التعامل مع قائمة جديدة إلى حالتها السابقة (بدون إدراج إشعار داخلي)
CREATE OR REPLACE FUNCTION public.handle_new_list()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  creator_username_val text;
  notification_message text;
  supabase_url_val text := 'https://qijdcjmyhfzrsgorvsdv.supabase.co'; -- تم تثبيته هنا
  edge_function_url text := supabase_url_val || '/functions/v1/send-push-notification';
  service_role_key_val text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpamRjam15aGZ6cnNnb3J2c2R2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcxMjIwMDQ0NywiZXhwIjoyMDI3Nzc2NDQ3fQ.3o5MruQzF5-LCXld9H7k7DkcQJ7a6G2taUEQpI0r7zg'; -- تم تثبيته هنا (تحذير: الأفضل استخدام الأسرار)
BEGIN
  -- ضبط مسار البحث ليشمل الامتدادات الضرورية والجداول العامة
  SET search_path = extensions, public; -- المكان الصحيح
  
  SELECT u.username INTO creator_username_val
  FROM public.users u WHERE u.id = NEW.creator_id;

  notification_message := creator_username_val || ' أرسل لك قائمة تسوق جديدة';

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
  END;

  RETURN NEW;
END;
$$;

-- إعادة دالة التعامل مع شراء عنصر إلى حالتها السابقة (بدون إدراج إشعار داخلي)
CREATE OR REPLACE FUNCTION public.handle_item_purchased()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  list_creator_id uuid;
  list_recipient_username text;
  actor_username text;
  item_name_val text;
  notification_recipient_username text;
  notification_title text;
  notification_message text;
  supabase_url_val text := 'https://qijdcjmyhfzrsgorvsdv.supabase.co'; -- تم تثبيته هنا
  edge_function_url text := supabase_url_val || '/functions/v1/send-push-notification';
  service_role_key_val text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpamRjam15aGZ6cnNnb3J2c2R2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcxMjIwMDQ0NywiZXhwIjoyMDI3Nzc2NDQ3fQ.3o5MruQzF5-LCXld9H7k7DkcQJ7a6G2taUEQpI0r7zg'; -- تم تثبيته هنا (تحذير: الأفضل استخدام الأسرار)
BEGIN
  -- ضبط مسار البحث ليشمل الامتدادات الضرورية والجداول العامة
  SET search_path = extensions, public; -- المكان الصحيح

  -- فقط قم بتشغيل المنطق إذا تغيرت حالة الشراء
  IF OLD.purchased IS DISTINCT FROM NEW.purchased THEN
    
    SELECT creator_id, recipient_username INTO list_creator_id, list_recipient_username
    FROM public.lists WHERE id = NEW.list_id;

    SELECT name INTO item_name_val FROM public.items WHERE id = NEW.id;

    SELECT u.username INTO actor_username
    FROM public.users u WHERE u.id = COALESCE(NEW.purchased_by, OLD.purchased_by);

    IF COALESCE(NEW.purchased_by, OLD.purchased_by) = list_creator_id THEN
      notification_recipient_username := list_recipient_username;
    ELSE
      SELECT u.username INTO notification_recipient_username
      FROM public.users u WHERE u.id = list_creator_id;
    END IF;

    IF NEW.purchased THEN
      notification_title := 'تم شراء عنصر!';
      notification_message := actor_username || ' قام بشراء \"' || item_name_val || '\"';
    ELSE
      notification_title := 'تم تحديث عنصر!';
      notification_message := actor_username || ' ألغى شراء \"' || item_name_val || '\"';
    END IF;

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
          'type', 'ITEM_UPDATE'
        )
      );
    EXCEPTION WHEN others THEN
        RAISE WARNING 'Could not send ITEM_UPDATE push notification for item %: %', NEW.id, SQLERRM;
    END;

  END IF;
  RETURN NEW;
END;
$$;
