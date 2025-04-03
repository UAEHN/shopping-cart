'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { ShoppingCart, Clock, MessageSquare, Check, Eye, Inbox } from 'lucide-react';
import { supabase } from '@/services/supabase';
import { toast } from '@/components/ui/toast';
import { ConfirmDialog } from '@/components/confirm-dialog';

interface ShoppingList {
  id: string;
  title: string;
  sender: string;
  date: string;
  items: number;
  status: 'new' | 'viewed' | 'completed';
}

export default function MessagesPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [lists, setLists] = useState<ShoppingList[]>([]);
  
  useEffect(() => {
    loadLists();
  }, [router]);
  
  const loadLists = async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.info('الرجاء تسجيل الدخول أولاً');
        router.push('/login');
        return;
      }
      
      // هنا يمكن جلب القوائم من قاعدة البيانات
      // مثال للبيانات الوهمية:
      setLists([
        { id: '1', title: 'مشتريات البقالة الأسبوعية', sender: 'أحمد محمد', date: '2023-04-10', items: 8, status: 'new' },
        { id: '2', title: 'أدوات المنزل', sender: 'سارة أحمد', date: '2023-04-08', items: 5, status: 'viewed' },
        { id: '3', title: 'مستلزمات المطبخ', sender: 'محمد علي', date: '2023-04-05', items: 12, status: 'completed' },
      ]);
    } catch (error) {
      console.error('Error checking auth:', error);
      toast.error('حدث خطأ أثناء تحميل البيانات');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDeleteList = async (id: string) => {
    try {
      // في التطبيق الحقيقي، سنقوم بحذف القائمة من قاعدة البيانات
      // const { error } = await supabase
      //   .from('shopping_lists')
      //   .delete()
      //   .eq('id', id);
      
      // if (error) throw error;
      
      // تحديث القوائم بعد الحذف مع تأثير بصري
      const updatedLists = lists.filter(list => list.id !== id);
      
      // نستخدم تأثير انتقالي عند حذف العنصر
      const listElement = document.getElementById(`list-${id}`);
      if (listElement) {
        listElement.classList.add('opacity-0', 'scale-95');
        listElement.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        
        // ننتظر انتهاء التأثير قبل إزالة العنصر من الحالة
        setTimeout(() => {
          setLists(updatedLists);
          toast.success('تم حذف القائمة بنجاح');
        }, 300);
      } else {
        setLists(updatedLists);
        toast.success('تم حذف القائمة بنجاح');
      }
    } catch (error) {
      console.error('Error deleting list:', error);
      toast.error('حدث خطأ أثناء حذف القائمة');
    }
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="bg-blue-100 dark:bg-blue-900 p-4 rounded-full">
            <MessageSquare className="h-10 w-10 text-blue-500 dark:text-blue-300" />
          </div>
          <span className="text-xl">جاري التحميل...</span>
        </div>
      </div>
    );
  }
  
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
      case 'viewed':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300';
      case 'completed':
        return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    }
  };
  
  const getStatusText = (status: string) => {
    switch (status) {
      case 'new':
        return 'جديدة';
      case 'viewed':
        return 'تمت المشاهدة';
      case 'completed':
        return 'مكتملة';
      default:
        return '';
    }
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'new':
        return <div className="h-2 w-2 rounded-full bg-blue-600 dark:bg-blue-400 animate__pulse absolute -top-1 -right-1" />;
      case 'viewed':
        return <Eye className="h-3 w-3 text-yellow-600 dark:text-yellow-400 mr-1" />;
      case 'completed':
        return <Check className="h-3 w-3 text-green-600 dark:text-green-400 mr-1" />;
      default:
        return null;
    }
  };

  return (
    <div className="p-4 pt-0 pb-20">
      <Header title="الرسائل" />
      
      <div className="space-y-6 mt-4">
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
          <Inbox className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <span>القوائم المستلمة</span>
          <span className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs rounded-full px-2 py-1 ml-2">
            {lists.length}
          </span>
        </h2>
        
        <div className="space-y-4">
          {lists.length > 0 ? (
            lists.map((list, index) => (
              <div 
                key={list.id} 
                id={`list-${list.id}`}
                className="relative transition-all duration-300 animate__fadeIn"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <Link href={`/list/${list.id}`} className="block">
                  <Card className={`transition-all duration-300 hover:shadow-md hover:translate-y-[-2px] rounded-xl overflow-hidden ${
                    list.status === 'new' 
                      ? 'border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-950/30' 
                      : 'border-gray-200 dark:border-gray-700'
                  }`}>
                    <CardContent className="p-0">
                      <div className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center">
                            <div className={`relative p-3 rounded-full ${
                              list.status === 'new'
                                ? 'bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800'
                                : list.status === 'viewed'
                                  ? 'bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-yellow-900 dark:to-yellow-800'
                                  : 'bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900 dark:to-green-800'
                            }`}>
                              <ShoppingCart className={`h-6 w-6 ${
                                list.status === 'new'
                                  ? 'text-blue-600 dark:text-blue-300'
                                  : list.status === 'viewed'
                                    ? 'text-yellow-600 dark:text-yellow-300'
                                    : 'text-green-600 dark:text-green-300'
                              }`} />
                              {list.status === 'new' && getStatusIcon(list.status)}
                            </div>
                            <div className="mr-4">
                              <h3 className="font-semibold text-gray-800 dark:text-gray-200">{list.title}</h3>
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                <span className="inline-block">من: {list.sender}</span>
                                <span className="inline-block mx-1">•</span>
                                <span className="inline-block">{list.items} عناصر</span>
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <ConfirmDialog
                              title="حذف القائمة"
                              description={`هل أنت متأكد من حذف قائمة "${list.title}"؟ لا يمكن التراجع عن هذا الإجراء.`}
                              onConfirm={() => handleDeleteList(list.id)}
                            />
                            <Badge className={`${getStatusStyle(list.status)} flex items-center gap-1`}>
                              {list.status !== 'new' && getStatusIcon(list.status)}
                              {getStatusText(list.status)}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center mt-3 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-800 pt-2">
                          <Clock className="h-3 w-3 ml-1" />
                          {list.date}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </div>
            ))
          ) : (
            <Card className="border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-xl overflow-hidden">
              <CardContent className="flex flex-col items-center justify-center p-10 text-center">
                <div className="bg-gray-100 dark:bg-gray-700 p-6 rounded-full mb-4">
                  <Inbox className="h-10 w-10 text-gray-400 dark:text-gray-500" />
                </div>
                <p className="text-gray-500 dark:text-gray-400 font-medium">
                  لا توجد قوائم مستلمة
                </p>
                <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
                  ستظهر هنا القوائم التي يشاركها معك الآخرون
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
} 