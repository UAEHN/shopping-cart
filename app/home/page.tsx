'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ShoppingCart, Bell, Users, MessageSquare } from 'lucide-react';
import { supabase } from '@/services/supabase';
import { toast } from '@/components/ui/toast';

export default function HomePage() {
  const router = useRouter();
  const [userName, setUserName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // التحقق من تسجيل الدخول والحصول على اسم المستخدم
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          // إعادة التوجيه إلى صفحة تسجيل الدخول إذا لم يكن المستخدم مسجل
          toast.info('الرجاء تسجيل الدخول أولاً');
          router.push('/login');
          return;
        }
        
        // التحقق مما إذا كان الإشعار قد ظهر بالفعل في هذه الجلسة
        const welcomeShown = sessionStorage.getItem(`welcome_shown_${user.id}`);
        
        // الحصول على اسم المستخدم من الملف الشخصي
        const { data: profile } = await supabase
          .from('users')
          .select('name')
          .eq('id', user.id)
          .single();
        
        if (profile && profile.name) {
          setUserName(profile.name);
          
          // عرض الإشعار فقط إذا لم يتم عرضه سابقًا
          if (!welcomeShown) {
            toast.success(`أهلاً بك، ${profile.name}!`);
            // تخزين أنه تم عرض الإشعار
            sessionStorage.setItem(`welcome_shown_${user.id}`, 'true');
          }
        } else {
          // محاولة الحصول على المعلومات من metadata
          const { data: metadata } = await supabase.auth.getUser();
          const userMetadata = metadata.user?.user_metadata;
          let displayName = '';
          
          if (userMetadata && userMetadata.name) {
            displayName = userMetadata.name;
          } else if (userMetadata && userMetadata.username) {
            displayName = userMetadata.username;
          }
          
          setUserName(displayName);
          
          // عرض الإشعار فقط إذا لم يتم عرضه سابقًا ويوجد اسم للعرض
          if (!welcomeShown && displayName) {
            toast.success(`أهلاً بك، ${displayName}!`);
            // تخزين أنه تم عرض الإشعار
            sessionStorage.setItem(`welcome_shown_${user.id}`, 'true');
          }
        }
      } catch (error) {
        console.error('Error checking auth:', error);
        toast.error('حدث خطأ أثناء التحقق من الحساب');
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, [router]);
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-xl flex flex-col items-center gap-4">
          <div className="animate__pulse h-16 w-16 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
            <ShoppingCart className="h-8 w-8 text-blue-500 dark:text-blue-300" />
          </div>
          <span>جاري التحميل...</span>
        </div>
      </div>
    );
  }

  const handleCreateNewList = () => {
    router.push('/create-list');
    toast.info('جاري إنشاء قائمة جديدة...');
  };

  return (
    <div className="p-4 pt-0 pb-20">
      <Header showCreateButton />
      
      <div className="space-y-6 mt-4">
        <h1 className="text-2xl font-bold animate__animated animate__fadeIn bg-gradient-to-l from-blue-600 to-blue-800 dark:from-blue-500 dark:to-blue-300 bg-clip-text text-transparent py-2">
          {userName ? `مرحباً، ${userName}` : 'مرحباً بك في سلتي'}
        </h1>
        
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950 dark:to-gray-900 dark:border-blue-800 transition-all duration-300 hover:shadow-lg rounded-2xl overflow-hidden">
          <CardContent className="p-0">
            <div className="p-6 flex flex-col items-center text-center space-y-4">
              <div className="bg-blue-100 dark:bg-blue-900 p-5 rounded-full mt-4 shadow-inner">
                <ShoppingCart className="h-12 w-12 text-blue-600 dark:text-blue-300" />
              </div>
              <div>
                <h2 className="font-bold text-xl text-blue-800 dark:text-blue-300">أنشئ قائمة تسوق جديدة</h2>
                <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm">
                  أضف المنتجات وأرسلها إلى أصدقائك
                </p>
              </div>
              <Button 
                className="w-full transition-all duration-300 hover:bg-blue-700 dark:hover:bg-blue-700 rounded-xl py-6 text-lg font-medium bg-blue-600 dark:bg-blue-800 shadow-md hover:shadow-lg"
                onClick={handleCreateNewList}
              >
                قائمة جديدة
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <div className="grid grid-cols-3 gap-4 mt-8">
          <Card className="border-gray-200 bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 transition-all duration-300 hover:shadow-md rounded-xl">
            <CardContent className="p-4 flex flex-col items-center text-center">
              <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-full mt-2 mb-3">
                <ShoppingCart className="h-6 w-6 text-gray-600 dark:text-gray-300" />
              </div>
              <h3 className="font-medium text-sm">قوائم التسوق</h3>
              <Button 
                variant="ghost" 
                size="sm"
                className="mt-2 text-blue-600 dark:text-blue-400 p-1 h-auto text-xs"
                onClick={() => router.push('/lists')}
              >
                عرض الكل
              </Button>
            </CardContent>
          </Card>

          <Card className="border-gray-200 bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 transition-all duration-300 hover:shadow-md rounded-xl">
            <CardContent className="p-4 flex flex-col items-center text-center">
              <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-full mt-2 mb-3">
                <Users className="h-6 w-6 text-gray-600 dark:text-gray-300" />
              </div>
              <h3 className="font-medium text-sm">الأشخاص</h3>
              <Button 
                variant="ghost" 
                size="sm"
                className="mt-2 text-blue-600 dark:text-blue-400 p-1 h-auto text-xs"
                onClick={() => router.push('/contacts')}
              >
                عرض الكل
              </Button>
            </CardContent>
          </Card>
          
          <Card className="border-gray-200 bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 transition-all duration-300 hover:shadow-md rounded-xl">
            <CardContent className="p-4 flex flex-col items-center text-center">
              <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-full mt-2 mb-3">
                <MessageSquare className="h-6 w-6 text-gray-600 dark:text-gray-300" />
              </div>
              <h3 className="font-medium text-sm">الرسائل</h3>
              <Button 
                variant="ghost" 
                size="sm"
                className="mt-2 text-blue-600 dark:text-blue-400 p-1 h-auto text-xs"
                onClick={() => router.push('/messages')}
              >
                عرض الكل
              </Button>
            </CardContent>
          </Card>
        </div>
        
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">آخر الإشعارات</h2>
            <Button variant="ghost" size="sm" className="text-xs p-1 h-auto flex items-center gap-1">
              <Bell className="h-4 w-4" />
              <span>الكل</span>
            </Button>
          </div>
          
          <Card className="bg-gradient-to-r from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 rounded-xl overflow-hidden border-gray-200 dark:border-gray-700 transition-all duration-300">
            <CardContent className="p-6 text-center">
              <p className="text-gray-500 dark:text-gray-400 flex flex-col items-center gap-3">
                <Bell className="h-8 w-8 text-gray-400 dark:text-gray-500 opacity-50" />
                <span>لا توجد إشعارات حتى الآن</span>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 