import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.20.0';

// هذا لتهيئة عميل Supabase داخل الخدمة
const supabaseClient = (req: Request) => {
  // يمكن للخدمة الحصول على URL و anon key من متغيرات البيئة تلقائياً
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  
  return createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        Authorization: req.headers.get('Authorization') || '',
      },
    },
  });
};

serve(async (req) => {
  // التأكد من أن الطلب هو POST
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // قم بتنفيذ وظائف مختلفة بناءً على طريقة HTTP
    if (req.method === 'POST') {
      // استلام بيانات الwebhook
      const webhookData = await req.json();
      console.log('Webhook received:', webhookData);

      // التحقق من نوع الحدث
      const { type, table, record, schema, old_record } = webhookData;
      
      if (!type || !table || !record) {
        return new Response(
          JSON.stringify({ error: 'Invalid webhook payload' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // معالجة تحديثات القوائم
      if (table === 'lists' && (type === 'INSERT' || type === 'UPDATE')) {
        // سنعيد تنفيذ هذا لاحقاً عندما يكون جدول البث موجوداً
        console.log('تم استلام تحديث للقائمة:', record);
      }

      // معالجة تحديثات العناصر
      if (table === 'items' && (type === 'INSERT' || type === 'UPDATE' || type === 'DELETE')) {
        // سنعيد تنفيذ هذا لاحقاً عندما يكون جدول البث موجوداً
        console.log('تم استلام تحديث للعنصر:', record);
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // للتحقق من الاتصال
    else if (req.method === 'GET') {
      return new Response(
        JSON.stringify({ status: 'Webhook endpoint is active' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // رد غير مصرح به للطرق الأخرى
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error handling webhook:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}; 