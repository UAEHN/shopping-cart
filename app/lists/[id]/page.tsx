'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { supabase } from '@/services/supabase';
import { toast, clearAllToasts } from '@/components/ui/toast';
import Header from '@/components/layout/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Clock, CheckCircle, Package, ArrowLeft, Trash2, RefreshCw, Plus, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';


interface ListItem {
  id: string;
  name: string;
  purchased: boolean;
  purchased_at: string | null;
  category: string;
}

interface ListDetails {
  id: string;
  share_code: string;
  creator_username: string;
  recipient_username: string;
  status: string;
  created_at: string;
  updated_at: string;
  items: ListItem[];
}

export default function ListDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const listId = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : '';
  
  const [isLoading, setIsLoading] = useState(true);
  const [listDetails, setListDetails] = useState<ListDetails | null>(null);
  const [currentUser, setCurrentUser] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const loadListDetails = useCallback(async () => {
    try {
      if (!listId) {
        toast.error('معرّف القائمة غير صالح');
        router.push('/lists');
        return;
      }
      
      console.log('Loading list details for ID:', listId);
      console.log('List ID type:', typeof listId);
      
      // جلب تفاصيل القائمة
      const { data: list, error: listError } = await supabase
        .from('lists')
        .select('*')
        .eq('id', listId)
        .single();
      
      if (listError) {
        console.error('Error loading list:', {
          message: listError.message,
          code: listError.code,
          details: listError.details,
          hint: listError.hint
        });
        throw listError;
      }
      
      if (!list) {
        toast.error('القائمة غير موجودة');
        router.push('/lists');
        return;
      }
      
      console.log('List loaded successfully:', list.id);
      
      // جلب عناصر القائمة
      const { data: items, error: itemsError } = await supabase
        .from('items')
        .select('*')
        .eq('list_id', listId)
        .order('created_at', { ascending: true });
      
      if (itemsError) {
        console.error('Error loading items:', {
          message: itemsError.message,
          code: itemsError.code,
          details: itemsError.details,
          hint: itemsError.hint
        });
        throw itemsError;
      }
      
      console.log('Items loaded successfully, count:', items ? items.length : 0);
      
      // تحميل تفاصيل القائمة مع العناصر
      setListDetails({
        ...list,
        items: items || []
      });
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading list details:', error);
      toast.error('حدث خطأ أثناء تحميل تفاصيل القائمة');
      setIsLoading(false);
    }
  }, [listId, router]);
  
  useEffect(() => {
    const checkAuthAndLoadList = async () => {
      if (!listId) {
        toast.error('معرّف القائمة غير صالح', 2000);
        router.push('/lists');
        return;
      }
      
      try {
        // التحقق من تسجيل دخول المستخدم
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          toast.info('الرجاء تسجيل الدخول أولاً');
          router.push('/login');
          return;
        }
        
        // الحصول على اسم المستخدم
        const userMetadata = user.user_metadata;
        let username = '';
        
        if (userMetadata && userMetadata.username) {
          username = userMetadata.username;
        } else {
          // جلب اسم المستخدم من قاعدة البيانات إذا لم يكن موجود في metadata
          try {
            const { data: profileData } = await supabase
              .from('users')
              .select('username')
              .eq('id', user.id)
              .single();
            
            if (profileData) {
              username = profileData.username;
            }
          } catch (profileError) {
            console.error('Error fetching username:', profileError);
          }
        }
        
        if (!username) {
          console.error('Username not found for user');
          toast.error('حدث خطأ: لم يتم العثور على اسم المستخدم');
          router.push('/profile');
          return;
        }
        
        setCurrentUser(username);
        
        // جلب تفاصيل القائمة
        await loadListDetails();
        
      } catch (error) {
        console.error('Error checking auth:', error);
        toast.error('حدث خطأ أثناء التحقق من الحساب');
        setIsLoading(false);
      }
    };
    
    // مسح الإشعارات السابقة عند تحميل الصفحة
    clearAllToasts();
    checkAuthAndLoadList();
    
    // إعداد اشتراك Realtime للتحديثات المباشرة
    const setupRealtimeSubscription = () => {
      if (!listId) return;
      
      console.log(`إعداد اشتراك الوقت الفعلي لقائمة المشتريات: ${listId}`);
      
      try {
        // استخدام قناة واحدة للاستماع للتغييرات من جميع الجداول المتعلقة بالقائمة
        const channel = supabase
          .channel(`list-updates-${listId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'items',
              filter: `list_id=eq.${listId}`
            },
            (payload) => {
              console.log(`تم استلام تحديث مباشر لعناصر القائمة ${listId}:`, payload);
              
              if (payload.eventType === 'INSERT' && payload.new) {
                // إضافة عنصر جديد للقائمة
                setListDetails((prevDetails) => {
                  if (!prevDetails) return prevDetails;
                  
                  const newItem = payload.new as ListItem;
                  
                  // تجنب الإضافة المكررة
                  if (prevDetails.items.some(item => item.id === newItem.id)) {
                    return prevDetails;
                  }
                  
                  toast.info(`تمت إضافة منتج جديد: ${newItem.name}`, 1500);
                  
                  return {
                    ...prevDetails,
                    items: [...prevDetails.items, newItem]
                  };
                });
              } else if (payload.eventType === 'UPDATE' && payload.new) {
                // تحديث العنصر المحدد مباشرة في الحالة المحلية
                const updatedItem = payload.new as ListItem;
                
                setListDetails((prevDetails) => {
                  if (!prevDetails) return prevDetails;
                  
                  // فحص إذا كان هناك تغيير فعلي قبل التحديث
                  const existingItem = prevDetails.items.find(item => item.id === updatedItem.id);
                  if (!existingItem || 
                      (existingItem.purchased === updatedItem.purchased && 
                       existingItem.name === updatedItem.name)) {
                    return prevDetails; // لا يوجد تغيير حقيقي، تجنب إعادة العرض غير الضرورية
                  }
                  
                  // تحديث العنصر في القائمة المحلية
                  const updatedItems = prevDetails.items.map((item) => {
                    if (item.id === updatedItem.id) {
                      // عرض إشعار إذا تغيرت حالة الشراء
                      if (item.purchased !== updatedItem.purchased) {
                        // تحديد من قام بالتغيير (إذا كان شخص آخر)
                        const isCurrentUserAction = payload.commit_timestamp === null;
                        
                        if (!isCurrentUserAction) {
                          const actor = prevDetails.creator_username === currentUser ? 'المستلم' : 'المرسل';
                          toast.info(
                            updatedItem.purchased
                              ? `قام ${actor} بشراء: ${updatedItem.name}`
                              : `قام ${actor} بإلغاء شراء: ${updatedItem.name}`,
                            1500
                          );
                        }
                      }
                      
                      // تحديث العنصر بالبيانات الجديدة
                      return { ...item, ...updatedItem };
                    }
                    return item;
                  });
                  
                  return {
                    ...prevDetails,
                    items: updatedItems
                  };
                });
                
                // فحص تحديث حالة القائمة (نقل هذا الجزء خارج setListDetails لتجنب إعادة العرض المزدوجة)
                setListDetails((prevDetails) => {
                  if (!prevDetails) return prevDetails;
                  
                  // حساب حالة القائمة الجديدة بناءً على العناصر المحدثة
                  const allPurchased = prevDetails.items.every(item => {
                    // اعتبار العنصر المحدث إذا كان هو العنصر المغير حالياً
                    if (item.id === updatedItem.id) {
                      return updatedItem.purchased;
                    }
                    return item.purchased;
                  });
                  
                  const anyPurchased = prevDetails.items.some(item => {
                    if (item.id === updatedItem.id) {
                      return updatedItem.purchased;
                    }
                    return item.purchased;
                  });
                  
                  let newStatus = prevDetails.status;
                  
                  if (allPurchased && prevDetails.items.length > 0) {
                    newStatus = 'completed';
                  } else if (anyPurchased) {
                    newStatus = 'opened';
                  } else {
                    newStatus = 'new';
                  }
                  
                  // عدم التحديث إذا لم تتغير الحالة
                  if (newStatus === prevDetails.status) {
                    return prevDetails;
                  }
                  
                  // تحديث حالة القائمة في قاعدة البيانات
                  console.log(`تحديث حالة القائمة من ${prevDetails.status} إلى ${newStatus}`);
                  supabase
                    .from('lists')
                    .update({ status: newStatus })
                    .eq('id', listId)
                    .then(({ error }) => {
                      if (error) {
                        console.error('خطأ في تحديث حالة القائمة:', error);
                      }
                    });
                  
                  return {
                    ...prevDetails,
                    status: newStatus
                  };
                });
              } else if (payload.eventType === 'DELETE' && payload.old) {
                // حذف العنصر من القائمة
                const deletedItem = payload.old as ListItem;
                
                setListDetails((prevDetails) => {
                  if (!prevDetails) return prevDetails;
                  
                  toast.info(`تم حذف منتج: ${deletedItem.name}`, 1500);
                  
                  return {
                    ...prevDetails,
                    items: prevDetails.items.filter(item => item.id !== deletedItem.id)
                  };
                });
              }
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'lists',
              filter: `id=eq.${listId}`
            },
            (payload) => {
              console.log(`تم استلام تحديث مباشر لقائمة المشتريات ${listId}:`, payload);
              
              // تحديث حالة القائمة مباشرة دون إعادة تحميل كاملة
              if (payload.new) {
                setListDetails((prevDetails) => {
                  if (!prevDetails) return prevDetails;
                  
                  // تحديث حالة القائمة بالبيانات الجديدة
                  const newListData = payload.new as Partial<ListDetails>;
                  
                  // تجنب التحديث إذا لم تتغير البيانات
                  if (prevDetails.status === newListData.status) {
                    return prevDetails;
                  }
                  
                  // عرض إشعار بتغيير الحالة إذا تغيرت
                  if (prevDetails.status !== newListData.status) {
                    let statusMessage = '';
                    switch (newListData.status) {
                      case 'new':
                        statusMessage = 'تم تحديث القائمة للحالة: جديدة';
                        break;
                      case 'opened':
                        statusMessage = 'تم تحديث القائمة للحالة: قيد التنفيذ';
                        break;
                      case 'completed':
                        statusMessage = 'تم تحديث القائمة للحالة: مكتملة';
                        break;
                      default:
                        statusMessage = `تم تحديث حالة القائمة: ${newListData.status}`;
                    }
                    toast.info(statusMessage, 1500);
                  }
                  
                  return {
                    ...prevDetails,
                    ...newListData,
                    items: prevDetails.items // الاحتفاظ بالعناصر الحالية
                  };
                });
              }
            }
          )
          .subscribe((status) => {
            console.log(`حالة اشتراك القائمة ${listId}:`, status);
          });
        
        // تنظيف الاشتراك عند مغادرة الصفحة
        return () => {
          console.log(`إلغاء اشتراك الوقت الفعلي لقائمة المشتريات: ${listId}`);
          supabase.removeChannel(channel);
        };
      } catch (error) {
        console.error('خطأ في إعداد اشتراك الوقت الفعلي:', error);
        return () => {}; // إرجاع وظيفة تنظيف فارغة
      }
    };
    
    const cleanup = setupRealtimeSubscription();
    
    // التنظيف عند تفكيك المكوّن
    return () => {
      if (cleanup) cleanup();
      // مسح الإشعارات عند مغادرة الصفحة
      clearAllToasts();
    };
  }, [router, listId, currentUser, loadListDetails]);
  
  // تبديل حالة الشراء للعنصر
  const toggleItemPurchase = async (productId: string) => {
    if (isUpdating || !listDetails) return;
    
    setIsUpdating(true);
    
    try {
      // العثور على العنصر المستهدف
      const targetItem = listDetails.items.find(item => item.id === productId);
      if (!targetItem) {
        throw new Error('العنصر غير موجود');
      }
      
      // تحديث الحالة المحلية فوراً لتجربة مستخدم سريعة (استجابة فورية)
      const newPurchasedState = !targetItem.purchased;
      const newPurchasedAt = newPurchasedState ? new Date().toISOString() : null;
      
      // تحديث الحالة المحلية للعنصر أولاً
      setListDetails(prev => {
        if (!prev) return prev;
        
        const newItems = prev.items.map(item => {
          if (item.id === productId) {
            return {
              ...item,
              purchased: newPurchasedState,
              purchased_at: newPurchasedAt
            };
          }
          return item;
        });
        
        return { 
          ...prev, 
          items: newItems
        };
      });
      
      // إرسال التحديث إلى قاعدة البيانات
      const { error } = await supabase
        .from('items')
        .update({
          purchased: newPurchasedState,
          purchased_at: newPurchasedAt
        })
        .eq('id', productId);
      
      if (error) {
        // تبسيط معالجة الخطأ
        console.error('خطأ في تحديث حالة العنصر:', error.message);
        throw new Error(error.message || 'خطأ في تحديث حالة العنصر');
      }
      
      // لا نقوم بإظهار إشعار هنا لأن الإشعار سيتم إظهاره عند استلام تحديث الـ realtime
    } catch (error) {
      // معالجة الخطأ بشكل مبسط
      const errorMsg = error instanceof Error ? error.message : 'خطأ غير معروف';
      console.error('خطأ في تحديث حالة العنصر:', errorMsg);
      toast.error('حدث خطأ أثناء تحديث حالة العنصر', 2000);
      
      // استرجاع القائمة في حالة الخطأ
      loadListDetails();
    } finally {
      setIsUpdating(false);
    }
  };
  
  // العودة إلى قائمة القوائم
  const goBack = () => {
    router.push('/lists');
  };
  
  // إضافة منتج جديد للقائمة
  const addNewItem = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newItemName.trim() || !listDetails || isAddingItem) return;
    
    setIsAddingItem(true);
    
    try {
      // إضافة المنتج الجديد إلى قاعدة البيانات
      const { data, error } = await supabase
        .from('items')
        .insert({
          list_id: listId,
          name: newItemName.trim(),
          purchased: false,
          purchased_at: null,
          category: ''
        })
        .select('*')
        .single();
      
      if (error) {
        console.error('Error adding new item:', error);
        toast.error('حدث خطأ أثناء إضافة المنتج الجديد');
        return;
      }
      
      if (data) {
        // تحديث القائمة المحلية
        setListDetails(prev => {
          if (!prev) return prev;
          
          return {
            ...prev,
            items: [...prev.items, data]
          };
        });
        
        toast.success(`تمت إضافة ${newItemName.trim()} إلى القائمة`);
        setNewItemName(''); // مسح حقل الإدخال
      }
    } catch (error) {
      console.error('Error adding new item:', error);
      toast.error('حدث خطأ أثناء إضافة المنتج الجديد');
    } finally {
      setIsAddingItem(false);
    }
  };
  
  // حذف منتج من القائمة
  const deleteItem = async (itemId: string, itemName: string) => {
    if (!listDetails || isUpdating) return;
    
    setIsUpdating(true);
    
    try {
      // حذف المنتج من قاعدة البيانات
      const { error } = await supabase
        .from('items')
        .delete()
        .eq('id', itemId);
      
      if (error) {
        console.error('Error deleting item:', error);
        toast.error('حدث خطأ أثناء حذف المنتج');
        return;
      }
      
      // تحديث القائمة المحلية
      setListDetails(prev => {
        if (!prev) return prev;
        
        return {
          ...prev,
          items: prev.items.filter(item => item.id !== itemId)
        };
      });
      
      toast.success(`تم حذف ${itemName} من القائمة`);
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('حدث خطأ أثناء حذف المنتج');
    } finally {
      setIsUpdating(false);
    }
  };
  
  // حذف القائمة بالكامل
  const deleteEntireList = async () => {
    if (!listDetails || isDeleting) return;
    
    setIsDeleting(true);
    
    try {
      // حذف جميع عناصر القائمة أولاً
      const { error: itemsError } = await supabase
        .from('items')
        .delete()
        .eq('list_id', listId);
      
      if (itemsError) {
        console.error('Error deleting list items:', itemsError);
        toast.error('حدث خطأ أثناء حذف عناصر القائمة');
        setIsDeleting(false);
        return;
      }
      
      // ثم حذف القائمة نفسها
      const { error: listError } = await supabase
        .from('lists')
        .delete()
        .eq('id', listId);
      
      if (listError) {
        console.error('Error deleting list:', listError);
        toast.error('حدث خطأ أثناء حذف القائمة');
        setIsDeleting(false);
        return;
      }
      
      toast.success('تم حذف القائمة بنجاح');
      
      // العودة إلى صفحة القوائم
      router.push('/lists');
    } catch (error) {
      console.error('Error during list deletion:', error);
      toast.error('حدث خطأ غير متوقع أثناء حذف القائمة');
      setIsDeleting(false);
    }
  };
  
  // عرض رسالة التحميل
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="bg-blue-100 dark:bg-blue-900 p-4 rounded-full">
            <ShoppingCart className="h-10 w-10 text-blue-500 dark:text-blue-300" />
          </div>
          <span className="text-xl">جاري التحميل...</span>
        </div>
      </div>
    );
  }
  
  // عرض رسالة إذا لم تكن القائمة موجودة
  if (!listDetails) {
    return (
      <div className="p-4 pt-0">
        <Header title="تفاصيل القائمة" showBackButton />
        
        <div className="mt-8 flex flex-col items-center justify-center py-10 px-4 bg-gray-50 dark:bg-gray-800 rounded-xl text-center">
          <ShoppingCart className="h-12 w-12 text-gray-400 dark:text-gray-500 mb-3" />
          <h3 className="text-lg font-medium text-gray-600 dark:text-gray-300 mb-2">
            القائمة غير موجودة
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            لم نتمكن من العثور على القائمة المطلوبة
          </p>
          <Button 
            onClick={goBack}
            className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            <span>العودة إلى القوائم</span>
          </Button>
        </div>
      </div>
    );
  }
  
  // تحديد ما إذا كان المستخدم الحالي هو منشئ القائمة أو مستلمها
  const isCreator = currentUser === listDetails.creator_username;
  const isRecipient = currentUser === listDetails.recipient_username;
  
  // عرض حالة القائمة
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return (
          <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>جديدة</span>
          </Badge>
        );
      case 'opened':
        return (
          <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300 flex items-center gap-1">
            <Package className="h-3 w-3" />
            <span>قيد التنفيذ</span>
          </Badge>
        );
      case 'completed':
        return (
          <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            <span>مكتملة</span>
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
            {status}
          </Badge>
        );
    }
  };
  
  // حساب نسبة الإكمال
  const completionPercentage = listDetails.items.length > 0
    ? Math.round((listDetails.items.filter(item => item.purchased).length / listDetails.items.length) * 100)
    : 0;
  
  // إضافة عنصر جديد للقائمة
  const addItemToList = async () => {
    if (!newItemName.trim()) {
      toast.warning('الرجاء إدخال اسم العنصر');
      return;
    }
    
    if (!listDetails) return;
    
    try {
      setIsAddingItem(true);
      
      // إضافة العنصر إلى القائمة
      const { data: newItem, error } = await supabase
        .from('items')
        .insert({
          list_id: listId,
          name: newItemName.trim(),
          purchased: false,
          category: ''
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // تحديث واجهة المستخدم
      setListDetails({
        ...listDetails,
        items: [...listDetails.items, newItem]
      });
      
      // إنشاء إشعار لمستلم القائمة
      if (currentUser !== listDetails.recipient_username) {
        createNotification(
          listDetails.recipient_username,
          `تمت إضافة "${newItemName}" إلى قائمة التسوق الخاصة بك`,
          'NEW_ITEM',
          newItem.id,
          listId
        );
      }
      
      setNewItemName('');
      toast.success('تمت إضافة العنصر بنجاح');
    } catch (error) {
      console.error('Error adding item:', error);
      toast.error('حدث خطأ أثناء إضافة العنصر');
    } finally {
      setIsAddingItem(false);
    }
  };

  // تحديث حالة الشراء للعنصر
  const toggleItemPurchased = async (itemId: string, purchased: boolean) => {
    if (!listDetails) return;
    
    // العثور على العنصر في القائمة
    const itemToUpdate = listDetails.items.find(item => item.id === itemId);
    if (!itemToUpdate) return;
    
    try {
      setIsUpdating(true);
      const purchasedAt = purchased ? new Date().toISOString() : null;
      
      // تحديث العنصر في قاعدة البيانات
      const { error } = await supabase
        .from('items')
        .update({
          purchased,
          purchased_at: purchasedAt
        })
        .eq('id', itemId);
      
      if (error) throw error;
      
      // تحديث واجهة المستخدم
      setListDetails({
        ...listDetails,
        items: listDetails.items.map(item => 
          item.id === itemId 
            ? { ...item, purchased, purchased_at: purchasedAt } 
            : item
        )
      });
      
      // إنشاء إشعار عند شراء العنصر
      if (purchased) {
        const notificationRecipient = currentUser === listDetails.creator_username 
          ? listDetails.recipient_username 
          : listDetails.creator_username;
        
        createNotification(
          notificationRecipient,
          `تم شراء "${itemToUpdate.name}" من قائمة التسوق`,
          'ITEM_STATUS',
          itemId,
          listId
        );
      }
      
      toast.success(purchased ? 'تم تحديث حالة العنصر إلى "تم شراؤه"' : 'تم تحديث حالة العنصر إلى "لم يتم شراؤه"');
    } catch (error) {
      console.error('Error updating item status:', error);
      toast.error('حدث خطأ أثناء تحديث حالة العنصر');
    } finally {
      setIsUpdating(false);
    }
  };

  // تحديث حالة القائمة
  const updateListStatus = async (newStatus: string) => {
    if (!listDetails) return;
    
    try {
      setIsUpdating(true);
      
      // تحديث حالة القائمة في قاعدة البيانات
      const { error } = await supabase
        .from('lists')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', listId);
      
      if (error) throw error;
      
      // تحديث واجهة المستخدم
      setListDetails({
        ...listDetails,
        status: newStatus,
        updated_at: new Date().toISOString()
      });
      
      // إنشاء إشعار لمستلم أو منشئ القائمة
      const notificationRecipient = currentUser === listDetails.creator_username 
        ? listDetails.recipient_username 
        : listDetails.creator_username;
      
      let message = '';
      switch (newStatus) {
        case 'completed':
          message = 'تم اكتمال قائمة التسوق الخاصة بك';
          break;
        case 'in_progress':
          message = 'قائمة التسوق الآن قيد التنفيذ';
          break;
        case 'new':
          message = 'تم إعادة تعيين حالة قائمة التسوق الخاصة بك';
          break;
        default:
          message = 'تم تحديث حالة قائمة التسوق الخاصة بك';
      }
      
      createNotification(
        notificationRecipient,
        message,
        'LIST_STATUS',
        null,
        listId
      );
      
      toast.success('تم تحديث حالة القائمة بنجاح');
    } catch (error) {
      console.error('Error updating list status:', error);
      toast.error('حدث خطأ أثناء تحديث حالة القائمة');
    } finally {
      setIsUpdating(false);
    }
  };

  // إنشاء إشعار - تم التعديل لاستدعاء RPC
  const createNotification = async (
    recipientUsername: string, 
    message: string, 
    type: string, 
    itemId: string | null = null, 
    listId: string | null = null
  ) => {
    console.log(`Attempting RPC notification for ${recipientUsername}, type: ${type}`);
    try {
      // --- الخطوة 1: البحث عن معرف المستخدم المستلم --- 
      // نحتاج إلى ID المستلم، ليس فقط الاسم
      const { data: userData, error: userError } = await supabase
        .from('users') 
        .select('id')
        .eq('username', recipientUsername)
        .maybeSingle(); // Use maybeSingle to avoid errors if user not found

      if (userError) {
        console.error('Error finding recipient user for notification:', userError);
        // Don't throw, just log and potentially skip notification
        return; 
      }

      if (!userData) {
        console.error(`Recipient user "${recipientUsername}" not found for notification.`);
        return; // Skip notification if recipient doesn't exist
      }

      const recipientUserId = userData.id;

      // --- الخطوة 2: تحضير واستدعاء دالة RPC --- 
      const params = {
        recipientUserId: recipientUserId,
        message,
        type,
        relatedItemId: itemId,
        relatedListId: listId,
      };

      console.log('Calling create_notification_rpc with params:', params);

      const { data: rpcData, error: rpcError } = await supabase.rpc('create_notification_rpc', { params });

      if (rpcError) {
        console.error('RPC Error creating notification:', rpcError);
      } else if (rpcData?.error) {
        console.error('Function Error creating notification:', rpcData.error, rpcData.details);
      } else {
        console.log('Notification created successfully via RPC:', rpcData);
      }
    } catch (error) {
      // Capture any other unexpected errors
      console.error('Exception in createNotification (RPC call):', error);
    }
  };
  
  return (
    <>
      <div className="p-4 pt-0 pb-20">
        <Header 
          title={isLoading ? 'جاري التحميل...' : `قائمة ${listDetails?.creator_username === currentUser ? 'مرسلة' : 'مستلمة'}`} 
          showBackButton
          extras={
            <div className="flex items-center gap-2">
              <button 
                onClick={() => {
                  setIsRefreshing(true);
                  loadListDetails().finally(() => setIsRefreshing(false));
                }}
                className="flex items-center justify-center p-2 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                disabled={isRefreshing}
                aria-label="تحديث"
              >
                <RefreshCw className={`h-5 w-5 text-blue-600 dark:text-blue-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
              
              {/* زر حذف القائمة - يظهر فقط للمنشئ */}
              {isCreator && !isDeleting && !showDeleteConfirm && (
                <button 
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center justify-center p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                  aria-label="حذف القائمة"
                >
                  <Trash2 className="h-5 w-5 text-red-500 dark:text-red-400" />
                </button>
              )}
            </div>
          } 
        />
        
        {/* تأكيد الحذف */}
        {showDeleteConfirm && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-medium text-red-800 dark:text-red-300">تأكيد حذف القائمة</h3>
                <p className="text-sm text-red-700 dark:text-red-400 mt-1 mb-3">
                  هل أنت متأكد من رغبتك في حذف هذه القائمة؟ سيتم حذف القائمة وجميع العناصر المرتبطة بها نهائياً ولن تظهر للمستلم بعد ذلك.
                </p>
                <div className="flex gap-2">
                  <Button 
                    onClick={deleteEntireList}
                    disabled={isDeleting}
                    className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
                  >
                    {isDeleting ? 'جاري الحذف...' : 'نعم، حذف القائمة'}
                  </Button>
                  <Button 
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeleting}
                    variant="outline" 
                    className="border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400"
                  >
                    إلغاء
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
          
        <div className="mt-8 space-y-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-full">
                <ShoppingCart className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-xl font-semibold dark:text-white">
                تفاصيل القائمة
              </h2>
            </div>
          </div>
          
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 overflow-hidden">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <ShoppingCart className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <h2 className="text-lg font-medium dark:text-white">
                      {isCreator 
                        ? `قائمة إلى ${listDetails.recipient_username}`
                        : `قائمة من ${listDetails.creator_username}`
                      }
                    </h2>
                    {renderStatusBadge(listDetails.status)}
                  </div>
                  
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {new Date(listDetails.created_at).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                </div>
              </div>
              
              {/* شريط التقدم */}
              <div className="mb-6">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600 dark:text-gray-300">تقدم القائمة</span>
                  <span className="font-medium">{completionPercentage}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                  <div 
                    className="bg-blue-600 dark:bg-blue-500 h-2.5 rounded-full transition-all duration-500 ease-in-out" 
                    style={{ width: `${completionPercentage}%` }}
                  ></div>
                </div>
              </div>
              
              {/* قائمة العناصر */}
              <div className="space-y-2">
                <h3 className="font-medium dark:text-white mb-3">قائمة المنتجات ({listDetails.items.length})</h3>
                
                {/* نموذج إضافة منتج جديد - يظهر فقط للمرسل */}
                {isCreator && (
                  <form onSubmit={addNewItem} className="mb-4 flex gap-2">
                    <Input
                      type="text"
                      placeholder="اسم المنتج الجديد"
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      disabled={isAddingItem}
                      className="flex-1"
                    />
                    <Button 
                      type="submit" 
                      disabled={!newItemName.trim() || isAddingItem}
                      className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      <span>إضافة</span>
                    </Button>
                  </form>
                )}
                
                {listDetails.items.length > 0 ? (
                  <ul className="space-y-2">
                    {listDetails.items.map((item) => (
                      <li 
                        key={item.id}
                        className={`border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden transition-all duration-300 ${
                          item.purchased 
                            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-900/50' 
                            : 'bg-white dark:bg-gray-800'
                        }`}
                      >
                        <div className="flex justify-between items-center p-3">
                          <div className="flex items-center gap-3">
                            <Button
                              onClick={() => toggleItemPurchased(item.id, !item.purchased)}
                              disabled={isUpdating || (!isRecipient)}
                              variant={item.purchased ? "default" : "outline"}
                              size="sm"
                              className={`rounded-full h-8 w-8 p-0 flex items-center justify-center ${
                                item.purchased 
                                  ? 'bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800' 
                                  : 'border-gray-300 dark:border-gray-600'
                              } ${!isRecipient ? 'cursor-not-allowed opacity-60' : ''}`}
                              title={isRecipient ? "انقر لتبديل حالة الشراء" : "فقط المستلم يمكنه تحديد حالة الشراء"}
                            >
                              <CheckCircle className={`h-4 w-4 ${item.purchased ? 'text-white' : 'text-gray-400 dark:text-gray-500'}`} />
                            </Button>
                            
                            <div>
                              <span className={`font-medium dark:text-white ${item.purchased ? 'line-through text-gray-500 dark:text-gray-400' : ''}`}>
                                {item.name}
                              </span>
                              {item.purchased && item.purchased_at && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                  تم الشراء: {new Date(item.purchased_at).toLocaleString('en-US', {
                                    year: 'numeric',
                                    month: 'numeric',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          {/* زر حذف المنتج - يظهر فقط للمرسل */}
                          {isCreator && (
                            <Button
                              onClick={() => deleteItem(item.id, item.name)}
                              disabled={isUpdating}
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-center py-8 px-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-gray-500 dark:text-gray-400">لا توجد عناصر في هذه القائمة</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
} 