'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { supabase } from '@/services/supabase';
import { toast, clearAllToasts } from '@/components/ui/toast';
import Header from '@/components/layout/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Clock, CheckCircle, Package, ArrowLeft, Share2, Trash2, RefreshCw, Plus, AlertCircle } from 'lucide-react';
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
        // إنشاء قناة لتحديثات القائمة والعناصر
        const channel = supabase
          .channel(`list-updates-${listId}`, {
            config: {
              broadcast: { self: true },
              presence: { key: `user-${currentUser}` }
            }
          })
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'lists',
              filter: `id=eq.${listId}`
            },
            (payload) => {
              console.log(`تم استلام تحديث مباشر لقائمة المشتريات ${listId}:`, payload);
              
              // تحديث حالة القائمة مباشرة دون إعادة تحميل كاملة
              if (payload.eventType === 'UPDATE' && payload.new) {
                setListDetails((prevDetails) => {
                  if (!prevDetails) return prevDetails;
                  
                  // تحديث حالة القائمة بالبيانات الجديدة
                  const newListData = payload.new as any;
                  
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
              
              if (payload.eventType === 'UPDATE' && payload.new) {
                // تحديث العنصر المحدد مباشرة في الحالة المحلية
                const updatedItem = payload.new as any;
                
                setListDetails((prevDetails) => {
                  if (!prevDetails) return prevDetails;
                  
                  // تحديث العنصر في القائمة المحلية
                  const updatedItems = prevDetails.items.map((item) => {
                    if (item.id === updatedItem.id) {
                      // عرض إشعار إذا تغيرت حالة الشراء
                      if (item.purchased !== updatedItem.purchased) {
                        // تحديد من قام بالتغيير (إذا كان شخص آخر)
                        const isCurrentUserCreator = prevDetails.creator_username === currentUser;
                        const isCurrentUserRecipient = prevDetails.recipient_username === currentUser;
                        const updaterTitle = isCurrentUserCreator 
                          ? 'المُرسِل' 
                          : isCurrentUserRecipient 
                            ? 'المُستلِم'
                            : 'شخص ما';
                        
                        const userTitle = updaterTitle === currentUser ? 'أنت' : updaterTitle;
                        
                        if (updatedItem.purchased) {
                          toast.success(`تم شراء "${item.name}" بواسطة ${userTitle}`, 1500);
                        } else {
                          toast.info(`تم إلغاء شراء "${item.name}" بواسطة ${userTitle}`, 1500);
                        }
                      }
                      
                      // إرجاع العنصر المحدث
                      return {
                        ...item,
                        ...updatedItem
                      };
                    }
                    
                    return item;
                  });
                  
                  return {
                    ...prevDetails,
                    items: updatedItems
                  };
                });
              } else if (payload.eventType === 'INSERT' && payload.new) {
                // إضافة العنصر الجديد إلى القائمة
                const newItem = payload.new as any;
                
                setListDetails((prevDetails) => {
                  if (!prevDetails) return prevDetails;
                  
                  // عرض إشعار بإضافة عنصر جديد
                  toast.info(`تمت إضافة "${newItem.name}" إلى القائمة`, 1500);
                  
                  // إضافة العنصر إلى القائمة المحلية
                  return {
                    ...prevDetails,
                    items: [...prevDetails.items, newItem]
                  };
                });
              } else if (payload.eventType === 'DELETE' && payload.old) {
                // حذف العنصر من القائمة
                const deletedItem = payload.old as any;
                
                setListDetails((prevDetails) => {
                  if (!prevDetails) return prevDetails;
                  
                  // عرض إشعار بحذف العنصر
                  toast.info(`تم حذف "${deletedItem.name}" من القائمة`, 1500);
                  
                  // حذف العنصر من القائمة المحلية
                  return {
                    ...prevDetails,
                    items: prevDetails.items.filter(item => item.id !== deletedItem.id)
                  };
                });
              }
            }
          );
        
        // اشتراك في القناة
        channel.subscribe((status) => {
          console.log(`حالة اشتراك Realtime: ${status}`);
        });
        
        // إلغاء الاشتراك عند مغادرة الصفحة
        return () => {
          channel.unsubscribe();
        };
      } catch (error) {
        console.error('حدث خطأ أثناء إعداد اشتراك Realtime:', error);
      }
    };
    
    if (currentUser) {
      setupRealtimeSubscription();
    }
  }, [currentUser, listId, router]);
  
  const loadListDetails = async () => {
    setIsLoading(true);
    
    try {
      if (!listId) {
        toast.error('معرّف القائمة غير صالح');
        router.push('/lists');
        return;
      }
      
      // جلب تفاصيل القائمة
      const { data: listData, error: listError } = await supabase
        .from('lists')
        .select('*')
        .eq('id', listId)
        .single();
      
      if (listError) {
        throw listError;
      }
      
      if (!listData) {
        toast.error('لم يتم العثور على القائمة المطلوبة');
        router.push('/lists');
        return;
      }
      
      // جلب عناصر القائمة
      const { data: itemsData, error: itemsError } = await supabase
        .from('items')
        .select('*')
        .eq('list_id', listId)
        .order('created_at', { ascending: true });
      
      if (itemsError) {
        throw itemsError;
      }
      
      // دمج البيانات
      const fullListDetails: ListDetails = {
        ...listData,
        items: itemsData || []
      };
      
      setListDetails(fullListDetails);
    } catch (error) {
      console.error('Error loading list details:', error);
      toast.error('حدث خطأ أثناء تحميل تفاصيل القائمة');
    } finally {
      setIsLoading(false);
    }
  };

  // ... REST OF THE IMPLEMENTATION ...
} 