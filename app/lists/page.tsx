'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/services/supabase';
import { toast, clearAllToasts } from '@/components/ui/toast';
import Header from '@/components/layout/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Clock, CheckCircle, Package, Send, Receipt, Plus, RefreshCw, Trash2, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ShoppingList {
  id: string;
  share_code: string;
  creator_username: string;
  recipient_username: string;
  status: string;
  created_at: string;
  updated_at: string;
  items_count?: number;
  completed_items_count?: number;
  completion_percentage?: number;
}

interface ListItem {
  id: string;
  purchased: boolean;
  name?: string;
}

export default function ListsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState('');
  const [sentLists, setSentLists] = useState<ShoppingList[]>([]);
  const [receivedLists, setReceivedLists] = useState<ShoppingList[]>([]);
  const [tab, setTab] = useState<'sent' | 'received'>('received');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [listToDelete, setListToDelete] = useState<string | null>(null);

  useEffect(() => {
    const checkAuthAndLoadLists = async () => {
      try {
        // التحقق من تسجيل دخول المستخدم
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          toast.info('الرجاء تسجيل الدخول أولاً', 2000);
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
          toast.error('حدث خطأ: لم يتم العثور على اسم المستخدم', 2000);
          router.push('/profile');
          return;
        }
        
        setCurrentUser(username);
        
        // جلب القوائم المرسلة والمستلمة بغض النظر عن التبويب الحالي
        loadSentLists(username);
        loadReceivedLists(username);
      } catch (error) {
        console.error('Error checking auth:', error);
        toast.error('حدث خطأ أثناء التحقق من الحساب', 2000);
        setIsLoading(false);
      }
    };
    
    // مسح الإشعارات السابقة عند تحميل الصفحة
    clearAllToasts();
    checkAuthAndLoadLists();
    
    // التحقق من وجود tab في URL
    const searchParams = new URLSearchParams(window.location.search);
    const tabParam = searchParams.get('tab');
    
    if (tabParam && (tabParam === 'sent' || tabParam === 'received')) {
      setTab(tabParam);
    }
    
    // إعداد اشتراكات Realtime للتحديثات المباشرة (مبسطة)
    const subscription = supabase.channel('lists-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'items',
      }, payload => {
        console.log('تم استلام تحديث مباشر لعنصر:', payload);
        // تحديث القوائم بشكل كامل عند أي تغيير
        if (currentUser) {
          if (tab === 'sent') {
            loadSentLists(currentUser, false);
          } else {
            loadReceivedLists(currentUser, false);
          }
        }
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'lists',
      }, payload => {
        console.log('تم استلام تحديث مباشر لقائمة:', payload);
        // تحديث القوائم بشكل كامل عند أي تغيير
        if (currentUser) {
          if (tab === 'sent') {
            loadSentLists(currentUser, false);
          } else {
            loadReceivedLists(currentUser, false);
          }
        }
      })
      .subscribe();
    
    // التنظيف عند تفكيك المكوّن
    return () => {
      // إلغاء الاشتراك في الـ channel
      supabase.removeChannel(subscription);
      // مسح الإشعارات عند مغادرة الصفحة
      clearAllToasts();
    };
  }, [currentUser, tab, router]);
  
  // جلب القوائم المرسلة
  const loadSentLists = async (username: string, showLoading = true) => {
    try {
      // إظهار حالة التحميل فقط إذا كان مطلوبًا
      if (showLoading) {
        setIsLoading(true);
      }
      
      // جلب القوائم التي أرسلها المستخدم (حيث يكون هو منشئ القائمة)
      const { data: lists, error } = await supabase
        .from('lists')
        .select(`
          *,
          items(id, purchased, name)
        `)
        .eq('creator_username', username) // المستخدم الحالي هو الذي أنشأ القائمة
        .order('created_at', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      // تحويل بنية البيانات لتسهيل استخدامها
      const formattedLists = await Promise.all(lists.map(async list => {
        const itemsArray = list.items as ListItem[] || [];
        const itemsCount = itemsArray.length;
        const completedItemsCount = itemsArray.filter((item: ListItem) => item.purchased).length;
        const completionPercentage = itemsCount > 0 
          ? Math.round((completedItemsCount / itemsCount) * 100) 
          : 0;
        
        // تحديث حالة القائمة بناءً على نسبة الإكمال
        let updatedStatus = list.status;
        
        if (completionPercentage === 100 && list.status !== 'completed') {
          updatedStatus = 'completed';
          
          // تحديث حالة القائمة في قاعدة البيانات
          const { error: updateError } = await supabase
            .from('lists')
            .update({ status: 'completed' })
            .eq('id', list.id);
            
          if (updateError) {
            console.error('فشل تحديث حالة القائمة:', updateError);
          }
        } else if (completionPercentage > 0 && completionPercentage < 100 && list.status === 'new') {
          updatedStatus = 'opened';
          
          // تحديث حالة القائمة في قاعدة البيانات
          const { error: updateError } = await supabase
            .from('lists')
            .update({ status: 'opened' })
            .eq('id', list.id);
            
          if (updateError) {
            console.error('فشل تحديث حالة القائمة:', updateError);
          }
        }
          
        return {
          ...list,
          status: updatedStatus,
          items_count: itemsCount,
          completed_items_count: completedItemsCount,
          completion_percentage: completionPercentage
        };
      }));
      
      setSentLists(formattedLists);
      if (showLoading) {
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error loading sent lists:', error);
      toast.error('حدث خطأ أثناء تحميل القوائم المرسلة', 2000);
      if (showLoading) {
        setIsLoading(false);
      }
    }
  };
  
  // جلب القوائم المستلمة
  const loadReceivedLists = async (username: string, showLoading = true) => {
    try {
      // إظهار حالة التحميل فقط إذا كان مطلوبًا
      if (showLoading) {
        setIsLoading(true);
      }
      
      // جلب القوائم التي استلمها المستخدم (حيث يكون هو المستلم)
      const { data: lists, error } = await supabase
        .from('lists')
        .select(`
          *,
          items(id, purchased, name)
        `)
        .eq('recipient_username', username) // المستخدم الحالي هو المستلم للقائمة
        .order('created_at', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      // تحويل بنية البيانات لتسهيل استخدامها
      const formattedLists = await Promise.all(lists.map(async list => {
        const itemsArray = list.items as ListItem[] || [];
        const itemsCount = itemsArray.length;
        const completedItemsCount = itemsArray.filter((item: ListItem) => item.purchased).length;
        const completionPercentage = itemsCount > 0 
          ? Math.round((completedItemsCount / itemsCount) * 100) 
          : 0;
        
        // تحديث حالة القائمة بناءً على نسبة الإكمال
        let updatedStatus = list.status;
        
        if (completionPercentage === 100 && list.status !== 'completed') {
          updatedStatus = 'completed';
          
          // تحديث حالة القائمة في قاعدة البيانات
          const { error: updateError } = await supabase
            .from('lists')
            .update({ status: 'completed' })
            .eq('id', list.id);
            
          if (updateError) {
            console.error('فشل تحديث حالة القائمة:', updateError);
          }
        } else if (completionPercentage > 0 && completionPercentage < 100 && list.status === 'new') {
          updatedStatus = 'opened';
          
          // تحديث حالة القائمة في قاعدة البيانات
          const { error: updateError } = await supabase
            .from('lists')
            .update({ status: 'opened' })
            .eq('id', list.id);
            
          if (updateError) {
            console.error('فشل تحديث حالة القائمة:', updateError);
          }
        }
          
        return {
          ...list,
          status: updatedStatus,
          items_count: itemsCount,
          completed_items_count: completedItemsCount,
          completion_percentage: completionPercentage
        };
      }));
      
      setReceivedLists(formattedLists);
      if (showLoading) {
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error loading received lists:', error);
      toast.error('حدث خطأ أثناء تحميل القوائم المستلمة', 2000);
      if (showLoading) {
        setIsLoading(false);
      }
    }
  };
  
  // فتح تفاصيل القائمة
  const openListDetails = (listId: string) => {
    router.push(`/lists/${listId}`);
  };
  
  // التنقل إلى صفحة إنشاء قائمة جديدة
  const navigateToCreateList = () => {
    router.push('/create-list');
  };
  
  // عرض حالة القائمة بشكل مرئي
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
  
  // وظيفة تحديث القوائم
  const refreshLists = async () => {
    if (!currentUser || isRefreshing) return;
    
    setIsRefreshing(true);
    
    try {
      // مسح الإشعارات السابقة قبل التحديث
      clearAllToasts();
      
      if (tab === 'sent') {
        await loadSentLists(currentUser);
        toast.success('تم تحديث القوائم المرسلة', 1000);
      } else {
        await loadReceivedLists(currentUser);
        toast.success('تم تحديث القوائم المستلمة', 1000);
      }
    } catch (error) {
      console.error('خطأ في تحديث القوائم:', error);
      toast.error('حدث خطأ أثناء تحديث القوائم', 2000);
    } finally {
      setIsRefreshing(false);
    }
  };
  
  // حذف قائمة بالكامل
  const deleteList = async (listId: string) => {
    if (isDeleting) return;
    
    setIsDeleting(true);
    
    try {
      // حذف جميع عناصر القائمة أولاً
      const { error: itemsError } = await supabase
        .from('items')
        .delete()
        .eq('list_id', listId);
      
      if (itemsError) {
        console.error('خطأ في حذف عناصر القائمة:', itemsError);
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
        console.error('خطأ في حذف القائمة:', listError);
        toast.error('حدث خطأ أثناء حذف القائمة');
        setIsDeleting(false);
        return;
      }
      
      // تحديث القوائم المحلية بعد الحذف
      setSentLists(prevLists => prevLists.filter(list => list.id !== listId));
      
      toast.success('تم حذف القائمة بنجاح');
    } catch (error) {
      console.error('خطأ أثناء حذف القائمة:', error);
      toast.error('حدث خطأ غير متوقع أثناء حذف القائمة');
    } finally {
      setIsDeleting(false);
      setListToDelete(null);
    }
  };
  
  // عنصر تحميل
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
  
  // عرض رسالة إذا لم تكن هناك قوائم
  const EmptyListsMessage = ({ type }: { type: 'sent' | 'received' }) => (
    <div className="flex flex-col items-center justify-center py-10 px-4 rounded-xl text-center bg-gray-50 dark:bg-gray-800 border border-dashed border-gray-200 dark:border-gray-700">
      <ShoppingCart className="h-12 w-12 text-gray-400 dark:text-gray-500 mb-3" />
      <h3 className="text-lg font-medium text-gray-600 dark:text-gray-300 mb-2">
        {type === 'sent' ? 'لم تقم بإرسال أي قوائم بعد' : 'لم تستلم أي قوائم بعد'}
      </h3>
      <p className="text-gray-500 dark:text-gray-400 mb-4 max-w-md">
        {type === 'sent'
          ? 'قم بإنشاء قائمة جديدة واختر جهة اتصال لإرسالها إليها'
          : 'عندما يرسل لك الأصدقاء قوائم التسوق، ستظهر هنا'}
      </p>
      {type === 'sent' && (
        <Button 
          onClick={navigateToCreateList}
          className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
        >
          <Plus className="h-4 w-4 mr-1" />
          <span>إنشاء قائمة جديدة</span>
        </Button>
      )}
    </div>
  );
  
  // عرض بطاقة القائمة
  const ListCard = ({ list, isSent }: { list: ShoppingList, isSent: boolean }) => {
    // استخدام قيمة الإكمال المحسوبة من القائمة
    const itemsCount = list.items_count || 0;
    const completedItemsCount = list.completed_items_count || 0;
    const completionPercentage = list.completion_percentage || 0;
    
    // تحديد الحالة النصية بناءً على النسبة المئوية
    let statusText = 'جديدة';
    if (completionPercentage === 100) {
      statusText = 'مكتملة';
    } else if (completionPercentage > 0) {
      statusText = 'قيد التنفيذ';
    }
    
    // معالج النقر على زر الحذف
    const handleDeleteClick = (e: React.MouseEvent) => {
      e.stopPropagation(); // منع انتقال الحدث لفتح التفاصيل
      setListToDelete(list.id);
    };
    
    return (
      <Card 
        className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-300 overflow-hidden cursor-pointer relative"
        onClick={() => openListDetails(list.id)}
      >
        <CardContent className="p-4">
          <div className="flex flex-col space-y-4">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-full">
                  {isSent ? (
                    <Send className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  ) : (
                    <Receipt className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  )}
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">
                    {isSent 
                      ? `قائمة إلى ${list.recipient_username}`
                      : `قائمة من ${list.creator_username}`
                    }
                  </h3>
                  <div className="flex items-center gap-2 mt-1 text-sm text-gray-500 dark:text-gray-400">
                    <ShoppingCart className="h-4 w-4" />
                    <span>{itemsCount} منتجات</span>
                    {completedItemsCount > 0 && (
                      <>
                        <span className="mx-1">•</span>
                        <span>{completedItemsCount} تم شراؤها</span>
                      </>
                    )}
                    <span className="mx-1">•</span>
                    <span>{new Date(list.created_at).toLocaleDateString('ar-SA')}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {/* زر حذف القائمة - يظهر فقط للقوائم المرسلة */}
                {isSent && (
                  <button
                    onClick={handleDeleteClick}
                    className="p-1.5 rounded-full text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    title="حذف القائمة"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
                
                {/* عرض بادج الحالة بجانب العنوان حتى تظل مرئية */}
                <div>
                  {renderStatusBadge(list.status)}
                </div>
              </div>
            </div>
            
            {/* إضافة شريط التقدم */}
            <div className="mt-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-600 dark:text-gray-300">
                  {statusText}
                </span>
                <span className="font-medium">{completionPercentage}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                <div 
                  className={`h-1.5 rounded-full transition-all duration-500 ease-in-out ${
                    completionPercentage === 100 
                      ? 'bg-green-500 dark:bg-green-600' 
                      : completionPercentage > 0 
                        ? 'bg-yellow-500 dark:bg-yellow-600' 
                        : 'bg-blue-500 dark:bg-blue-600'
                  }`}
                  style={{ width: `${completionPercentage}%` }}
                ></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };
  
  return (
    <div className="container mx-auto p-4 pt-0 pb-20">
      <Header title="قوائم التسوق" showCreateButton />
      
      {/* تأكيد حذف القائمة */}
      {listToDelete && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-6 w-6 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-lg font-medium text-red-800 dark:text-red-300 mb-2">تأكيد حذف القائمة</h3>
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  هل أنت متأكد من رغبتك في حذف هذه القائمة؟ سيتم حذف القائمة وجميع العناصر المرتبطة بها نهائياً.
                </p>
                <div className="flex gap-2 justify-end">
                  <Button 
                    onClick={() => deleteList(listToDelete)}
                    disabled={isDeleting}
                    className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
                  >
                    {isDeleting ? 'جاري الحذف...' : 'نعم، حذف القائمة'}
                  </Button>
                  <Button 
                    onClick={() => setListToDelete(null)}
                    disabled={isDeleting}
                    variant="outline" 
                    className="border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300"
                  >
                    إلغاء
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold dark:text-white">
            {tab === 'sent' ? 'القوائم المرسلة' : 'القوائم المستلمة'}
          </h2>
          <Button
            onClick={refreshLists}
            variant="outline"
            className="flex items-center gap-1"
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>تحديث</span>
          </Button>
        </div>
        
        <Tabs 
          defaultValue="received" 
          value={tab}
          className="w-full" 
          onValueChange={(value) => {
            // تعيين التبويب الجديد
            const newTab = value as 'sent' | 'received';
            setTab(newTab);
            
            // تحديث عنوان URL بدون إعادة تحميل الصفحة
            const url = new URL(window.location.href);
            url.searchParams.set('tab', newTab);
            window.history.pushState({}, '', url.toString());
          }}
        >
          <TabsList className="w-full flex mb-6 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
            <TabsTrigger
              value="received"
              className="flex-1 data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-lg py-2.5"
            >
              <Receipt className="h-4 w-4 mr-1" />
              <span>مستلمة</span>
              <Badge className="ml-1.5 bg-blue-500/20 text-blue-800 dark:bg-blue-500/30 dark:text-blue-200">
                {receivedLists.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="sent"
              className="flex-1 data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-lg py-2.5"
            >
              <Send className="h-4 w-4 mr-1" />
              <span>مرسلة</span>
              <Badge className="ml-1.5 bg-blue-500/20 text-blue-800 dark:bg-blue-500/30 dark:text-blue-200">
                {sentLists.length}
              </Badge>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="sent" className="space-y-4 mt-0">
            {sentLists.length > 0 ? (
              <>
                <div className="flex justify-between items-center mb-3">
                  <h2 className="text-lg font-medium dark:text-white">القوائم المرسلة</h2>
                  <Button 
                    onClick={navigateToCreateList}
                    variant="ghost" 
                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    <span>إنشاء قائمة</span>
                  </Button>
                </div>
                <div className="grid gap-4">
                  {sentLists.map(list => (
                    <ListCard key={list.id} list={list} isSent={true} />
                  ))}
                </div>
              </>
            ) : (
              <EmptyListsMessage type="sent" />
            )}
          </TabsContent>
          
          <TabsContent value="received" className="space-y-4 mt-0">
            {receivedLists.length > 0 ? (
              <>
                <h2 className="text-lg font-medium dark:text-white mb-3">القوائم المستلمة</h2>
                <div className="grid gap-4">
                  {receivedLists.map(list => (
                    <ListCard key={list.id} list={list} isSent={false} />
                  ))}
                </div>
              </>
            ) : (
              <EmptyListsMessage type="received" />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
} 