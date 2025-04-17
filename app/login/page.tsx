'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signIn, signUp } from '@/services/supabase';
import { toast } from '@/components/ui/toast';
import { AppLogo } from '@/components/ui/app-logo';
import { Eye, EyeOff, Mail, Lock, User, UserCircle, ArrowRight, UserRound, Loader2 } from 'lucide-react';
// import LanguageSwitcher from '@/components/LanguageSwitcher'; // Removed import
import { motion } from 'framer-motion';

export default function LoginPage() {
  const { t } = useTranslation();
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  
  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      if (isLogin) {
        // تسجيل الدخول
        const { data, error: signInError } = await signIn(email, password, rememberMe);
        
        if (signInError) {
          toast.error(t('auth.loginFailed') + signInError.message);
          throw new Error(signInError.message);
        }
        
        if (!data.user) {
          toast.error(t('auth.loginError'));
          throw new Error(t('auth.loginError'));
        }
        
        toast.success(t('auth.loginSuccess'));
        router.push('/home');
      } else {
        // إنشاء حساب جديد
        if (!username || username.length < 3) {
          toast.warning(t('auth.usernameWarning'));
          throw new Error(t('auth.usernameWarning'));
        }
        
        const { data, error: signUpError } = await signUp(email, password, username);
        
        if (signUpError) {
          toast.error(t('auth.registerFailed') + signUpError.message);
          throw new Error(signUpError.message);
        }
        
        // تحديث بيانات المستخدم (الاسم) في حالة نجاح التسجيل
        if (data.user) {
          // هنا يمكن إضافة كود لتحديث الاسم وإضافة المستخدم في جدول users
          
          toast.success(t('auth.registerSuccess'));
          // التوجيه إلى الصفحة الرئيسية
          router.push('/home');
        } else {
          toast.error(t('auth.registerError'));
          throw new Error(t('auth.registerError'));
        }
      }
    } catch (err: unknown) {
      console.error('Auth error:', err);
      setError(err instanceof Error ? err.message : t('auth.unexpectedError'));
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
    <div className="min-h-screen w-full flex flex-col p-4 bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="mb-8 text-center mt-10">
        <div className="flex justify-center mb-6">
          <AppLogo size="large" withLink={false} />
        </div>
        
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {isMounted ? t('auth.appDescription') : <>&nbsp;</>}
        </p>
      </div>
      
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
        className="w-full flex-1 flex flex-col justify-center max-w-md mx-auto p-6 sm:p-8"
      >
        <div className="space-y-2 text-center mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            {isLogin ? t('auth.loginTitle') : t('auth.registerTitle')}
          </h1>
          <p className="text-muted-foreground dark:text-gray-300">
            {isLogin 
              ? t('auth.loginDescription') 
              : t('auth.registerDescription')}
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {isLogin && (
            <>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center" htmlFor="email">
                  <Mail className="h-4 w-4 mr-1.5 text-gray-500 dark:text-gray-400" />
                  {t('auth.emailLabel')}
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder={t('auth.emailPlaceholder')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-10 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500 transition-all pr-4"
                    dir="ltr"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center" htmlFor="password">
                  <Lock className="h-4 w-4 ml-1.5 text-gray-500 dark:text-gray-400" />
                  {t('auth.passwordLabel')}
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={t('auth.passwordPlaceholder')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pl-10 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500 transition-all pr-10"
                    dir="ltr"
                  />
                  <button 
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              
              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={() => setRememberMe(!rememberMe)}
                  className="h-4 w-4 text-blue-600 dark:text-blue-500 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded ml-2"
                />
                <label htmlFor="remember-me" className="text-sm text-gray-700 dark:text-gray-400 cursor-pointer">
                  {t('auth.rememberMe')}
                </label>
              </div>
            </>
          )}
          
          {!isLogin && (
            <>
              <div className="space-y-2">
                <Label htmlFor="email-register" className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('auth.emailLabel')}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email-register"
                    placeholder={t('auth.emailPlaceholder')}
                    type="email"
                    autoCapitalize="none"
                    autoComplete="email"
                    autoCorrect="off"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    required
                    dir="ltr"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password-register" className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('auth.passwordLabel')}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password-register"
                    placeholder={t('auth.passwordPlaceholder')}
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    required
                    dir="ltr"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="username-register" className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('auth.usernameLabel')}</Label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="username-register"
                    placeholder={t('auth.usernamePlaceholder')}
                    type="text"
                    autoCapitalize="none"
                    autoComplete="username"
                    autoCorrect="off"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    required
                    dir="ltr"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="name-register" className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('auth.nameLabel')}</Label>
                <div className="relative">
                  <UserRound className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name-register"
                    placeholder={t('auth.namePlaceholder')}
                    type="text"
                    autoCapitalize="words"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    required
                  />
                </div>
              </div>
            </>
          )}
          
          {error && (
            <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm dark:bg-red-900/30 dark:text-red-300 border border-red-100 dark:border-red-900/50 flex items-start">
              <div className="bg-red-100 dark:bg-red-800 p-1 rounded-full ml-2 flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500 dark:text-red-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span>{error}</span>
            </div>
          )}
          
          <div className="flex flex-col space-y-4 pt-4">
            <Button
              type="submit"
              className="w-full group relative overflow-hidden bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white font-medium py-3 rounded-lg shadow-md transition-transform duration-200 group-hover:scale-[1.02] active:scale-[0.98]"
              disabled={isLoading}
            >
              <div className="absolute inset-0 w-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-300 ease-out group-hover:w-full opacity-60 dark:opacity-40"></div>
              <span className="relative flex items-center justify-center gap-2">
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {isLoading ? t('auth.loadingButton') : isLogin ? t('auth.loginButton') : t('auth.registerButton')}
                {!isLoading && <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />}
              </span>
            </Button>
            
            <div className="flex items-center justify-between w-full text-center">
              <Button
                type="button"
                variant="link"
                className="text-sm text-muted-foreground underline-offset-4 hover:text-primary hover:underline p-0 h-auto"
                onClick={toggleView}
              >
                {isLogin ? t('auth.toggleToRegister') : t('auth.toggleToLogin')}
              </Button>
              {/* <LanguageSwitcher /> */ }
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
} 