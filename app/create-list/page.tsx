'use client';

import { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast, clearAllToasts } from '@/components/ui/toast';
import { supabase } from '@/services/supabase';
import { ShoppingCart, Plus, X, Send, Trash2 } from 'lucide-react';
import SelectRecipientDialog from '@/components/lists/select-recipient-dialog';

interface ListItem {
  id: string;
  name: string;
}

export default function CreateListPage() {
  const router = useRouter();
  const [listItems, setListItems] = useState<ListItem[]>([]);
  const [newItem, setNewItem] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // التحقق من تسجيل الدخول
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          toast.info('الرجاء تسجيل الدخول أولاً', 2000);
          router.push('/login');
          return;
        }
        
        // حفظ اسم المستخدم الحالي لاستخدامه عند حفظ القائمة
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
        setIsLoading(false);
        
        // تركيز حقل الإدخال تلقائيًا
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus();
          }
        }, 500);
      } catch (error) {
        console.error('Error checking auth:', error);
        toast.error('حدث خطأ أثناء التحقق من الحساب', 2000);
        router.push('/login');
      }
    };
    
    // مسح الإشعارات السابقة عند تحميل الصفحة
    clearAllToasts();
    checkAuth();
    
    // التنظيف عند تفكيك المكوّن
    return () => {
      // مسح الإشعارات عند مغادرة الصفحة
      clearAllToasts();
    };
  }, [router]);

  // إضافة عنصر جديد إلى القائمة
  const addItem = () => {
    if (!newItem.trim()) return;
    
    const trimmedItem = newItem.trim();
    
    // التحقق من عدم وجود العنصر مسبقًا في القائمة
    const itemExists = listItems.some(item => 
      item.name.toLowerCase() === trimmedItem.toLowerCase()
    );
    
    if (itemExists) {
      toast.error('هذا المنتج موجود بالفعل في القائمة', 1500);
      return;
    }
    
    // إضافة العنصر مع معرّف فريد
    const newId = Date.now().toString();
    setListItems(prev => [...prev, { id: newId, name: trimmedItem }]);
    setNewItem('');
    
    // تركيز حقل الإدخال مرة أخرى
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // حذف عنصر من القائمة
  const removeItem = (id: string) => {
    setListItems(prev => prev.filter(item => item.id !== id));
  };

  // معالجة الضغط على مفتاح الإدخال
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addItem();
    }
  };

  // فتح نافذة اختيار المستلم
  const openSelectRecipientDialog = () => {
    if (listItems.length === 0) {
      toast.error('لا يمكن إرسال قائمة فارغة', 1500);
      return;
    }
    
    setIsDialogOpen(true);
  };

  // معالجة اختيار المستلم وإرسال القائمة
  const handleSelectRecipient = async (recipientUsername: string) => {
    if (!recipientUsername) {
      toast.error('الرجاء اختيار مستلم للقائمة', 1500);
      return;
    }
    
    try {
      // مسح الإشعارات الحالية قبل البدء
      clearAllToasts();
      setIsSending(true);
      
      // الحصول على معرّف المستخدم الحالي
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not found');
      }
      
      // إنشاء القائمة في جدول lists
      const { data: listData, error: listError } = await supabase
        .from('lists')
        .insert({
          creator_username: currentUser,
          recipient_username: recipientUsername,
          status: 'new'
          // سيتم إنشاء id و share_code و created_at تلقائيًا
        })
        .select('id')
        .single();
      
      if (listError) {
        console.error('Error creating list:', listError);
        throw listError;
      }
      
      if (!listData || !listData.id) {
        throw new Error('Failed to retrieve list ID');
      }
      
      // إضافة العناصر إلى جدول items
      const itemsToInsert = listItems.map(item => ({
        list_id: listData.id,
        name: item.name,
        purchased: false
        // سيتم إنشاء id و created_at و updated_at تلقائيًا
      }));
      
      const { error: itemsError } = await supabase
        .from('items')
        .insert(itemsToInsert);
      
      if (itemsError) {
        console.error('Error adding items:', itemsError);
        throw itemsError;
      }
      
      toast.success('تم إرسال القائمة بنجاح', 1500);
      
      setTimeout(() => {
        router.push('/lists?tab=sent');
      }, 1500);
    } catch (error) {
      console.error('Error sending list:', error);
      toast.error('حدث خطأ أثناء إرسال القائمة', 2000);
      setIsSending(false);
    }
  };

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

  return (
    <>
      <div className="p-4 pt-0 pb-20">
        <Header title="قائمة جديدة" showBackButton />
        
        <div className="space-y-6 mt-8">
          <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950 dark:to-gray-900 dark:border-blue-800 transition-all duration-300 hover:shadow-lg rounded-2xl overflow-hidden">
            <CardContent className="p-6">
              <div className="flex flex-col items-center mb-4">
                <div className="bg-blue-100 dark:bg-blue-900 p-4 rounded-full mb-4 shadow-inner">
                  <ShoppingCart className="h-10 w-10 text-blue-600 dark:text-blue-300" />
                </div>
                <h1 className="text-xl font-bold text-center text-gray-800 dark:text-gray-200">
                  أنشئ قائمة التسوق الخاصة بك
                </h1>
                <p className="text-gray-600 dark:text-gray-400 text-center mt-2 text-sm">
                  أضف المنتجات التي تريد إضافتها إلى قائمتك
                </p>
              </div>
              
              <div className="relative mt-6">
                <div className="relative bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm focus-within:shadow-md transition-all duration-200 border border-gray-200 dark:border-gray-700 flex">
                  <Input
                    ref={inputRef}
                    type="text"
                    placeholder="اكتب اسم منتج وأضغط إدخال..."
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="border-0 shadow-none focus-visible:ring-0 py-6 text-base flex-1"
                  />
                  <Button 
                    type="button" 
                    onClick={addItem}
                    className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 h-full px-4 rounded-r-xl"
                  >
                    <Plus className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {listItems.length > 0 && (
            <div className="space-y-4 animate__fadeIn">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <span>قائمة المنتجات</span>
                  <Badge className="ml-2 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                    {listItems.length}
                  </Badge>
                </h2>
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30"
                  onClick={() => setListItems([])}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  <span>مسح الكل</span>
                </Button>
              </div>
              
              <Card className="rounded-xl overflow-hidden border-gray-200 dark:border-gray-700">
                <CardContent className="p-0">
                  <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                    {listItems.map((item, index) => (
                      <li 
                        key={item.id} 
                        className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <span className="font-medium">{item.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 rounded-full text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30"
                          onClick={() => removeItem(item.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
              
              <div className="mt-6 pt-4 flex justify-center">
                <Button
                  onClick={openSelectRecipientDialog}
                  disabled={isSending || listItems.length === 0}
                  className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 transition-all duration-300 rounded-xl py-6 px-8 text-lg font-medium shadow-md hover:shadow-lg flex items-center gap-2 w-full sm:w-auto"
                >
                  <Send className="h-5 w-5" />
                  <span>{isSending ? 'جاري الإرسال...' : 'إرسال القائمة'}</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <SelectRecipientDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSelectRecipient={handleSelectRecipient}
      />
    </>
  );
} 