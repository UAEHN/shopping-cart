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
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from 'next-themes';


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
  const { t } = useTranslation();
  const modalRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      window.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const handleOutsideClick = (e: React.MouseEvent) => {
    if (
      e.target === e.currentTarget ||
      !(modalRef.current?.contains(e.target as Node))
    ) {
      onClose();
    }
  };

  const zoomIn = () => {
    setScale(prev => Math.min(prev + 0.25, 3));
  };

  const zoomOut = () => {
    setScale(prev => Math.max(prev - 0.25, 0.5));
  };

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
        <Button
          onClick={(e) => { e.stopPropagation(); zoomIn(); }}
          size="sm"
          variant="outline"
          className="bg-white/20 hover:bg-white/30 text-white border-0 rounded-full h-8 w-8 p-0"
          title={t('listDetails.zoomInTooltip')}
        >
          <span className="text-xl font-bold">+</span>
        </Button>
        <Button
          onClick={(e) => { e.stopPropagation(); zoomOut(); }}
          size="sm"
          variant="outline"
          className="bg-white/20 hover:bg-white/30 text-white border-0 rounded-full h-8 w-8 p-0"
          title={t('listDetails.zoomOutTooltip')}
        >
          <span className="text-xl font-bold">-</span>
        </Button>
        <Button
          onClick={(e) => { e.stopPropagation(); resetZoom(); }}
          size="sm"
          variant="outline"
          className="bg-white/20 hover:bg-white/30 text-white border-0 rounded-full h-8 w-8 p-0"
          title={t('listDetails.resetZoomTooltip')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
            <path d="M3 3v5h5"></path>
            <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path>
            <path d="M16 21h5v-5"></path>
          </svg>
        </Button>
        <Button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          size="sm"
          variant="outline"
          className="bg-white/20 hover:bg-white/30 text-white border-0 rounded-full h-8 w-8 p-0"
          title={t('common.close')}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>
      
      <div 
        className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-black/50 px-3 py-1 rounded-full text-white text-sm z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {Math.round(scale * 100)}%
      </div>
      
      <div 
        ref={modalRef}
        className="relative flex items-center justify-center w-full h-full"
      >
        <div 
          className="bg-transparent transition-all duration-300 ease-in-out max-w-[90%] max-h-[90%] overflow-hidden"
          style={{ boxShadow: '0 0 20px rgba(0, 0, 0, 0.3)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <img 
            src={imageUrl} 
            alt={t('listDetails.displayedImageAlt')}
            className="w-auto h-auto max-w-full max-h-[85vh] object-contain transition-transform duration-300 ease-in-out"
            style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}
          />
        </div>
      </div>
    </div>
  );
}

// --- Animation Variants (Debugging: Force Initial White Always) ---
const getItemVariants = (theme: string | undefined) => ({
  initial: {
    opacity: 1,
    transition: { duration: 0.4 }
  },
  purchased: {
    backgroundColor: theme === 'dark' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(74, 222, 128, 0.1)',
    opacity: 0.85,
    transition: { duration: 0.4 }
  }
});

// Updated nameVariants to always force initial white for debugging
const getNameVariants = (theme: string | undefined) => ({
  initial: {
    x: 0,
    // Set color based on theme for better visibility
    color: theme === 'dark' ? '#F9FAFB' : '#111827', // gray-50 : gray-900
  },
  purchased: {
    x: 10,
    // Use Hex colors for clarity
    color: theme === 'dark' ? '#D1D5DB' : '#6B7280', // gray-300 : gray-500
  }
});

// Updated lineVariants for slide effect
const lineVariants = {
  initial: {
    x: 0,
    scaleX: 0,
    opacity: 0,
    // transition inherited from parent (name span)
  },
  purchased: {
    x: 0, // Keep line aligned with the sliding text
    scaleX: 1,
    opacity: 1,
    // transition inherited from parent (name span)
  }
};

// Define the spring transition
const springTransition = {
  type: "spring",
  stiffness: 300, // Adjust for bounciness
  damping: 25     // Adjust for smoothness
};
// --- End Animation Variants ---

export default function ListDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const listId = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : '';
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  
  const [isLoading, setIsLoading] = useState(true);
  const [listDetails, setListDetails] = useState<ListDetails | null>(null);
  const [currentUser, setCurrentUser] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Generate theme-specific variants
  const itemVariants = getItemVariants(theme);
  const nameVariants = getNameVariants(theme);

  const loadListDetails = useCallback(async () => {
    try {
      if (!listId) {
        toast.error(t('listDetails.invalidId'));
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
        toast.error(t('listDetails.notFound'));
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
      toast.error(t('listDetails.loadError'));
      setIsLoading(false);
    }
  }, [listId, router, t]);
  
  useEffect(() => {
    const checkAuthAndLoadList = async () => {
      if (!listId) {
        toast.error(t('listDetails.invalidId'), 2000);
        router.push('/lists');
        return;
      }
      
      try {
        // التحقق من تسجيل دخول المستخدم
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          toast.info(t('auth.loginRequired'));
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
          toast.error(t('listDetails.usernameNotFound'));
          router.push('/profile');
          return;
        }
        
        setCurrentUser(username);
        
        // جلب تفاصيل القائمة
        await loadListDetails();
        
      } catch (error) {
        console.error('Error checking auth:', error);
        toast.error(t('auth.authCheckError'));
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
          toast.error(t('listDetails.realtimeError'));
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
  }, [listId, router, currentUser, loadListDetails, t, i18n]);
  
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
        toast.error(t('listDetails.itemUpdateError', { errorMessage: itemUpdateError.message || t('common.error') }), 2000);
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
      toast.success(purchased ? t('listDetails.itemMarkedPurchased') : t('listDetails.itemMarkedNotPurchased'));
      
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
        console.log(`[toggleItemPurchase] Status changed! From: ${currentListStatus}, To: ${newListStatus}. Preparing notification record.`);
        
        const notificationRecipientUsername = listDetails.creator_username;
        const notificationActorUsername = currentUser;

        // 4a. Update list status in DB
        const { error: listStatusUpdateError } = await supabase
          .from('lists')
          .update({ status: newListStatus, updated_at: new Date().toISOString() })
          .eq('id', listId);

        if (listStatusUpdateError) {
          console.error('Error updating list status in DB:', listStatusUpdateError);
          toast.error(t('listDetails.listStatusUpdateError', { errorMessage: listStatusUpdateError.message }), 1500);
          // Don't return, proceed to update local state and maybe notify anyway if DB failed?
          // Or maybe we should return here to avoid inconsistent state/notifications?
          // For now, let's proceed but be aware of this potential issue.
        } else {
           // Update local state for status as well (redundant if realtime works, but safe)
           setListDetails(prev => prev ? { ...prev, status: newListStatus } : null);
        }

        // --- Send Notification Based on Status Change --- 
        let notificationMessageKey = '';
        let notificationType: 'LIST_OPENED' | 'LIST_COMPLETED' | null = null;

        if (currentListStatus === 'new' && newListStatus === 'opened') {
            notificationMessageKey = 'notifications.listStatusOpenedBy';
            notificationType = 'LIST_OPENED';
        } else if (currentListStatus !== 'completed' && newListStatus === 'completed') {
            notificationMessageKey = 'notifications.listStatusCompletedBy';
            notificationType = 'LIST_COMPLETED';
        }

        if (notificationMessageKey && notificationType) {
            console.log(`[toggleItemPurchase] Conditions met for notification type: ${notificationType}`);
            
            // Fetch recipient (creator) user data for the notification
            const { data: recipientData, error: userError } = await supabase
              .from('users') 
              .select('id, username') 
              .eq('username', notificationRecipientUsername)
              .maybeSingle();

            if (userError) {
              console.error(`[toggleItemPurchase] Error finding notification recipient (${notificationRecipientUsername}):`, userError);
            } else if (!recipientData) {
              console.error(`[toggleItemPurchase] Notification recipient user "${notificationRecipientUsername}" not found.`);
            } else {
              const notificationMessage = t(notificationMessageKey, { actor: notificationActorUsername });
              const notificationPayload = {
                user_id: recipientData.id,
                message: notificationMessage,
                type: notificationType,
                related_list_id: listId
              };
              console.log('[toggleItemPurchase] Attempting to insert notification record:', notificationPayload);
              
              try {
                // Insert directly into notifications table using await
                const { error: insertError } = await supabase
                  .from('notifications')
                  .insert(notificationPayload);
                  
                console.log('[toggleItemPurchase] Code execution continued *after* awaited insert.'); // Log Checkpoint A

                if (insertError) {
                  console.error('[toggleItemPurchase] Error inserting notification record:', insertError); // Log Checkpoint B (Error)
                } else {
                  console.log('[toggleItemPurchase] Notification record created successfully.'); // Log Checkpoint C (Success)
                }
              } catch (catchError: any) {
                console.error('[toggleItemPurchase] Exception caught during insert attempt:', catchError); // Log Checkpoint D (Exception)
              }
            }
        }
        // --- End Send Notification --- 

      }
      // --- End List Status Update Logic ---

    } catch (error) {
      console.error('Error in toggleItemPurchase:', error);
      const errorMessage = error instanceof Error ? error.message : t('common.error');
      toast.error(t('listDetails.toggleItemError', { errorMessage }));
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
      
      // --- إنشاء إشعار لمستلم القائمة (REMOVED) --- 
      
      setNewItemName('');
      toast.success(t('listDetails.itemAddedSuccess'));
    } catch (error) {
      console.error('Error adding item:', error);
      toast.error(t('listDetails.addItemError'));
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
        toast.error(t('listDetails.deleteItemError'));
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
      
      toast.success(t('listDetails.itemDeletedSuccess', { itemName }));
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error(t('listDetails.deleteItemError'));
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
        toast.error(t('listDetails.deleteListItemsError'));
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
        toast.error(t('listDetails.deleteListError'));
        setIsDeleting(false);
        return;
      }
      
      toast.success(t('listDetails.listDeletedSuccess'));
      
      // العودة إلى صفحة القوائم
      router.push('/lists');
    } catch (error) {
      console.error('Error during list deletion:', error);
      toast.error(t('listDetails.deleteListUnexpectedError'));
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
          <span className="text-xl">{t('common.loading')}</span>
        </div>
      </div>
    );
  }
  
  // عرض رسالة إذا لم تكن القائمة موجودة
  if (!listDetails) {
    return (
      <div className="p-4 pt-0">
        <Header title={t('listDetails.pageTitleFallback')} showBackButton />
        
        <div className="mt-8 flex flex-col items-center justify-center py-10 px-4 bg-gray-50 dark:bg-gray-800 rounded-xl text-center">
          <ShoppingCart className="h-12 w-12 text-gray-400 dark:text-gray-500 mb-3" />
          <h3 className="text-lg font-medium text-gray-600 dark:text-gray-300 mb-2">
            {t('listDetails.notFoundTitle')}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {t('listDetails.notFoundDescription')}
          </p>
          <Button 
            onClick={goBack}
            className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            <span>{t('listDetails.backToLists')}</span>
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
            <span>{t('lists.statusNew')}</span>
          </Badge>
        );
      case 'opened':
        return (
          <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300 flex items-center gap-1">
            <Package className="h-3 w-3" />
            <span>{t('lists.statusOpened')}</span>
          </Badge>
        );
      case 'completed':
        return (
          <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            <span>{t('lists.statusCompleted')}</span>
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

  // تحديث حالة القائمة (الدالة القديمة - قد تكون غير مستخدمة)
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
      /*  COMMENTING OUT NOTIFICATION LOGIC IN THIS OLD FUNCTION
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
        let messageKey = ''; // Use key instead of hardcoded message
        let statusText = newStatus; // Fallback status text

        switch (newStatus) {
          case 'completed':
              messageKey = 'notifications.listStatusCompletedBy';
              statusText = t('lists.statusCompleted'); // Get localized status name
            break;
          case 'opened': 
              messageKey = 'notifications.listStatusOpenedBy';
              statusText = t('lists.statusOpened'); // Get localized status name
            break;
          case 'new':
              messageKey = 'notifications.listStatusResetBy';
              statusText = t('lists.statusNew'); // Get localized status name
            break;
          default:
              messageKey = 'notifications.listStatusUpdatedBy';
              // statusText remains newStatus for unknown statuses
        }
        
        // Generate the translated message
        const notificationMessage = t(messageKey, { actor: actorUsername, status: statusText });

        createNotification(
            recipientData, // Pass the full user object now
            notificationMessage, // Pass the translated message
            'LIST_STATUS', // Use a specific type
            null,
            listId
        );
      }
      */ // --- نهاية التعليق على إنشاء الإشعار ---
      
      toast.success(t('listDetails.listStatusUpdatedSuccess'));
    } catch (error) {
      console.error('Error updating list status:', error);
      toast.error(t('listDetails.updateListStatusError'));
    } finally {
      setIsUpdating(false);
    }
  };
  
  return (
    <div className="container max-w-3xl mx-auto px-4 pb-20">
        <Header 
          title={isLoading ? t('common.loading') : (listDetails?.creator_username === currentUser ? t('listDetails.titleSent') : t('listDetails.titleReceived'))} 
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
                aria-label={t('listDetails.refreshAriaLabel')}
              >
                <RefreshCw className={`h-5 w-5 text-blue-600 dark:text-blue-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
              
              {/* زر حذف القائمة - يظهر فقط للمنشئ */}
              {isCreator && !isDeleting && !showDeleteConfirm && (
                <button 
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center justify-center p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                  aria-label={t('listDetails.deleteListAriaLabel')}
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
                <h3 className="font-medium text-red-800 dark:text-red-300">{t('listDetails.deleteConfirmTitle')}</h3>
                <p className="text-sm text-red-700 dark:text-red-400 mt-1 mb-3">
                  {t('listDetails.deleteConfirmDescription')}
                </p>
                <div className="flex gap-2">
                  <Button 
                    onClick={deleteEntireList}
                    disabled={isDeleting}
                    className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
                  >
                    {isDeleting ? t('listDetails.deleting') : t('listDetails.confirmDeleteButton')}
                  </Button>
                  <Button 
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeleting}
                    variant="outline" 
                    className="border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400"
                  >
                    {t('common.cancel')}
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
                {t('listDetails.sectionTitle')}
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
                        ? t('listDetails.listTo', { recipient: listDetails.recipient_username })
                        : t('listDetails.listFrom', { creator: listDetails.creator_username })
                      }
                    </h2>
                    {renderStatusBadge(listDetails.status)}
                  </div>
                  
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {new Date(listDetails.created_at).toLocaleDateString(i18n.language, {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                </div>
              </div>
              
              {/* شريط التقدم المتحرك */}
              <div className="mb-6">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600 dark:text-gray-300">{t('listDetails.progressLabel')}</span>
                  <span className="font-medium">{completionPercentage}%</span>
                </div>
                {/* Outer container for the progress bar track */}
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden"> {/* Added overflow-hidden */} 
                  {/* Animated progress div */}
                  <motion.div 
                    className="bg-blue-600 dark:bg-blue-500 h-2.5 rounded-full" // Removed transition classes
                    initial={{ width: "0%" }} // Start from 0 width
                    animate={{ width: `${completionPercentage}%` }} // Animate to the current percentage
                    transition={{ type: "spring", stiffness: 100, damping: 20 }} // Added spring transition
                  />
                </div>
              </div>
              
              {/* قائمة العناصر */}
              <div className="space-y-2">
                <h3 className="font-medium dark:text-white mb-3">{t('listDetails.itemsTitle', { count: listDetails.items.length })}</h3>
                
                {/* نموذج إضافة منتج جديد - يظهر فقط للمرسل */}
                {isCreator && (
                  <form onSubmit={addItemToList} className="mb-4 flex gap-2">
                    <Input
                      type="text"
                      placeholder={t('listDetails.newItemPlaceholder')}
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
                      <span>{t('common.add')}</span>
                    </Button>
                  </form>
                )}
                
                {listDetails.items.length > 0 ? (
                  <ul className="space-y-2">
                  {/* Wrap list items with AnimatePresence for exit animations */}
                  <AnimatePresence initial={false}>
                    {listDetails.items.map((item) => (
                      <motion.li
                        key={item.id}
                        layout // Enable layout animations for reordering/deletion shifts
                        variants={itemVariants}
                        initial="initial"
                        animate={item.purchased ? "purchased" : "initial"}
                        exit={{ opacity: 0, height: 0, marginBottom: 0, transition: { duration: 0.3, ease: "easeInOut" } }} // Smoother exit animation
                        whileHover={{ 
                          y: -3, // Slightly more lift
                          boxShadow: theme === 'dark' 
                            ? "0 5px 15px rgba(0, 0, 0, 0.3)" 
                            : "0 5px 15px rgba(0, 0, 0, 0.1)" 
                        }} // Add hover effect
                        className={`border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800`} 
                      >
                        <div className="flex justify-between items-center p-3">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {/* Check Button */}
                            <Button
                              onClick={() => toggleItemPurchase(item.id, !item.purchased)}
                              disabled={isUpdating || (!isRecipient)} // Only recipient can toggle
                              variant={item.purchased ? "default" : "outline"}
                              size="sm"
                              className={`rounded-full h-8 w-8 p-0 flex items-center justify-center shrink-0 transition-colors duration-200 ease-in-out ${ 
                                item.purchased
                                  ? 'bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 border-transparent' // Ensure border is transparent when filled
                                  : 'border-gray-300 dark:border-gray-600 bg-transparent hover:bg-gray-50 dark:hover:bg-gray-700'
                              }`}
                              aria-label={item.purchased ? t('listDetails.markAsNotPurchased') : t('listDetails.markAsPurchased')}
                            >
                              {/* Animated Checkmark */}
                              <AnimatePresence >
                                {item.purchased && (
                                  <motion.div
                                     // Enhanced animation: scale in with spring effect
                                     initial={{ scale: 0.3, opacity: 0 }}
                                     animate={{ scale: 1, opacity: 1 }}
                                     exit={{ scale: 0.3, opacity: 0 }}
                                     // Change transition to tween for smoother appearance
                                     transition={{ type: "tween", duration: 0.3, ease: "easeInOut" }}
                                  >
                                     <CheckCircle className="h-4 w-4 text-white" /> 
                                  </motion.div>
                                )}
                               </AnimatePresence>
                            </Button>

                            {/* Item Name Span */}
                            <motion.span
                              variants={nameVariants}
                              animate={item.purchased ? "purchased" : "initial"}
                              transition={springTransition} // Use the predefined spring transition
                              className={`text-sm font-medium relative truncate`} 
                            >
                              {item.name}
                              {/* Strikethrough Line */}
                              <motion.div
                                variants={lineVariants}
                                initial="initial"
                                animate={item.purchased ? "purchased" : "initial"}
                                className="absolute left-0 right-0 top-1/2 h-px bg-current"
                                style={{ transformOrigin: 'left' }} // Keep origin left for wipe effect
                              />
                            </motion.span>
                          </div>

                          {/* Delete Button - Show only for creator */}
                          {isCreator && (
                             <motion.button
                               whileHover={{ scale: 1.1, color: 'rgb(239 68 68)' }} // Add hover effect to delete button
                               whileTap={{ scale: 0.9 }}
                               onClick={() => deleteItem(item.id, item.name)}
                               disabled={isUpdating}
                               className="p-1.5 rounded-full text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-500 transition-colors shrink-0 ml-2"
                               title={t('listDetails.deleteItem')}
                            >
                              <Trash2 className="h-4 w-4" />
                            </motion.button>
                          )}
                        </div>
                      </motion.li>
                    ))}
                   </AnimatePresence>
                  </ul>
                ) : (
                  <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                    {t('listDetails.noItemsYet')}
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
  const { t, i18n } = useTranslation();
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
      toast.error(t('listDetails.maxImagesError'));
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
          
          toast.info(t('listDetails.compressingImages'), 3000);
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
          toast.error(t('listDetails.imageUploadError'));
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
      const firstImageText = messageText || (captionText ? captionText : t('listDetails.defaultImageText'));
          
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
                  text: t('listDetails.defaultImageText'),
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
      toast.error(t('listDetails.sendMessageError'));
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
          <h3 className="text-lg font-semibold">{t('listDetails.messagesTitle')}</h3>
        </div>

        <div
          ref={messagesContainerRef}
          className="rounded-md p-2 mb-4 max-h-[300px] overflow-y-auto scroll-smooth"
        >
          {isLoadingMessages ? (
            <p className="text-center py-4 text-gray-500 dark:text-gray-400">{t('listDetails.loadingMessages')}</p>
          ) : messages.length === 0 ? (
            <p className="text-center py-4 text-gray-500 dark:text-gray-400">{t('listDetails.noMessages')}</p>
          ) : (
            <div className="space-y-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex flex-col ${ message.sender_username === currentUser ? 'ml-auto items-end' : 'mr-auto items-start' }`}
                >
                  <div
                    className={`p-3 rounded-lg max-w-[75%] ${ message.sender_username === currentUser ? 'bg-blue-500 dark:bg-blue-600 text-white rounded-br-none' : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-none' }`}
                  >
                    <div className="text-xs opacity-80 mb-1">
                      {message.sender_username === currentUser ? t('listDetails.messageSenderYou') : message.sender_username}
                    </div>
                    {message.image_url && (
                      <div className="mb-2">
                        <img 
                          src={message.image_url} 
                          alt={t('listDetails.attachedImageAlt')}
                          className="rounded max-w-full w-auto h-auto cursor-pointer hover:opacity-90 transition-opacity object-contain max-h-[200px]" 
                          onClick={() => handleOpenImagePreview(message.image_url as string)}
                        />
                      </div>
                    )}
                    {message.text && <p className="text-sm break-words">{message.text}</p>}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 px-1 ${message.sender_username === currentUser ? 'text-right' : 'text-left'}">
                    {new Date(message.created_at).toLocaleString(i18n.language, {
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
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('listDetails.selectedImagesTitle', { count: imagePreviewUrls.length })}</p>
                <Button
                  onClick={handleCancelAllImages}
                  size="sm"
                  variant="ghost"
                  className="text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/20 p-1 h-auto"
                >
                  {t('listDetails.cancelAllImages')}
                </Button>
              </div>
              
              <div className="mb-2">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">{t('listDetails.addImageCaptionLabel')}</p>
                <input 
                  type="text"
                  value={imageCaption}
                  onChange={(e) => setImageCaption(e.target.value)}
                  placeholder={t('listDetails.imageCaptionPlaceholder')}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>
              
              {(compressionProgress > 0 || uploadProgress > 0) && (
                <div className="mt-1 mb-2">
                  <div className="flex justify-between text-xs mb-1">
                    {compressionProgress > 0 ? (
                      <>
                        <span>{t('listDetails.compressingImages')}</span>
                        <span>{Math.round(compressionProgress)}%</span>
                      </>
                    ) : uploadProgress > 0 ? (
                      <>
                        <span>{t('listDetails.uploadingImages')}</span>
                        <span>{t('listDetails.uploadProgress', { uploadedCount: uploadedCount, totalImages: selectedImages.length, percent: Math.round(uploadProgress) })}</span>
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
                      alt={t('listDetails.imagePreviewAlt', { index: index + 1 })}
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
            title={t('listDetails.openGalleryTooltip')}
          >
            <Image className="h-5 w-5" />
          </Button>
          
          <Button
            type="button"
            onClick={handleCapturePhoto}
            disabled={isSendingMessage || isUploadingImage}
            variant="ghost"
            className="p-2 h-10 flex items-center justify-center text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 rounded-md"
            title={t('listDetails.capturePhotoTooltip')}
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
            placeholder={t('listDetails.messageInputPlaceholder')}
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