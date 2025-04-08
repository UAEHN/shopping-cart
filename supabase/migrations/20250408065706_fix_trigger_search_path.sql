-- إعادة تعريف دالة handle_new_list مع search_path موسع
CREATE OR REPLACE FUNCTION public.handle_new_list()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
-- تضمين المخططات الضرورية للعثور على supabase_url() و net.http_post
SET search_path = public, extensions, net
AS $$
DECLARE
  creator_name TEXT;
  notification_payload JSONB;
  function_url TEXT;
  service_key TEXT;
BEGIN
  -- قراءة مفتاح الخدمة من Vault
  SELECT decrypted_secret INTO service_key 
  FROM vault.decrypted_secrets
  WHERE name = 'service_role_key';

  IF service_key IS NULL THEN
    RAISE EXCEPTION 'Secret "service_role_key" not found in Vault.';
  END IF;

  -- بناء عنوان URL باستخدام supabase_url() المتاحة الآن
  function_url := supabase_url() || '/functions/v1/send-push-notification';

  -- جلب اسم المنشئ
  SELECT username INTO creator_name -- استخدام username بناءً على مخططك
  FROM public.users
  WHERE id = NEW.creator_id;

  -- إعداد حمولة الإشعار
  notification_payload := jsonb_build_object(
    'recipientUserId', NEW.recipient_id,
    'title', 'قائمة تسوق جديدة',
    'body', 'قائمة جديدة من ' || COALESCE(creator_name, 'مستخدم غير معروف'),
    'data', jsonb_build_object('listId', NEW.id::text)
  );

  -- استدعاء وظيفة Supabase Edge
  PERFORM http_post( -- لا حاجة لـ net. الآن لأنها في search_path
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

-- إعادة تعريف دالة handle_item_purchased مع search_path موسع
CREATE OR REPLACE FUNCTION public.handle_item_purchased()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
-- تضمين المخططات الضرورية
SET search_path = public, extensions, net
AS $$
DECLARE
  buyer_name TEXT;
  creator_id_of_list UUID;
  item_name_text TEXT;
  notification_payload JSONB;
  function_url TEXT;
  service_key TEXT;
BEGIN
  -- قراءة مفتاح الخدمة من Vault
  SELECT decrypted_secret INTO service_key 
  FROM vault.decrypted_secrets
  WHERE name = 'service_role_key';

  IF service_key IS NULL THEN
    RAISE EXCEPTION 'Secret "service_role_key" not found in Vault.';
  END IF;

  -- بناء عنوان URL
  function_url := supabase_url() || '/functions/v1/send-push-notification';

  -- تأكد من أن التحديث هو تغيير purchased من false إلى true
  IF NEW.purchased = TRUE AND OLD.purchased = FALSE THEN
    -- جلب اسم المشتري
    IF NEW.purchased_by IS NOT NULL THEN
      SELECT username INTO buyer_name -- استخدام username
      FROM public.users
      WHERE id = NEW.purchased_by;
    ELSE
      buyer_name := 'شخص ما';
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
    PERFORM http_post(
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
