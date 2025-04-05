'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { signIn, signUp } from '@/services/supabase';
import { toast } from '@/components/ui/toast';
import { AppLogo } from '@/components/ui/app-logo';
import { Eye, EyeOff, Mail, Lock, User, UserCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
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
  
  const toggleView = () => {
    setIsLogin(!isLogin);
    setError(null);
    // إعادة تعيين الحقول عند التبديل بين وضعي الدخول والتسجيل
    if (isLogin) {
      setUsername('');
      setName('');
    }
  };
  
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="mb-8 text-center">
        <div className="flex justify-center mb-6">
          <AppLogo size="large" withLink={false} />
        </div>
        
        <p className="text-sm text-gray-600 dark:text-gray-400">
          تطبيق إدارة قوائم التسوق التفاعلي
        </p>
      </div>
      
      <Card className="w-full max-w-md border-gray-200 dark:border-gray-700 shadow-lg dark:shadow-gray-800/20 rounded-xl overflow-hidden transition-all duration-300 animate-fadeIn">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-white dark:from-gray-900 dark:to-gray-700 pb-8">
          <CardTitle className="text-2xl font-bold text-center text-gray-900 dark:text-white">
            {isLogin ? 'تسجيل الدخول' : 'إنشاء حساب'}
          </CardTitle>
          <CardDescription className="text-center text-gray-600 dark:text-gray-400 mt-2">
            {isLogin 
              ? 'قم بإدخال بياناتك للوصول إلى حسابك' 
              : 'قم بإنشاء حساب جديد للبدء في استخدام التطبيق'}
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-5 -mt-4 px-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center" htmlFor="email">
                <Mail className="h-4 w-4 ml-1.5 text-gray-500 dark:text-gray-400" />
                البريد الإلكتروني
              </label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500 transition-all pr-4"
                  dir="ltr"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center" htmlFor="password">
                <Lock className="h-4 w-4 ml-1.5 text-gray-500 dark:text-gray-400" />
                كلمة المرور
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="********"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500 transition-all pl-4 pr-10"
                  dir="ltr"
                />
                <button 
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center" htmlFor="username">
                    <User className="h-4 w-4 ml-1.5 text-gray-500 dark:text-gray-400" />
                    اسم المستخدم (فريد)
                  </label>
                  <div className="relative">
                    <Input
                      id="username"
                      type="text"
                      placeholder="username123"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      dir="ltr"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center" htmlFor="name">
                    <UserCircle className="h-4 w-4 ml-1.5 text-gray-500 dark:text-gray-400" />
                    الاسم الحقيقي
                  </label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="محمد أحمد"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </div>
              </>
            )}
            
            {error && (
              <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm dark:bg-red-900/30 dark:text-red-300 border border-red-100 dark:border-red-900/50 animate-fadeIn flex items-start">
                <div className="bg-red-100 dark:bg-red-800 p-1 rounded-full ml-2 flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500 dark:text-red-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span>{error}</span>
              </div>
            )}
          </CardContent>
          
          <CardFooter className="flex flex-col space-y-4 px-6 pb-6">
            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white font-medium py-5 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:translate-y-[-1px]" 
              disabled={isLoading}
            >
              {isLoading ? 'جاري التحميل...' : isLogin ? 'تسجيل الدخول' : 'إنشاء حساب'}
            </Button>
            
            <div className="text-center">
              <Button 
                type="button" 
                variant="link" 
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                onClick={toggleView}
              >
                {isLogin ? 'ليس لديك حساب؟ إنشاء حساب' : 'لديك حساب بالفعل؟ تسجيل الدخول'}
              </Button>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
} 