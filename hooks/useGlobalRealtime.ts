import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/services/supabase';
import { toast } from '@/components/ui/toast';

// Custom Events لتمكين التواصل بين المكونات
const LIST_UPDATED_EVENT = 'list-updated';
const ITEM_UPDATED_EVENT = 'item-updated';

// تصدير أنواع الأحداث للاستخدام في المكونات الأخرى
export const REALTIME_EVENTS = {
  LIST_UPDATED: LIST_UPDATED_EVENT,
  ITEM_UPDATED: ITEM_UPDATED_EVENT
};

// إنشاء كائن للأحداث المخصصة
export const realtimeEvents = {
  // تشغيل حدث تحديث القائمة
  emitListUpdated: (listId: string, data: any) => {
    const event = new CustomEvent(LIST_UPDATED_EVENT, { 
      detail: { listId, data } 
    });
    window.dispatchEvent(event);
  },
  
  // الاستماع لحدث تحديث القائمة
  onListUpdated: (callback: (listId: string, data: any) => void) => {
    const handler = (event: any) => {
      callback(event.detail.listId, event.detail.data);
    };
    window.addEventListener(LIST_UPDATED_EVENT, handler);
    return () => window.removeEventListener(LIST_UPDATED_EVENT, handler);
  },
  
  // تشغيل حدث تحديث عنصر
  emitItemUpdated: (listId: string, itemId: string, data: any) => {
    const event = new CustomEvent(ITEM_UPDATED_EVENT, { 
      detail: { listId, itemId, data } 
    });
    window.dispatchEvent(event);
  },
  
  // الاستماع لحدث تحديث عنصر
  onItemUpdated: (callback: (listId: string, itemId: string, data: any) => void) => {
    const handler = (event: any) => {
      callback(event.detail.listId, event.detail.itemId, event.detail.data);
    };
    window.addEventListener(ITEM_UPDATED_EVENT, handler);
    return () => window.removeEventListener(ITEM_UPDATED_EVENT, handler);
  }
};

/**
 * Hook للاستماع للتحديثات المباشرة على مستوى التطبيق
 * يستمع للتغييرات على جميع القوائم والعناصر ويعرض إشعارات مناسبة
 */
export function useGlobalRealtime() {
  // اسم المستخدم الحالي لتحديد ما إذا كان التغيير بواسطة المستخدم نفسه أو شخص آخر
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);

  // الحصول على اسم المستخدم الحالي
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        // التحقق من حالة تسجيل الدخول
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          // محاولة الحصول على اسم المستخدم من جدول المستخدمين
          const { data: userData } = await supabase
            .from('users')
            .select('username')
            .eq('id', user.id)
            .single();
          
          if (userData) {
            setCurrentUsername(userData.username);
          }
        }
      } catch (error) {
        console.error('Error getting current user:', error);
      }
    };

    getCurrentUser();
  }, []);

  // إعداد قنوات الاستماع للتحديثات المباشرة
  useEffect(() => {
    if (!currentUsername) return;

    console.log('Setting up global realtime listeners');

    // إنشاء قناة للاستماع لتغييرات العناصر
    const itemsChannel = supabase
      .channel('global-items-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'items'
        },
        (payload) => {
          console.log('Items change detected:', payload);
          
          // إرسال حدث تحديث العنصر للمكونات المعنية
          if (payload.new && typeof payload.new === 'object' && 'list_id' in payload.new && 'id' in payload.new) {
            realtimeEvents.emitItemUpdated(
              payload.new.list_id as string,
              payload.new.id as string,
              payload
            );
          }
          
          // التحقق إذا كان هناك حاجة للحصول على تفاصيل إضافية
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            handleItemChange(payload);
          } else if (payload.eventType === 'DELETE') {
            // معالجة حذف العنصر
            const deletedItem = payload.old;
            if (deletedItem && typeof deletedItem === 'object' && 'name' in deletedItem) {
              toast.info(`تم حذف منتج: ${deletedItem.name}`);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('Items channel status:', status);
      });

    // إنشاء قناة للاستماع لتغييرات القوائم
    const listsChannel = supabase
      .channel('global-lists-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lists'
        },
        (payload) => {
          console.log('Lists change detected:', payload);
          
          // إرسال حدث تحديث القائمة للمكونات المعنية
          if (payload.new && typeof payload.new === 'object' && 'id' in payload.new) {
            realtimeEvents.emitListUpdated(
              payload.new.id as string,
              payload
            );
          }
          
          // معالجة التغييرات في القوائم
          handleListChange(payload);
        }
      )
      .subscribe((status) => {
        console.log('Lists channel status:', status);
      });

    // تنظيف الاشتراكات عند مغادرة الصفحة
    return () => {
      console.log('Cleaning up global realtime listeners');
      supabase.removeChannel(itemsChannel);
      supabase.removeChannel(listsChannel);
    };
  }, [currentUsername]);

  // معالجة تغييرات العناصر وعرض إشعارات مناسبة
  const handleItemChange = async (payload: any) => {
    try {
      const newItem = payload.new;
      const oldItem = payload.old;
      
      if (!newItem || typeof newItem !== 'object' || !('list_id' in newItem)) return;
      
      const listId = newItem.list_id;
      
      // إذا لم يكن هناك معرف للقائمة، نتوقف
      if (!listId) return;
      
      // الحصول على تفاصيل القائمة لمعرفة المرسل والمستلم
      const { data: listData } = await supabase
        .from('lists')
        .select('creator_username, recipient_username')
        .eq('id', listId)
        .single();
      
      if (!listData) return;
      
      // تحديد إذا كان المستخدم الحالي هو صاحب الإجراء
      const isCurrentUserAction = 
        (listData.creator_username === currentUsername && payload.eventType === 'INSERT') ||
        (listData.recipient_username === currentUsername && payload.eventType === 'UPDATE' && 
         oldItem && typeof oldItem === 'object' && 'purchased' in oldItem && 
         newItem.purchased !== oldItem.purchased);
      
      // تجاهل الإشعارات إذا كان الإجراء بواسطة المستخدم الحالي
      if (isCurrentUserAction) return;
      
      // عرض إشعارات مناسبة بناءً على نوع الحدث
      if (payload.eventType === 'INSERT') {
        // إضافة منتج جديد
        toast.info(`تمت إضافة منتج جديد: ${newItem.name}`);
      } else if (payload.eventType === 'UPDATE') {
        // تغيير حالة الشراء
        if (oldItem && typeof oldItem === 'object' && 'purchased' in oldItem && 
            newItem.purchased !== oldItem.purchased) {
          const actor = listData.creator_username === currentUsername ? 'المستلم' : 'المرسل';
          if (newItem.purchased) {
            toast.info(`قام ${actor} بشراء: ${newItem.name}`);
          } else {
            toast.info(`قام ${actor} بإلغاء شراء: ${newItem.name}`);
          }
        }
      }
    } catch (error) {
      console.error('Error handling item change:', error);
    }
  };

  // معالجة تغييرات القوائم وعرض إشعارات مناسبة
  const handleListChange = async (payload: any) => {
    try {
      const newList = payload.new;
      const oldList = payload.old;
      
      if (!newList || typeof newList !== 'object') return;
      
      // إذا كان التغيير هو إنشاء قائمة جديدة
      if (payload.eventType === 'INSERT') {
        // التحقق مما إذا كان المستخدم الحالي هو المستلم أو المرسل
        if ('recipient_username' in newList && newList.recipient_username === currentUsername) {
          toast.info(`قائمة جديدة: تلقيت قائمة تسوق من ${newList.creator_username}`);
        }
      } 
      // إذا كان التغيير هو تحديث قائمة موجودة
      else if (payload.eventType === 'UPDATE') {
        // التحقق من تغيير الحالة
        if (oldList && typeof oldList === 'object' && 'status' in oldList && 
            'status' in newList && newList.status !== oldList.status) {
          
          if (('creator_username' in newList && newList.creator_username === currentUsername) || 
              ('recipient_username' in newList && newList.recipient_username === currentUsername)) {
            
            let statusMessage = '';
            const isCreator = 'creator_username' in newList && newList.creator_username === currentUsername;
            const actor = isCreator ? 'المستلم' : 'المرسل';
            
            switch (newList.status) {
              case 'completed':
                statusMessage = `تم إكمال القائمة بواسطة ${actor}`;
                break;
              case 'opened':
                statusMessage = `بدأ ${actor} العمل على القائمة`;
                break;
              default:
                statusMessage = `تم تغيير حالة القائمة إلى "${newList.status}"`;
            }
            
            toast.info(statusMessage);
          }
        }
      }
      // إذا كان التغيير هو حذف قائمة
      else if (payload.eventType === 'DELETE') {
        if (oldList && typeof oldList === 'object' && 
            (('creator_username' in oldList && oldList.creator_username === currentUsername) || 
             ('recipient_username' in oldList && oldList.recipient_username === currentUsername))) {
          
          const otherUser = 'creator_username' in oldList && oldList.creator_username === currentUsername ? 
            oldList.recipient_username : oldList.creator_username;
          
          toast.info(`تم حذف قائمة التسوق المشتركة مع ${otherUser}`);
        }
      }
    } catch (error) {
      console.error('Error handling list change:', error);
    }
  };
} 