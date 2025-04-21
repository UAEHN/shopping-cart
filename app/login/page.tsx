'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signIn, signUp, checkUsernameAvailability } from '@/services/supabase';
import { toast } from '@/components/ui/toast';
import { AppLogo } from '@/components/ui/app-logo';
import { Eye, EyeOff, Mail, Lock, User, UserCircle, ArrowRight, UserRound, Loader2, Check, AlertCircle } from 'lucide-react';
// import LanguageSwitcher from '@/components/LanguageSwitcher'; // Removed import
import { motion } from 'framer-motion';
import { useDebounce } from '@/hooks/useDebounce'; // Assuming a debounce hook exists

export default function LoginPage() {
  const { t } = useTranslation();
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  
  // Form fields
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  
  // Username availability check state
  const [usernameToCheck, setUsernameToCheck] = useState('');
  const debouncedUsername = useDebounce(usernameToCheck, 500); // Debounce check
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [isUsernameAvailable, setIsUsernameAvailable] = useState<boolean | null>(null);
  const [usernameCheckError, setUsernameCheckError] = useState<string | null>(null);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // Effect to check username availability
  useEffect(() => {
    if (!debouncedUsername || debouncedUsername.length < 3) {
      setIsUsernameAvailable(null); // Reset if too short or empty
      setUsernameCheckError(null);
      setIsCheckingUsername(false);
      return;
    }

    let isCancelled = false;
    const check = async () => {
      setIsCheckingUsername(true);
      setUsernameCheckError(null);
      setIsUsernameAvailable(null);
      try {
        const available = await checkUsernameAvailability(debouncedUsername);
        if (!isCancelled) {
          setIsUsernameAvailable(available);
          if (!available) {
             setUsernameCheckError(t('auth.usernameTaken')); // Add translation key
          }
        }
      } catch (e) {
        console.error("Error during username check:", e);
        if (!isCancelled) {
          const checkErrorMsg = e instanceof Error ? e.message : t('auth.usernameCheckError');
          setUsernameCheckError(checkErrorMsg);
        }
      } finally {
        if (!isCancelled) {
          setIsCheckingUsername(false);
        }
      }
    };

    check();

    return () => {
      isCancelled = true; // Prevent state updates if component unmounts or username changes quickly
    };
  }, [debouncedUsername, t]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setUsernameCheckError(null);
    
    try {
      if (isLogin) {
        // Login Flow
        const { data, error: signInError } = await signIn(identifier, password);
        
        if (signInError) {
          toast.error(signInError.message || t('auth.loginFailedGeneric'));
          throw signInError;
        }
        
        // Check if data or data.user is null/undefined
        if (!data?.user) { 
          const genericError = t('auth.loginError');
          toast.error(genericError);
          throw new Error(genericError);
        }
        
        toast.success(t('auth.loginSuccess'));
        router.push('/lists'); // <-- Changed to /lists
      } else {
        // Sign Up Flow
        if (password !== confirmPassword) {
          throw new Error(t('auth.passwordMismatch'));
        }
        if (!username || username.length < 3) {
          throw new Error(t('auth.usernameWarning'));
        }
        // Explicitly check for availability status from the state
        if (isUsernameAvailable === false) { 
          throw new Error(t('auth.usernameTaken'));
        }
        // Optionally, prevent submission if username is still being checked or hasn't been checked
        if (isUsernameAvailable === null || isCheckingUsername) { 
            throw new Error(t('auth.usernameCheckPendingOrRunning')); // New translation key needed
        }
        
        // Call signUp and handle potential null data
        const result = await signUp(email, password, username);
        const signUpError = result.error;
        const data = result.data;
        
        if (signUpError) {
          toast.error(signUpError.message || t('auth.registerFailed'));
          throw signUpError;
        }
        
        // Check if data or data.user is null/undefined explicitly after checking error
        if (!data?.user) { 
          const genericError = t('auth.registerError');
          toast.error(genericError);
          throw new Error(genericError);
        }
        
        // User registration successful (confirmation might be needed depending on Supabase settings)
        toast.success(t('auth.registerSuccessCheckEmail')); 
        setIsLogin(true); // Switch to login view after successful signup? Or redirect?
        // Consider redirecting to a profile setup page or home after signup
        // router.push('/profile-setup'); // Example redirect
        router.push('/lists'); // <-- Changed to /lists

      }
    } catch (err: unknown) {
      console.error('Auth error:', err);
      const message = err instanceof Error ? err.message : t('auth.unexpectedError');
      setError(message);
      if (message === t('auth.usernameTaken')) {
        setUsernameCheckError(message);
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const toggleView = () => {
    setIsLogin(!isLogin);
    setError(null);
    // إعادة تعيين الحقول عند التبديل بين وضعي الدخول والتسجيل
    setIdentifier('');
    setPassword('');
    setConfirmPassword('');
    setEmail('');
    setUsername('');
    setUsernameToCheck('');
    setIsUsernameAvailable(null);
    setUsernameCheckError(null);
    setIsCheckingUsername(false);
  };
  
  // Handle username input change for availability check
  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newUsername = e.target.value;
      setUsername(newUsername);
      setUsernameToCheck(newUsername); // Update the value to be debounced
      setIsUsernameAvailable(null); // Reset availability status on change
      setUsernameCheckError(null);
  }

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
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center" htmlFor="identifier">
                  <UserCircle className="h-4 w-4 mr-1.5 text-gray-500 dark:text-gray-400" />
                  {t('auth.usernameOrEmailLabel')}
                </Label>
                <div className="relative">
                  <UserCircle className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="identifier"
                    type="text"
                    placeholder={t('auth.usernameOrEmailPlaceholder')}
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    required
                    className="pl-10 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500 transition-all pr-4"
                    autoCapitalize="none"
                    autoCorrect="off"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center" htmlFor="password">
                  <Lock className="h-4 w-4 mr-1.5 text-gray-500 dark:text-gray-400" />
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
                    onChange={handleUsernameChange}
                    className={`pl-10 pr-10 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500 transition-all ${usernameCheckError ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : isUsernameAvailable === true ? 'border-green-500 focus:ring-green-500 focus:border-green-500' : ''}`}
                    required
                    minLength={3}
                    dir="ltr"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4">
                    {isCheckingUsername ? (
                        <Loader2 className="animate-spin text-muted-foreground" />
                    ) : isUsernameAvailable === true ? (
                        <Check className="text-green-500" />
                    ) : usernameCheckError ? (
                        <AlertCircle className="text-red-500" />
                    ) : null}
                  </div>
                </div>
                {usernameCheckError && <p className="text-xs text-red-500 dark:text-red-400 pt-1">{usernameCheckError}</p>}
              </div>
              
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
                <Label htmlFor="confirm-password-register" className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('auth.confirmPasswordLabel')}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirm-password-register"
                    placeholder={t('auth.confirmPasswordPlaceholder')}
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`pl-10 pr-10 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500 transition-all ${password && confirmPassword && password !== confirmPassword ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                    required
                    dir="ltr"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {password && confirmPassword && password !== confirmPassword && (
                  <p className="text-xs text-red-500 dark:text-red-400 pt-1">{t('auth.passwordMismatch')}</p>
                )}
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
            
            <div className="text-center text-sm mt-4">
              {isLogin ? t('auth.signupPrompt') : t('auth.loginPrompt')}{' '}
              <button type="button" onClick={toggleView} className="font-semibold text-primary hover:underline">
                {isLogin ? t('auth.createAccountLink') : t('auth.loginLink')}
              </button>
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
} 