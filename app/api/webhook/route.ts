import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/services/supabase';

// معالج استقبال Webhooks من Supabase
export async function POST(req: NextRequest) {
  try {
    // استلام بيانات الwebhook
    const webhookData = await req.json();
    console.log('Webhook received:', webhookData);

    // التحقق من نوع الحدث
    const { type, table, record, schema, old_record } = webhookData;
    
    if (!type || !table || !record) {
      return NextResponse.json(
        { error: 'Invalid webhook payload' },
        { status: 400 }
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error handling webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// للتحقق من الاتصال
export async function GET() {
  return NextResponse.json({ status: 'Webhook endpoint is active' });
} 