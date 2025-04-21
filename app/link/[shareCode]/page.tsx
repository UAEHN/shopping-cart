'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/services/supabase';
import { useTranslation } from 'react-i18next';
import { toast } from '@/components/ui/toast';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, ShoppingCart, UserPlus, LogIn } from 'lucide-react';

// Interface for the read-only data fetched by the function
interface ReadOnlyListItem {
  item_name: string;
  item_purchased: boolean;
}
interface ReadOnlyListData {
  list_name: string | null;
  items: ReadOnlyListItem[];
}

export default function ShareLinkPage() {
  const router = useRouter();
  const params = useParams();
  const { t } = useTranslation();
  const shareCode = typeof params.shareCode === 'string' ? params.shareCode : null;

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [readOnlyData, setReadOnlyData] = useState<ReadOnlyListData | null>(null);

  console.log('[ShareLinkPage] Mounted. Share code from URL:', shareCode);

  useEffect(() => {
    if (!shareCode) {
      setError(t('shareLink.invalidCode'));
      setIsLoading(false);
      // Optionally redirect to home or an error page
      // router.push('/');
      return;
    }

    const handleLink = async () => {
      setIsLoading(true);
      setError(null);
      setReadOnlyData(null);

      try {
        // 1. Check user authentication status
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError) {
          console.error('[ShareLinkPage] Error checking auth:', authError);
          // Treat auth error as guest for now, they can try logging in
        }

        if (user) {
          // --- User is Logged In --- 
          console.log('[ShareLinkPage] User is logged in. Resolving share code...');
          // Call the function to get list_id securely
          const { data: listId, error: resolveError } = await supabase.rpc('resolve_share_code', {
            p_share_code: shareCode
          });

          if (resolveError || !listId) {
            console.error('[ShareLinkPage] Error resolving share code or list not found:', resolveError);
            setError(t('shareLink.invalidOrExpired'));
            setIsLoading(false);
            return;
          }

          console.log(`[ShareLinkPage] Resolved listId: ${listId}. Attempting to record access...`);

          // Attempt to record access (RLS allows user to insert their own ID)
          const { error: insertError } = await supabase
            .from('shared_list_access')
            .insert({ list_id: listId, user_id: user.id })
            .select() // Add select to check for conflict/error details

          if (insertError && insertError.code !== '23505') { // Ignore unique violation error (already accessed)
            console.error('[ShareLinkPage] Error inserting access record:', insertError);
            // Don't block redirect even if logging access fails?
            toast.warning(t('shareLink.accessRecordError')); 
          } else {
            console.log('[ShareLinkPage] Access recorded or already existed.');
          }
          
          // Redirect to the actual list page
          console.log(`[ShareLinkPage] Redirecting logged-in user to /lists/${listId}`);
          router.push(`/lists/${listId}`);
          // No need to setIsLoading(false) here as we are navigating away
          
        } else {
          // --- User is NOT Logged In (Guest) --- 
          console.log('[ShareLinkPage] User is not logged in. Fetching read-only details...');
          // Call the function to get read-only details
          const { data: guestData, error: guestError } = await supabase.rpc('get_list_details_for_link', {
            p_share_code: shareCode
          });

          if (guestError || !guestData || guestData.length === 0) {
            console.error('[ShareLinkPage] Error fetching guest data or list not found:', guestError);
            setError(t('shareLink.invalidOrExpired'));
            setIsLoading(false);
            return;
          }

          // Process guest data
          const listName = guestData[0]?.list_name || t('shareLink.defaultListName');
          const items = guestData.map((row: any) => ({ 
            item_name: row.item_name,
            item_purchased: row.item_purchased
          })).filter((item: ReadOnlyListItem) => item.item_name); // Filter out potential null item rows if list has no items

          console.log('[ShareLinkPage] Fetched read-only data:', { listName, items });
          setReadOnlyData({ list_name: listName, items });
          setIsLoading(false);
        }
      } catch (err) {
        console.error('[ShareLinkPage] Unexpected error in handleLink:', err);
        setError(t('shareLink.unexpectedError'));
        setIsLoading(false);
      }
    };

    handleLink();

  }, [shareCode, router, t]); // Dependency array

  // --- Render Logic --- 

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-2 text-gray-600 dark:text-gray-400">
          <ShoppingCart className="h-10 w-10 animate-pulse text-blue-500" />
          <p>{t('shareLink.loadingList')}...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <Card className="w-full max-w-md text-center shadow-lg bg-white dark:bg-gray-800">
          <CardHeader>
            <CardTitle className="text-red-600 dark:text-red-500">{t('shareLink.errorTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 dark:text-gray-300 mb-4">{error}</p>
            <Button onClick={() => router.push('/')}>{t('shareLink.backToHome')}</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Read-only view for guests
  if (readOnlyData) {
    return (
      // Slightly softer background gradient
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-slate-900 p-4 sm:p-8 flex items-center justify-center">
        {/* Ensure card doesn't stretch too wide and has vertical margin */}
        <div className="max-w-2xl w-full mx-auto my-8">
          {/* Use Card component with adjusted styling */}
          <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden rounded-lg">
            {/* Center content in header, adjust padding */}
            <CardHeader className="p-6 text-center border-b dark:border-gray-700">
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-2">{t('shareLink.sharedListTitle')}</p>
              {/* Larger title */}
              <CardTitle className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-gray-100 break-words mb-3">
                {readOnlyData.list_name || t('shareLink.defaultListName')}
              </CardTitle>
              {/* Centered prompt */}
              <p className="text-base text-gray-600 dark:text-gray-400 mb-6">{t('shareLink.loginPrompt')}</p>
              {/* Buttons layout: Stacked on small screens, side-by-side on larger */}
              <div className="flex flex-col sm:flex-row justify-center items-center gap-3">
                <Button asChild size="lg" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-3">
                  <Link href={`/login?shareCode=${shareCode}`}>
                    <LogIn className="mr-2 h-4 w-4" />
                    {t('shareLink.loginButton')}
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="w-full sm:w-auto px-6 py-3 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                  <Link href={`/login?view=register&shareCode=${shareCode}`}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    {t('shareLink.registerButton')}
                  </Link>
                </Button>
              </div>
            </CardHeader>
            {/* More padding in content, border around list */}
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4 text-lg text-gray-800 dark:text-gray-200">{t('shareLink.itemsTitle')}</h3>
              {readOnlyData.items.length > 0 ? (
                <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
                  <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                    {readOnlyData.items.map((item, index) => (
                      <li 
                        key={index} 
                        className="flex items-center gap-4 px-4 sm:px-5 py-4 bg-white dark:bg-gray-800 transition-colors duration-150 ease-in-out hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      >
                        <Check 
                          className={`h-6 w-6 shrink-0 ${item.item_purchased ? 'text-green-500 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`} 
                        />
                        <span className={`flex-1 text-base ${item.item_purchased ? 'line-through text-gray-500 dark:text-gray-400 decoration-gray-400 dark:decoration-gray-500' : 'text-gray-900 dark:text-gray-100'}`}>
                          {item.item_name}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-base text-center text-gray-500 dark:text-gray-400 py-6">{t('shareLink.noItems')}</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Fallback or initial state (should ideally be covered by loading/error)
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <p>{t('shareLink.loadingList')}...</p>
    </div>
  );
} 