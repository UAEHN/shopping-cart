'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { supabase } from '@/services/supabase';
import { toast, clearAllToasts } from '@/components/ui/toast';
import Header from '@/components/layout/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Clock, CheckCircle, Package, ArrowLeft, Trash2, RefreshCw, Plus, AlertCircle, MessageSquare, Send, X, Image, Camera } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { createNotification } from '@/utils/notifications';
import { useListMessagesRealtime } from '@/hooks/useRealtime';
import React from 'react';
import { cn } from '@/lib/utils';
import imageCompression from 'browser-image-compression';


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

// تحسين عرض الصورة في النافذة المنبثقة
function ImagePreviewModal({ 
  imageUrl, 
  isOpen, 
  onClose 
}: { 
  imageUrl: string; 
  isOpen: boolean; 
  onClose: () => void;
}) {
  // إضافة مرجع للنافذة المنبثقة للتعامل مع النقر خارجها
  const modalRef = useRef<HTMLDivElement>(null);
  // إضافة متغير حالة لتتبع نسبة التكبير/التصغير
  const [scale, setScale] = useState(1);

  // إغلاق النافذة المنبثقة عند الضغط على زر Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden'; // منع التمرير في الخلفية
    }
    
    return () => {
      window.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = ''; // استعادة التمرير
    };
  }, [isOpen, onClose]);

  // تحسين دالة إغلاق النافذة المنبثقة عند النقر خارج الصورة
  const handleOutsideClick = (e: React.MouseEvent) => {
    // إغلاق النافذة عند النقر على أي مكان خارج الصورة والأزرار
    if (
      e.target === e.currentTarget ||  // النقر على الخلفية السوداء
      !(modalRef.current?.contains(e.target as Node))
    ) {
      onClose();
    }
  };

  // دالة زيادة التكبير
  const zoomIn = () => {
    setScale(prev => Math.min(prev + 0.25, 3)); // الحد الأقصى 3x
  };

  // دالة تقليل التكبير
  const zoomOut = () => {
    setScale(prev => Math.max(prev - 0.25, 0.5)); // الحد الأدنى 0.5x
  };

  // دالة إعادة ضبط حجم الصورة
  const resetZoom = () => {
    setScale(1);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-2 animate-in fade-in duration-300"
      onClick={handleOutsideClick}
    >
      <div 
        className="absolute top-2 right-2 flex gap-1 z-10"
      >
        {/* أزرار التكبير/التصغير */}
        <Button
          onClick={(e) => {
            e.stopPropagation(); // منع انتشار الحدث للعناصر الأب
            zoomIn();
          }}
          size="sm"
          variant="outline"
          className="bg-white/20 hover:bg-white/30 text-white border-0 rounded-full h-8 w-8 p-0"
          title="تكبير"
        >
          <span className="text-xl font-bold">+</span>
        </Button>
        <Button
          onClick={(e) => {
            e.stopPropagation(); // منع انتشار الحدث للعناصر الأب
            zoomOut();
          }}
          size="sm"
          variant="outline"
          className="bg-white/20 hover:bg-white/30 text-white border-0 rounded-full h-8 w-8 p-0"
          title="تصغير"
        >
          <span className="text-xl font-bold">-</span>
        </Button>
        <Button
          onClick={(e) => {
            e.stopPropagation(); // منع انتشار الحدث للعناصر الأب
            resetZoom();
          }}
          size="sm"
          variant="outline"
          className="bg-white/20 hover:bg-white/30 text-white border-0 rounded-full h-8 w-8 p-0"
          title="إعادة ضبط"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
            <path d="M3 3v5h5"></path>
            <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path>
            <path d="M16 21h5v-5"></path>
          </svg>
        </Button>
        <Button
          onClick={(e) => {
            e.stopPropagation(); // منع انتشار الحدث للعناصر الأب
            onClose();
          }}
          size="sm"
          variant="outline"
          className="bg-white/20 hover:bg-white/30 text-white border-0 rounded-full h-8 w-8 p-0"
          title="إغلاق"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>
      
      {/* المعلومات أسفل الصورة */}
      <div 
        className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-black/50 px-3 py-1 rounded-full text-white text-sm z-10"
        onClick={(e) => e.stopPropagation()} // منع انتشار الحدث للعناصر الأب
      >
        {Math.round(scale * 100)}%
      </div>
      
      <div 
        ref={modalRef}
        className="relative flex items-center justify-center w-full h-full"
      >
        <div 
          className="bg-transparent transition-all duration-300 ease-in-out max-w-[90%] max-h-[90%] overflow-hidden"
          style={{ 
            boxShadow: '0 0 20px rgba(0, 0, 0, 0.3)'
          }}
          onClick={(e) => e.stopPropagation()} // منع انتشار الحدث للعناصر الأب عند النقر على الصورة نفسها
        >
          <img 
            src={imageUrl} 
            alt="صورة معروضة" 
            className="w-auto h-auto max-w-full max-h-[85vh] object-contain transition-transform duration-300 ease-in-out"
            style={{ 
              transform: `scale(${scale})`,
              transformOrigin: 'center center'
            }}
          />
        </div>
      </div>
    </div>
  );
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
    
    // --- إعداد اشتراك Realtime --- 
      if (!listId) return;
      
    console.log(`إعداد اشتراك الوقت الفعلي لقائمة: ${listId}`);
      
        const channel = supabase
          .channel(`list-updates-${listId}`)
          .on(
            'postgres_changes',
            {
          event: '*', // Listen to INSERT, UPDATE, DELETE for items
              schema: 'public',
              table: 'items',
              filter: `list_id=eq.${listId}`
            },
            (payload) => {
          console.log(`تحديث Realtime لـ items في القائمة ${listId}:`, payload);
              
                setListDetails((prevDetails) => {
                  if (!prevDetails) return prevDetails;
                  
            let updatedItems = [...prevDetails.items];
            let statusChanged = false;
            let newStatus = prevDetails.status;

            if (payload.eventType === 'INSERT') {
              const newItem = payload.new as ListItem;
              if (!updatedItems.some(item => item.id === newItem.id)) {
                updatedItems.push(newItem);
                  toast.info(`تمت إضافة منتج جديد: ${newItem.name}`, 1500);
              }
            } else if (payload.eventType === 'UPDATE') {
              const updatedItem = payload.new as ListItem;
              updatedItems = updatedItems.map(item => 
                item.id === updatedItem.id ? { ...item, ...updatedItem } : item
              );
              // We removed the toast for purchase status change from here
            } else if (payload.eventType === 'DELETE') {
              const deletedItemId = payload.old.id;
              updatedItems = updatedItems.filter(item => item.id !== deletedItemId);
            }

            // Recalculate list status based on the potentially updated items list
            if (updatedItems.length > 0) {
              const allPurchased = updatedItems.every(item => item.purchased);
              const anyPurchased = updatedItems.some(item => item.purchased);

              if (allPurchased) {
                    newStatus = 'completed';
                  } else if (anyPurchased) {
                newStatus = 'opened'; // Or 'in_progress', ensure consistency later
                  } else {
                    newStatus = 'new';
                  }
            } else {
              // If no items left, maybe set status to 'new' or keep as is?
              newStatus = 'new'; // Or prevDetails.status
            }

            statusChanged = newStatus !== prevDetails.status;

            // IMPORTANT: DO NOT update the database from here.
            // Only update the local state.
                  return {
                    ...prevDetails,
              items: updatedItems,
              status: newStatus // Update local status
                  };
                });
            }
          )
          .on(
            'postgres_changes',
            {
          event: 'UPDATE', // Only listen to UPDATE for lists
              schema: 'public',
              table: 'lists',
              filter: `id=eq.${listId}`
            },
            (payload) => {
          console.log(`تحديث Realtime لـ lists للقائمة ${listId}:`, payload);
          const updatedList = payload.new as ListDetails;
          setListDetails(prevDetails => {
            if (!prevDetails || prevDetails.status === updatedList.status) {
              return prevDetails; // No relevant change in status
            }
            // Show toast for status change initiated by the *other* user
            toast.info(`تم تحديث حالة القائمة إلى: ${updatedList.status}`); 
                  return {
                    ...prevDetails,
              status: updatedList.status, 
              updated_at: updatedList.updated_at 
                  };
                });
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log(`تم الاشتراك بنجاح في قناة الوقت الفعلي: list-updates-${listId}`);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error(`خطأ في قناة الوقت الفعلي ${listId}:`, status, err);
          toast.error('حدث خطأ في الاتصال بالتحديثات المباشرة');
        }
      });

    // --- Cleanup on unmount --- 
        return () => {
      console.log(`إلغاء اشتراك الوقت الفعلي للقائمة: ${listId}`);
      if (channel) {
        supabase.removeChannel(channel).catch(error => {
          console.error('Error removing Supabase channel:', error);
        });
      }
      clearAllToasts();
    };
  }, [listId, router, currentUser, loadListDetails]); // Added dependencies
  
  // تبديل حالة الشراء للعنصر
  const toggleItemPurchase = async (itemId: string, purchased: boolean) => {
    if (!listDetails || !currentUser) return;
    
    const itemToUpdate = listDetails.items.find(item => item.id === itemId);
    if (!itemToUpdate) return;
    
    const actorUsername = currentUser;

    // Capture the state *before* the toggle to calculate the new list status later
    const itemsBeforeToggle = [...listDetails.items]; 
    
    try {
      setIsUpdating(true);

      // Get current user ID for purchased_by
      const { data: { user } } = await supabase.auth.getUser();
      const currentUserId = user?.id; // It should exist if user is on this page

      // تحديث العنصر في قاعدة البيانات
      const { data: updatedItemData, error: itemUpdateError } = await supabase
        .from('items')
        .update({
          purchased: purchased,
          purchased_at: purchased ? new Date().toISOString() : null,
          // إضافة معرف المستخدم الذي قام بالشطب، أو null إذا تم إلغاء الشطب
          purchased_by: purchased ? currentUserId : null 
        })
        .eq('id', itemId)
        .select() // Get the updated item back
        .single();

      if (itemUpdateError) {
        console.error('Error updating item:', itemUpdateError);
        toast.error(`حدث خطأ أثناء تحديث العنصر: ${itemUpdateError.message || 'خطأ غير معروف'}`, 2000);
        setIsUpdating(false);
        return;
      }
      
      // 2. Update local UI state for the item immediately
      const updatedItemsLocally = itemsBeforeToggle.map(item => 
          item.id === itemId 
            ? { ...item, purchased, purchased_at: purchased ? new Date().toISOString() : null } 
            : item
      );
      setListDetails(prev => prev ? { ...prev, items: updatedItemsLocally } : null);
      toast.success(purchased ? 'تم تحديث حالة العنصر إلى "تم شراؤه"' : 'تم تحديث حالة العنصر إلى "لم يتم شراؤه"');
      
      // --- 4. Calculate new list status and update if changed --- 
      const currentListStatus = listDetails.status;
      let newListStatus = currentListStatus;
      if (updatedItemsLocally.length > 0) {
          const allPurchased = updatedItemsLocally.every(item => item.purchased);
          const anyPurchased = updatedItemsLocally.some(item => item.purchased);
          if (allPurchased) newListStatus = 'completed';
          else if (anyPurchased) newListStatus = 'opened'; // Or 'in_progress'
          else newListStatus = 'new';
      } else {
          newListStatus = 'new'; // If list becomes empty
      }

      if (newListStatus !== currentListStatus) {
        console.log(`List status changed from ${currentListStatus} to ${newListStatus}. Updating DB.`);
        
        // 4a. Update list status in DB
        const { error: listStatusUpdateError } = await supabase
          .from('lists')
          .update({ status: newListStatus, updated_at: new Date().toISOString() })
          .eq('id', listId);

        if (listStatusUpdateError) {
          console.error('Error updating list status in DB:', listStatusUpdateError);
          // Don't return here - we still want to update the UI and finish the toggle function
          toast.error(`حدث خطأ أثناء تحديث حالة القائمة: ${listStatusUpdateError.message}`, 1500);
        } else {
           // Update local state for status as well (redundant if realtime works, but safe)
           setListDetails(prev => prev ? { ...prev, status: newListStatus } : null);
        }
      }
      // --- End List Status Update Logic ---

    } catch (error) {
      console.error('Error in toggleItemPurchase:', error);
      const errorMessage = error instanceof Error ? error.message : 'حدث خطأ غير معروف';
      toast.error(`حدث خطأ أثناء تحديث العنصر أو حالة القائمة: ${errorMessage}`);
      // Consider reverting local state update on error if needed
    } finally {
      setIsUpdating(false);
    }
  };
  
  // العودة إلى قائمة القوائم
  const goBack = () => {
    router.push('/lists');
  };
  
  // إضافة منتج جديد للقائمة
  const addItemToList = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newItemName.trim() || !listDetails || isAddingItem) return;
    
    // Get actor username (the one adding the item)
    const actorUsername = currentUser;
    
    setIsAddingItem(true);
    
    try {
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
      
      // --- إنشاء إشعار لمستلم القائمة --- 
      // Check if the actor is not the recipient before sending notification
      // REMOVED: Direct notification creation from frontend
      // if (actorUsername !== listDetails.recipient_username) {
      //   const notificationRecipientUsername = listDetails.recipient_username;
      //   
      //   // Fetch recipient user data
      //   const { data: recipientData, error: userError } = await supabase
      //     .from('users') 
      //     .select('id, username')
      //     .eq('username', notificationRecipientUsername)
      //     .maybeSingle();
      // 
      //   if (userError) {
      //     console.error('Error finding notification recipient user for new item:', userError);
      //   } else if (!recipientData) {
      //     console.error(`Notification recipient user "${notificationRecipientUsername}" not found for new item.`);
      //   } else {
      //     // Only send if recipient found
      //     createNotification(
      //       recipientData, // Pass the user object
      //       `${actorUsername} أضاف "${newItemName.trim()}" إلى قائمة التسوق`,
      //       'NEW_ITEM', // Use a specific type
      //       newItem.id,
      //       listId
      //     );
      //   }
      // }
      // --- نهاية إنشاء الإشعار ---
      
      setNewItemName('');
      toast.success('تمت إضافة العنصر بنجاح');
    } catch (error) {
      console.error('Error adding item:', error);
      toast.error('حدث خطأ أثناء إضافة العنصر');
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

  // تحديث حالة القائمة
  const updateListStatus = async (newStatus: string) => {
    // Ensure listDetails and current user are available
    if (!listDetails || !currentUser) return;

    // Capture current list details before update for notification logic
    const currentCreator = listDetails.creator_username;
    const currentRecipient = listDetails.recipient_username;
    const actorUsername = currentUser; // User performing the action
    
    try {
      setIsUpdating(true);
      
      // تحديث حالة القائمة في قاعدة البيانات
      const { error: updateError } = await supabase
        .from('lists')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', listId);
      
      if (updateError) throw updateError;
      
      // تحديث واجهة المستخدم المحلية (يمكن القيام به هنا أو الاعتماد على Realtime)
      setListDetails(prevDetails => prevDetails ? {
        ...prevDetails,
        status: newStatus,
        updated_at: new Date().toISOString()
      } : null);
      
      // --- إنشاء إشعار لمستلم أو منشئ القائمة --- 
      // Determine recipient based on captured current list details
      const recipientUsername = actorUsername === currentCreator 
        ? currentRecipient 
        : currentCreator;
      
      // Fetch recipient user data
      const { data: recipientData, error: userError } = await supabase
        .from('users') 
        .select('id, username')
        .eq('username', recipientUsername)
        .maybeSingle();

      if (userError) {
        console.error('Error finding notification recipient user for list status update:', userError);
      } else if (!recipientData) {
        console.error(`Notification recipient user "${recipientUsername}" not found for list status update.`);
      } else {
        // Only send if recipient found
      let message = '';
      switch (newStatus) {
        case 'completed':
            message = `قام ${actorUsername} بإكمال قائمة التسوق`;
          break;
          case 'in_progress': // Assuming 'opened' state means 'in_progress'
            message = `بدأ ${actorUsername} العمل على قائمة التسوق`;
          break;
        case 'new':
             message = `قام ${actorUsername} بإعادة تعيين حالة قائمة التسوق`;
          break;
        default:
            message = `قام ${actorUsername} بتحديث حالة القائمة إلى ${newStatus}`;
      }
      
      createNotification(
          recipientData, // Pass the user object
        message,
          'LIST_STATUS', // Use a specific type
        null,
        listId
      );
      }
      // --- نهاية إنشاء الإشعار ---
      
      toast.success('تم تحديث حالة القائمة بنجاح');
    } catch (error) {
      console.error('Error updating list status:', error);
      toast.error('حدث خطأ أثناء تحديث حالة القائمة');
    } finally {
      setIsUpdating(false);
    }
  };
  
  return (
    <div className="container max-w-3xl mx-auto px-4 pb-20">
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
        
      <div className="p-4 pt-0 pb-20">
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
                  <form onSubmit={addItemToList} className="mb-4 flex gap-2">
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
                              onClick={() => toggleItemPurchase(item.id, !item.purchased)}
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

      {/* --- إضافة المكون الجديد هنا --- */}
      {listDetails && <MessageSection listId={listId} currentUser={currentUser} />}

    </div>
  );
}

// --- تعريف المكون الجديد --- 
function MessageSection({ listId, currentUser }: { listId: string; currentUser: string }) {
  const [newMessage, setNewMessage] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const { messages, isLoading: isLoadingMessages } = useListMessagesRealtime(listId);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [imageCaption, setImageCaption] = useState<string>('');
  const [compressionProgress, setCompressionProgress] = useState<number>(0);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadedCount, setUploadedCount] = useState<number>(0);

  const inputRef = React.useRef<HTMLInputElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const messagesContainerRef = React.useRef<HTMLDivElement>(null);
  const isInitialLoad = React.useRef(true);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  React.useEffect(() => {
    if (isInitialLoad.current || isLoadingMessages) {
      if (!isLoadingMessages) {
        isInitialLoad.current = false;
      }
      return;
    }

    const timerId = setTimeout(() => scrollToBottom('smooth'), 100);
    return () => clearTimeout(timerId);
  }, [messages.length, isLoadingMessages]);

  const compressImage = async (file: File): Promise<File> => {
    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 1200,
      useWebWorker: true,
      onProgress: (progress: number) => {
        setCompressionProgress(progress);
      },
      initialQuality: 0.7,
      alwaysKeepResolution: false,
    };

    try {
      console.log(`Original image size: ${file.size / 1024 / 1024} MB`);

      const compressedFile = await imageCompression(file, options);
      
      console.log(`Compressed image size: ${compressedFile.size / 1024 / 1024} MB`);
      console.log(`Compression ratio: ${(file.size / compressedFile.size).toFixed(2)}x`);
      
      const compressedFileWithExtension = new File(
        [compressedFile], 
        file.name, 
        { type: compressedFile.type }
      );
      
      return compressedFileWithExtension;
    } catch (error) {
      console.error('Error compressing image:', error);
      return file;
    } finally {
      setCompressionProgress(0);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    
    const totalImages = selectedImages.length + fileArray.length;
    if (totalImages > 5) {
      toast.error('يمكنك إرسال 5 صور كحد أقصى في المرة الواحدة');
      fileArray.splice(0, 5 - selectedImages.length);
    }

    setSelectedImages(prevImages => [...prevImages, ...fileArray]);

    fileArray.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviewUrls(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleCancelSingleImage = (index: number) => {
    setSelectedImages(prevImages => {
      const newImages = [...prevImages];
      newImages.splice(index, 1);
      return newImages;
    });

    setImagePreviewUrls(prevPreviews => {
      const newPreviews = [...prevPreviews];
      newPreviews.splice(index, 1);
      return newPreviews;
    });
  };

  const handleCancelAllImages = () => {
    setSelectedImages([]);
    setImagePreviewUrls([]);
    setImageCaption('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCapturePhoto = () => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = 'image/*';
      fileInputRef.current.capture = 'environment';
      fileInputRef.current.multiple = true;
      fileInputRef.current.click();
    }
  };

  const handleOpenGallery = () => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = 'image/*';
      fileInputRef.current.removeAttribute('capture');
      fileInputRef.current.multiple = true;
      fileInputRef.current.click();
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const messageText = newMessage.trim();
    const captionText = imageCaption.trim();
    
    if ((!messageText && selectedImages.length === 0) || isSendingMessage || isUploadingImage) return;

    setNewMessage('');
    setIsSendingMessage(true);
    inputRef.current?.focus();

    try {
      const { data: authUserData } = await supabase.auth.getUser();
      
      const { data: listDetails } = await supabase
        .from('lists')
        .select('creator_username, recipient_username, creator_id, recipient_id')
        .eq('id', listId)
        .single();

      if (!listDetails) throw new Error('List details not found for notification.');
      
      const recipientUsername = currentUser === listDetails.creator_username
        ? listDetails.recipient_username
        : listDetails.creator_username;

      const imageUrls: string[] = [];

      if (selectedImages.length > 0) {
        setIsUploadingImage(true);
        setUploadedCount(0);
        
        try {
          const compressPromises = selectedImages.map(image => compressImage(image));
          
          toast.info('جاري ضغط الصور...', 3000);
          const compressedImages = await Promise.all(compressPromises);
          
          const totalImages = compressedImages.length;
          
          const uploadPromises = compressedImages.map(async (compressedImage, index) => {
            const fileExt = compressedImage.name.split('.').pop();
            const fileName = `${listId}/${Date.now()}_${index}.${fileExt}`;
            
            const { data: fileData, error: uploadError } = await supabase
              .storage
              .from('message_images')
              .upload(fileName, compressedImage, {
                cacheControl: '3600',
                upsert: false
              });
              
            if (uploadError) {
              console.error(`Error uploading image ${index + 1}:`, uploadError);
              throw uploadError;
            }
            
            if (fileData) {
              const { data: urlData } = await supabase
                .storage
                .from('message_images')
                .getPublicUrl(fileName);
                
              setUploadedCount(prev => prev + 1);
              setUploadProgress(((index + 1) / totalImages) * 100);
              
              return urlData?.publicUrl || null;
            }
            
            return null;
          });
          
          const urls = await Promise.all(uploadPromises);
          
          imageUrls.push(...urls.filter(url => url !== null) as string[]);
          
        } catch (imageError) {
          console.error('Error in image upload process:', imageError);
          toast.error('حدث خطأ أثناء رفع الصور');
          setIsUploadingImage(false);
          setIsSendingMessage(false);
        return;
      }
      
        setIsUploadingImage(false);
        setSelectedImages([]);
        setImagePreviewUrls([]);
        setImageCaption('');
        setUploadProgress(0);
        setUploadedCount(0);
        
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }

      if (imageUrls.length > 0) {
        try {
          const firstImageText = messageText || (captionText ? captionText : 'صورة');
          
          const { error: firstInsertError } = await supabase
            .from('messages')
            .insert({ 
              list_id: listId, 
              sender_username: currentUser, 
              text: firstImageText,
              image_url: imageUrls[0]
            });
  
          if (firstInsertError) {
            console.error('Database insert error:', firstInsertError);
            throw firstInsertError;
          }
          
          if (imageUrls.length > 1) {
            const remainingUploads = imageUrls.slice(1).map(url => {
              return supabase
                .from('messages')
                .insert({ 
                  list_id: listId, 
                  sender_username: currentUser, 
                  text: 'صورة',
                  image_url: url
                });
            });
            
            await Promise.all(remainingUploads);
          }
          
          console.log('All messages inserted successfully');
        } catch (dbError) {
          console.error('Database operation error:', dbError);
          throw dbError;
        }
      } else if (messageText) {
        try {
      const { error: insertError } = await supabase
        .from('messages')
            .insert({ 
              list_id: listId, 
              sender_username: currentUser, 
              text: messageText,
              image_url: null
            });
  
          if (insertError) {
            console.error('Database insert error:', insertError);
            throw insertError;
          }
        } catch (dbError) {
          console.error('Database operation error:', dbError);
          throw dbError;
        }
      }

    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error('حدث خطأ أثناء إرسال الرسالة');
      setNewMessage(messageText);
    } finally {
      setIsSendingMessage(false);
      setIsUploadingImage(false);
    }
  };

  const handleOpenImagePreview = (imageUrl: string) => {
    setPreviewImage(imageUrl);
  };

  const handleCloseImagePreview = () => {
    setPreviewImage(null);
  };

  return (
    <Card className="mt-4 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 overflow-hidden">
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">الرسائل</h3>
        </div>

        <div
          ref={messagesContainerRef}
          className="rounded-md p-2 mb-4 max-h-[300px] overflow-y-auto scroll-smooth"
        >
          {isLoadingMessages ? (
            <p className="text-center py-4 text-gray-500 dark:text-gray-400">جاري تحميل الرسائل...</p>
          ) : messages.length === 0 ? (
            <p className="text-center py-4 text-gray-500 dark:text-gray-400">لا توجد رسائل</p>
          ) : (
            <div className="space-y-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex flex-col ${
                    message.sender_username === currentUser
                      ? 'ml-auto items-end'
                      : 'mr-auto items-start'
                  }`}
                >
                  <div
                    className={`p-3 rounded-lg max-w-[75%] ${
                      message.sender_username === currentUser
                        ? 'bg-blue-500 dark:bg-blue-600 text-white rounded-br-none'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-none'
                    }`}
                  >
                    <div className="text-xs opacity-80 mb-1">
                      {message.sender_username === currentUser ? 'أنت' : message.sender_username}
                    </div>
                    {message.image_url && (
                      <div className="mb-2">
                        <img 
                          src={message.image_url} 
                          alt="صورة مرفقة" 
                          className="rounded max-w-full w-auto h-auto cursor-pointer hover:opacity-90 transition-opacity object-contain max-h-[200px]" 
                          onClick={() => handleOpenImagePreview(message.image_url as string)}
                        />
                      </div>
                    )}
                    {message.text && <p className="text-sm break-words">{message.text}</p>}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 px-1 ${message.sender_username === currentUser ? 'text-right' : 'text-left'}">
                    {new Date(message.created_at).toLocaleString('ar-SA', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} style={{ height: '1px' }}></div>
            </div>
          )}
        </div>

        {imagePreviewUrls.length > 0 && (
          <div className="mb-4 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">الصور المختارة ({imagePreviewUrls.length})</p>
                <Button
                  onClick={handleCancelAllImages}
                  size="sm"
                  variant="ghost"
                  className="text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/20 p-1 h-auto"
                >
                  إلغاء الكل
                </Button>
              </div>
              
              <div className="mb-2">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">إضافة تعليق على الصور:</p>
                <input 
                  type="text"
                  value={imageCaption}
                  onChange={(e) => setImageCaption(e.target.value)}
                  placeholder="اكتب تعليقًا للصور (اختياري)..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>
              
              {(compressionProgress > 0 || uploadProgress > 0) && (
                <div className="mt-1 mb-2">
                  <div className="flex justify-between text-xs mb-1">
                    {compressionProgress > 0 ? (
                      <>
                        <span>جاري ضغط الصور...</span>
                        <span>{Math.round(compressionProgress)}%</span>
                      </>
                    ) : uploadProgress > 0 ? (
                      <>
                        <span>جاري رفع الصور...</span>
                        <span>{uploadedCount}/{selectedImages.length} ({Math.round(uploadProgress)}%)</span>
                      </>
                    ) : null}
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                    <div 
                      className="bg-blue-600 dark:bg-blue-500 h-1.5 rounded-full transition-all" 
                      style={{ width: `${compressionProgress > 0 ? compressionProgress : uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}
              
              <div className="flex flex-wrap gap-2">
                {imagePreviewUrls.map((previewUrl, index) => (
                  <div key={index} className="relative inline-block">
                    <img 
                      src={previewUrl} 
                      alt={`معاينة الصورة ${index + 1}`} 
                      className="h-20 w-auto rounded border border-gray-300 dark:border-gray-600" 
                    />
                    <button
                      onClick={() => handleCancelSingleImage(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center shadow-md"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSendMessage} className="flex items-center space-x-2 rtl:space-x-reverse border-t border-gray-200 dark:border-gray-700 pt-3">
          <Button
            type="button"
            onClick={handleOpenGallery}
            disabled={isSendingMessage || isUploadingImage}
            variant="ghost"
            className="p-2 h-10 flex items-center justify-center text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 rounded-md"
            title="اختيار من المعرض"
          >
            <Image className="h-5 w-5" />
          </Button>
          
          <Button
            type="button"
            onClick={handleCapturePhoto}
            disabled={isSendingMessage || isUploadingImage}
            variant="ghost"
            className="p-2 h-10 flex items-center justify-center text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 rounded-md"
            title="التقاط صورة"
          >
            <Camera className="h-5 w-5" />
          </Button>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            multiple
            className="hidden"
          />
          
          <input
            ref={inputRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="اكتب رسالتك هنا..."
            disabled={isSendingMessage || isUploadingImage}
            className={cn(
               "flex-1 file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-10 w-full min-w-0 rounded-md border bg-transparent px-3 py-2 text-base shadow-sm transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
               "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
               "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
               "dark:text-gray-100 dark:placeholder:text-gray-500 dark:border-gray-700",
               "dark:focus-visible:border-blue-600 dark:focus-visible:ring-blue-500/40"
            )}
            autoComplete="off"
            type="text"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(e);
              }
            }}
          />
          
          <Button
            type="submit"
            disabled={isSendingMessage || isUploadingImage || (!newMessage.trim() && imagePreviewUrls.length === 0)}
            className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 rounded-md h-10 px-4"
          >
            {isSendingMessage || isUploadingImage ? (
              <RefreshCw className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </form>

        {previewImage && (
          <ImagePreviewModal
            imageUrl={previewImage}
            isOpen={!!previewImage}
            onClose={handleCloseImagePreview}
          />
        )}
      </CardContent>
    </Card>
  );
} 