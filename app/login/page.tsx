'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { signIn, signUp } from '@/services/supabase';
import { toast } from '@/components/ui/toast';

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      if (isLogin) {
        // تسجيل الدخول
        const { data, error: signInError } = await signIn(email, password);
        
        if (signInError) {
          toast.error('فشل تسجيل الدخول: ' + signInError.message);
          throw new Error(signInError.message);
        }
        
        if (!data.user) {
          toast.error('خطأ في تسجيل الدخول');
          throw new Error('خطأ في تسجيل الدخول');
        }
        
        toast.success('تم تسجيل الدخول بنجاح!');
        router.push('/home');
      } else {
        // إنشاء حساب جديد
        if (!username || username.length < 3) {
          toast.warning('اسم المستخدم يجب أن يكون 3 أحرف على الأقل');
          throw new Error('اسم المستخدم يجب أن يكون 3 أحرف على الأقل');
        }
        
        const { data, error: signUpError } = await signUp(email, password, username);
        
        if (signUpError) {
          toast.error('فشل إنشاء الحساب: ' + signUpError.message);
          throw new Error(signUpError.message);
        }
        
        // تحديث بيانات المستخدم (الاسم) في حالة نجاح التسجيل
        if (data.user) {
          // هنا يمكن إضافة كود لتحديث الاسم وإضافة المستخدم في جدول users
          
          toast.success('تم إنشاء الحساب بنجاح!');
          // التوجيه إلى الصفحة الرئيسية
          router.push('/home');
        } else {
          toast.error('خطأ في إنشاء الحساب');
          throw new Error('خطأ في إنشاء الحساب');
        }
      }
    } catch (err: unknown) {
      console.error('Auth error:', err);
      setError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white bg-gradient-to-r from-blue-600 to-blue-800 dark:from-blue-400 dark:to-blue-600 bg-clip-text text-transparent">سلتي | My Basket</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">تطبيق إدارة قوائم التسوق التفاعلي</p>
      </div>
      
      <Card className="w-full max-w-md border-gray-200 dark:border-gray-700 shadow-lg dark:shadow-gray-800/20">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-gray-100">{isLogin ? 'تسجيل الدخول' : 'إنشاء حساب'}</CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            {isLogin 
              ? 'قم بإدخال بياناتك للوصول إلى حسابك' 
              : 'قم بإنشاء حساب جديد للبدء في استخدام التطبيق'}
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="email">
                البريد الإلكتروني
              </label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-white dark:bg-gray-800"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="password">
                كلمة المرور
              </label>
              <Input
                id="password"
                type="password"
                placeholder="********"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-white dark:bg-gray-800"
              />
            </div>
            
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="username">
                    اسم المستخدم (فريد)
                  </label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="username123"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="bg-white dark:bg-gray-800"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="name">
                    الاسم الحقيقي
                  </label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="محمد أحمد"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="bg-white dark:bg-gray-800"
                  />
                </div>
              </>
            )}
            
            {error && (
              <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm dark:bg-red-900/30 dark:text-red-300 border border-red-100 dark:border-red-900/50">
                {error}
              </div>
            )}
          </CardContent>
          
          <CardFooter className="flex flex-col space-y-4">
            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white" 
              disabled={isLoading}
            >
              {isLoading ? 'جاري التحميل...' : isLogin ? 'تسجيل الدخول' : 'إنشاء حساب'}
            </Button>
            
            <Button 
              type="button" 
              variant="link" 
              className="w-full text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300" 
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin ? 'ليس لديك حساب؟ إنشاء حساب' : 'لديك حساب بالفعل؟ تسجيل الدخول'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
} 