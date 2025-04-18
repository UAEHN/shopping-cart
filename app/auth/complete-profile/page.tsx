'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/toast';
import { AppLogo } from '@/components/ui/app-logo';
import { Loader2, User, Check, AlertCircle } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { supabase } from '@/services/supabase'; // Need client for function invocation
import { checkUsernameAvailability } from '@/services/supabase'; // Import service function

// Function to call the set-username edge function
async function setUsernameForUser(username: string): Promise<any> {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase.functions.invoke('set-username', {
    body: { username }, // Edge function gets userId from JWT
  });

  if (error) {
    console.error('Error invoking set-username function:', error);
    // Try to parse a more specific error message if available
    try {
        const errorJson = JSON.parse(error.context || '{}');
        if (errorJson.error) {
            throw new Error(errorJson.error);
        }
    } catch (e) { /* Ignore parsing error */ }
    throw error; // Re-throw original Supabase error if parsing fails
  }
  return data;
}

export default function CompleteProfilePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Username availability check state
  const [usernameToCheck, setUsernameToCheck] = useState('');
  const debouncedUsername = useDebounce(usernameToCheck, 500);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [isUsernameAvailable, setIsUsernameAvailable] = useState<boolean | null>(null);
  const [usernameCheckError, setUsernameCheckError] = useState<string | null>(null);

  // Effect to check username availability
  useEffect(() => {
    if (!debouncedUsername || debouncedUsername.length < 3) {
      setIsUsernameAvailable(null);
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
             setUsernameCheckError(t('auth.usernameTaken'));
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
      isCancelled = true;
    };
  }, [debouncedUsername, t]);

  // Handle username input change
  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newUsername = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''); // Force lowercase alphanumeric/underscore
      setUsername(newUsername);
      setUsernameToCheck(newUsername);
      setIsUsernameAvailable(null);
      setUsernameCheckError(null);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setUsernameCheckError(null);

    if (!username || username.length < 3) {
      setError(t('auth.usernameWarning'));
      return;
    }
    if (isUsernameAvailable === false) {
      setError(t('auth.usernameTaken'));
      setUsernameCheckError(t('auth.usernameTaken')); // Ensure visual feedback matches
      return;
    }
    if (isUsernameAvailable === null || isCheckingUsername) {
      setError(t('auth.usernameCheckPendingOrRunning'));
      return;
    }

    setIsLoading(true);
    try {
      const result = await setUsernameForUser(username);
      console.log('Set username result:', result);
      toast.success(t('auth.usernameSetSuccess')); // Add translation key
      router.push('/home'); // Redirect to home after setting username
      router.refresh(); // Force refresh to update user state potentially
    } catch (err: unknown) {
      console.error('Error setting username:', err);
      const message = err instanceof Error ? err.message : t('auth.unexpectedError');
      setError(message);
      toast.error(t('auth.usernameSetFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
        <div className="mb-8 text-center">
            <div className="flex justify-center mb-6">
            <AppLogo size="large" withLink={false} />
            </div>
        </div>

        <div className="w-full max-w-md p-6 sm:p-8 bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <div className="space-y-2 text-center mb-6">
                <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                    {t('auth.completeProfileTitle')} {/* New Key */}
                </h1>
                <p className="text-muted-foreground dark:text-gray-300">
                    {t('auth.completeProfileDescription')} {/* New Key */}
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Username Field with Availability Check */}
                <div className="space-y-2">
                    <Label htmlFor="username-complete" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {t('auth.chooseUsernameLabel')} {/* New Key */}
                    </Label>
                    <div className="relative">
                        <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            id="username-complete"
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
                            ) : username === '' ? null : (
                                /* Optional: Show a default state or nothing if empty */
                                <span className="text-xs text-muted-foreground"></span>
                            )}
                        </div>
                    </div>
                     {usernameCheckError && <p className="text-xs text-red-500 dark:text-red-400 pt-1">{usernameCheckError}</p>}
                    <p className="text-xs text-muted-foreground pt-1">{t('auth.usernameHint')}</p> {/* New Key: e.g., حروف وأرقام إنجليزية و _ فقط */}
                </div>

                 {/* Display general error message */}
                 {error && (
                    <p className="text-sm text-red-600 dark:text-red-400 text-center">{error}</p>
                 )}

                {/* Submit Button */}
                <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isLoading || isCheckingUsername || isUsernameAvailable === false || username.length < 3}
                >
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {t('auth.saveUsernameButton')} {/* New Key */}
                </Button>
            </form>
        </div>
    </div>
  );
} 