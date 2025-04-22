'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/services/supabase';
import { toast, clearAllToasts } from '@/components/ui/toast';
import Header from '@/components/layout/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Clock, CheckCircle, Package, Send, Receipt, Plus, RefreshCw, Trash2, AlertCircle, Inbox, EyeOff, Save } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow, format, parseISO } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from "@/lib/utils";
import { useTheme } from 'next-themes';
import { ConfirmDialog } from "@/components/confirm-dialog";
import SelectRecipientDialog from "@/components/lists/select-recipient-dialog";
import { createNotification, type CreateNotificationParams } from '@/services/notifications';

interface ShoppingList {
  id: string;
  name: string;
  share_code: string;
  creator_username: string;
  recipient_username: string;
  status: string;
  created_at: string;
  updated_at: string;
  items_count?: number;
  completed_items_count?: number;
  completion_percentage?: number;
  items?: ListItem[];
}

interface ListItem {
  id: string;
  purchased: boolean;
  name?: string;
  list_id?: string;
}

export default function ListsPage() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState('');
  const [sentLists, setSentLists] = useState<ShoppingList[]>([]);
  const [receivedLists, setReceivedLists] = useState<ShoppingList[]>([]);
  const [tab, setTab] = useState<'sent' | 'received'>('received');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [listToDelete, setListToDelete] = useState<string | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [listToSendId, setListToSendId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSendingDraft, setIsSendingDraft] = useState(false);
  const dateLocale = i18n.language.startsWith('ar') ? ar : enUS;
  const { theme } = useTheme();

  useEffect(() => {
    const checkAuthAndLoadLists = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast.info(t('auth.loginRequired'), 2000);
          router.push('/login');
          return;
        }
        let username = user.user_metadata?.username || '';
        if (!username) {
          try {
            const { data: profileData } = await supabase.from('users').select('username').eq('id', user.id).single();
            if (profileData) username = profileData.username;
          } catch (profileError) { console.error('Error fetching username:', profileError); }
        }
        if (!username) {
          toast.error(t('lists.usernameNotFound'), 2000);
          router.push('/profile');
          return;
        }
        setCurrentUser(username);
        loadSentLists(username, false);
        loadReceivedLists(username, false);
      } catch (error) {
        toast.error(t('auth.authCheckError'), 2000);
      } finally {
        setIsLoading(false);
      }
    };
    clearAllToasts();
    setIsLoading(true);
    checkAuthAndLoadLists();
    const searchParams = new URLSearchParams(window.location.search);
    const tabParam = searchParams.get('tab');
    if (tabParam && (tabParam === 'sent' || tabParam === 'received')) setTab(tabParam);

    const changes = supabase.channel('lists-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lists' },
        (payload) => {
          console.log('List change received!', payload);
          if (currentUser) {
            const changedList = payload.new as ShoppingList | undefined;
            const oldList = payload.old as ShoppingList | undefined;
            const relevantUsername = changedList?.creator_username === currentUser || changedList?.recipient_username === currentUser || oldList?.creator_username === currentUser || oldList?.recipient_username === currentUser;
            if (relevantUsername) {
              loadSentLists(currentUser, false);
              loadReceivedLists(currentUser, false);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'items' },
         async (payload) => {
          console.log('Item change received!', payload);
          if (currentUser) {
            const listId = (payload.new as ListItem | undefined)?.list_id || (payload.old as ListItem | undefined)?.list_id;
            if (listId) {
                try {
                    const { data: listData, error } = await supabase
                        .from('lists')
                        .select('creator_username, recipient_username')
                        .eq('id', listId)
                        .single();
                    if (error) throw error;
                    if (listData && (listData.creator_username === currentUser || listData.recipient_username === currentUser)) {
                        loadSentLists(currentUser, false);
                        loadReceivedLists(currentUser, false);
                    }
                } catch (e) {
                    console.error("Error checking list ownership on item change:", e);
                }
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(changes);
      clearAllToasts();
    }
  }, [currentUser, router, t]);
  
  const loadSentLists = async (username: string, showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      const { data: lists, error } = await supabase
        .from('lists')
        .select('*, items(id, purchased, name)')
        .eq('creator_username', username)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const formattedLists = processLists(lists);
      setSentLists(formattedLists);
    } catch (error) { toast.error(t('lists.loadSentError'), 2000); }
    finally { if (showLoading) setIsLoading(false); }
  };
  
  const loadReceivedLists = async (username: string, showLoading = true) => {
    if (showLoading) setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        console.error("Cannot load received lists without current user ID.");
        if (showLoading) setIsLoading(false);
        return;
    }
    try {
      const { data: accessibleLists, error: rpcError } = await supabase
        .rpc('get_accessible_received_lists', { p_user_id: user.id }); 

      if (rpcError) throw rpcError;

      const listsWithItems = await Promise.all((accessibleLists || []).map(async (list: ShoppingList) => {
          const { data: items, error: itemsError } = await supabase
              .from('items')
              .select('id, purchased, name')
              .eq('list_id', list.id);
          if (itemsError) {
              console.error(`Error fetching items for list ${list.id}:`, itemsError);
              return { ...list, items: [] };
          }
          return { ...list, items: items || [] };
      }));
      
      listsWithItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      const formattedLists = processLists(listsWithItems);

      setReceivedLists(formattedLists);
    } catch (error) {
      console.error("Error in loadReceivedLists:", error);
      toast.error(t('lists.loadReceivedError'), 2000); 
    } finally { 
        if (showLoading) setIsLoading(false); 
    }
  };
  
  const processLists = (lists: ShoppingList[] | null): ShoppingList[] => {
      if (!lists) return [];
      return lists.map((list: ShoppingList) => {
        const itemsArray = list.items as ListItem[] || [];
        const itemsCount = itemsArray.length;
        const completedItemsCount = itemsArray.filter(item => item.purchased).length;
        const completionPercentage = itemsCount > 0 ? Math.round((completedItemsCount / itemsCount) * 100) : 0;
        let displayStatus = list.status;
        if (completionPercentage === 100 && list.status !== 'completed') displayStatus = 'completed';
        else if (completionPercentage > 0 && completionPercentage < 100 && list.status === 'new') displayStatus = 'opened';

        return {
            ...list,
            status: displayStatus,
            items_count: itemsCount,
            completed_items_count: completedItemsCount,
            completion_percentage: completionPercentage,
            items: itemsArray
        };
    });
  };

  const openListDetails = (listId: string) => router.push(`/lists/${listId}`);
  const navigateToCreateList = () => { router.push('/create-list'); toast.info(t('lists.creatingNewListInfo')); };

  const renderStatusBadge = (status: string) => {
    let statusText = '';
    let Icon = Clock;
    let colorClasses = 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    switch (status) {
      case 'new': statusText = t('lists.statusNew'); Icon = Package; colorClasses = 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'; break;
      case 'opened':
      case 'in_progress': 
        statusText = t('lists.statusOpened'); 
        Icon = ShoppingCart; 
        colorClasses = 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300'; 
        break;
      case 'completed': statusText = t('lists.statusCompleted'); Icon = CheckCircle; colorClasses = 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'; break;
      case 'draft':
        statusText = t('lists.statusDraft'); 
        Icon = Save;
        colorClasses = 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
        break;
      default: statusText = status; Icon = AlertCircle;
    }
    return (
      <Badge className={`flex items-center gap-1 text-xs font-medium ${colorClasses}`}>
        <Icon size={12} />
        <span>{statusText}</span>
      </Badge>
    );
  };
  
  const refreshLists = useCallback(async () => {
    if (!currentUser || isRefreshing) return;
    setIsRefreshing(true);
    try {
      clearAllToasts();
      await loadSentLists(currentUser, false);
      await loadReceivedLists(currentUser, false);
      if (tab === 'sent') toast.success(t('lists.refreshSentSuccess'), 1000);
      else toast.success(t('lists.refreshReceivedSuccess'), 1000);
    } catch (error) { toast.error(t('lists.refreshError'), 2000); }
    finally { setIsRefreshing(false); }
  }, [currentUser, isRefreshing, tab, t]);
  
  const handleHideList = async (listIdToHide: string) => {
    if (isProcessingAction) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error(t('auth.loginRequired'));
      return;
    }

    setIsProcessingAction(true);
    try {
      const { data: insertData, error } = await supabase
        .from('recipient_hidden_lists')
        .insert({ user_id: user.id, list_id: listIdToHide })
        .select();

      if (error) {
        if (error.code === '23505') {
          toast.info(t('lists.alreadyDeletedInfo'));
          setReceivedLists(prev => prev.filter(list => list.id !== listIdToHide));
          setSentLists(prev => prev.filter(list => list.id !== listIdToHide));
        } else {
          console.error('Error hiding list:', error);
          toast.error(t('lists.deleteListError'));
        }
      } else {
        setReceivedLists(prev => prev.filter(list => list.id !== listIdToHide));
        setSentLists(prev => prev.filter(list => list.id !== listIdToHide));
        toast.success(t('lists.deleteSuccess'));
      }
    } catch (e) {
      console.error('Unexpected error hiding list:', e);
      toast.error(t('lists.deleteUnexpectedError'));
    } finally {
      setIsProcessingAction(false);
    }
  };
  
  const deleteList = useCallback(async (listId: string | null) => {
    if (!listId || isDeleting) return;
    setIsDeleting(true);
    try {
      const { error: itemsError } = await supabase.from('items').delete().eq('list_id', listId);
      if (itemsError) { 
        toast.error(t('lists.deleteItemsError'), 2000); 
        setIsDeleting(false); 
        return; 
      } 
      const { error: listError } = await supabase.from('lists').delete().eq('id', listId);
      if (listError) { 
        toast.error(t('lists.deleteListError'), 2000); 
        setIsDeleting(false); 
        return; 
      }
      setSentLists(prevLists => prevLists.filter(list => list.id !== listId));
      setReceivedLists(prevLists => prevLists.filter(list => list.id !== listId)); 
      toast.success(t('lists.deleteSuccess'), 2000);
    } catch (error) { 
      toast.error(t('lists.deleteUnexpectedError'), 2000); 
    } finally { 
      setIsDeleting(false); 
      setListToDelete(null);
    } 
  }, [isDeleting, t]);
  
  const EmptyListsMessage = ({ type }: { type: 'sent' | 'received' }) => {
    const MotionButton = motion(Button);
    const { theme } = useTheme();
    const buttonContentVariants = {
      rest: { y: 0 },
      hover: { y: -2 }
    };
    const buttonTransition = { 
      type: 'spring', 
      stiffness: 400, 
      damping: 15,
      staggerChildren: 0.05
    };

    const gradientLight = "linear-gradient(100deg, #1e40af, #1d4ed8, #2563eb, #1d4ed8, #1e40af)";
    const gradientDark = "linear-gradient(100deg, #2563eb, #3b82f6, #60a5fa, #3b82f6, #2563eb)";

    return (
      <Card className="border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-xl overflow-hidden mt-6">
        <CardContent className="flex flex-col items-center justify-center p-10 text-center">
          {type === 'sent' ? <Send className="h-12 w-12 text-gray-400 dark:text-gray-500 mb-3" /> : <Inbox className="h-12 w-12 text-gray-400 dark:text-gray-500 mb-3" />}
          <h3 className="text-lg font-medium text-gray-600 dark:text-gray-300 mb-2">
            {type === 'sent' ? t('lists.noSentLists') : t('lists.noReceivedLists')}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4 max-w-md">
            {type === 'sent' ? t('lists.noSentListsMessage') : t('lists.noReceivedListsMessage')}
          </p>
          {type === 'sent' && (
            <MotionButton 
              onClick={navigateToCreateList} 
              className="mt-4 text-white rounded-lg shadow-md transition-colors duration-200 relative overflow-hidden px-5 py-2.5"
              style={{
                backgroundImage: theme === 'light' ? gradientLight : gradientDark,
                backgroundSize: "400% 100%", 
              }}
              animate={{
                backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] 
              }}
              whileHover="hover" 
              initial="rest"
              transition={{
                 backgroundPosition: {
                   duration: 5, 
                   repeat: Infinity,
                   repeatType: "loop",
                   ease: "linear"
                 },
                 ...buttonTransition 
              }}
            >
              <motion.span variants={buttonContentVariants} className="flex items-center justify-center">
                <motion.span variants={buttonContentVariants} className="inline-block mr-1">
                    <Plus className="h-4 w-4" />
                </motion.span>
                <motion.span variants={buttonContentVariants} className="inline-block">
                    {t('lists.createNewList')}
                </motion.span>
              </motion.span>
            </MotionButton>
          )}
        </CardContent>
      </Card>
    );
  };
  
  const handleInitiateSendDraft = (listId: string) => {
    setListToSendId(listId);
    setIsDialogOpen(true);
  };

  const findUserByUsername = async (username: string): Promise<{ id: string; username: string; } | null> => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, username')
        .eq('username', username)
        .limit(1);
      
      if (error) {
        console.error('Error fetching user by username:', error);
        return null;
      }
      
      if (data && data.length > 0) {
          return data[0];
      } else {
          return null;
      }
      
    } catch (error) {
      console.error('Exception in findUserByUsername:', error);
      return null;
    }
  };

  const handleSendDraftList = async (recipientUsername: string) => {
    if (!listToSendId) {
        console.error('handleSendDraftList called without listToSendId.');
        toast.error(t('lists.sendDraftErrorGeneric')); 
        return;
    }
    if (!currentUser) {
        console.error('handleSendDraftList called without currentUser.');
        toast.error(t('auth.authCheckError')); 
        return;
    }

    setIsSendingDraft(true);
    try {
        const recipient = await findUserByUsername(recipientUsername);
        if (!recipient) {
            toast.error(t('createList.recipientNotFound', { name: recipientUsername }), 2000);
            setIsSendingDraft(false);
            return;
        }

        // 2. Update the list in Supabase
        const { error: updateError } = await supabase
            .from('lists')
            .update({
                recipient_id: recipient.id,
                recipient_username: recipient.username,
                status: 'new',
                updated_at: new Date().toISOString()
            })
            .eq('id', listToSendId)
            .eq('creator_username', currentUser);

        if (updateError) {
            console.error('[handleSendDraftList] Error updating list:', updateError);
        } else {
            console.log('[handleSendDraftList] List update successful for ID:', listToSendId);
        }

        if (updateError) {
            console.error('Error updating draft list status:', updateError);
            toast.error(t('lists.sendDraftUpdateError'));
            setIsSendingDraft(false);
            return;
        }

        // 3. Notification is now handled by the new backend trigger 'on_list_sent_update_notification'.
        //    Remove the client-side call attempt.
        /*
        try {
            const notificationParams: CreateNotificationParams = {
                recipientUserId: recipient.id,
                message: t('notifications.newListReceived', { sender: currentUser }),
                type: 'NEW_LIST',
                relatedListId: listToSendId
            };
            console.log("[handleSendDraftList] Attempting client-side notification:", JSON.stringify(notificationParams, null, 2));
            await createNotification(notificationParams);
            console.log("[handleSendDraftList] Client-side notification call finished (may have failed due to CORS).");
        } catch (notificationError) {
            console.error('Error during client-side notification call for sent draft (proceeding anyway):', notificationError);
        }
        */

        // 4. Success feedback and UI update
        toast.success(t('lists.sendDraftSuccess'));
        await loadSentLists(currentUser, false);

    } catch (error) {
        console.error('Unexpected error sending draft list:', error);
        toast.error(t('lists.sendDraftErrorGeneric'));
    } finally {
        setIsSendingDraft(false);
        setIsDialogOpen(false); // Close the dialog
        setListToSendId(null); // Reset the ID
    }
  };

  const handleSelectRecipient = async (recipientUsername: string) => {
      if (listToSendId) {
         await handleSendDraftList(recipientUsername);
      } else {
          console.warn("handleSelectRecipient called without a listToSendId in ListsPage");
          setIsDialogOpen(false);
      }
  };

  const ListCard = ({ list, isSent }: { list: ShoppingList, isSent: boolean }) => {
    const listTitle = list.name || 
                      (isSent 
                        ? t('lists.untitledListFallback', { name: list.recipient_username })
                        : t('lists.untitledListFallback', { name: list.creator_username }));
    
    const itemsCount = list.items_count ?? 0;
    const completedItemsCount = list.completed_items_count ?? 0;
    const completionPercentage = list.completion_percentage ?? 0;

    let statusText = t('lists.statusNew');
    if (list.status === 'completed') {
        statusText = t('lists.statusCompleted');
    } else if (list.status === 'opened' || list.status === 'in_progress') {
        statusText = t('lists.statusOpened');
    }

    const formatDate = (dateString: string) => {
      try {
        const date = parseISO(dateString);
        return formatDistanceToNow(date, { addSuffix: true, locale: dateLocale });
      } catch (error) {
        console.error("Error formatting relative date:", dateString, error);
        return t('common.unknownTime');
      }
    };

    const handleDeleteClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setListToDelete(list.id);
    };

    const handleHideClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        handleHideList(list.id);
    };

    let progressBarColor = 'bg-blue-500 dark:bg-blue-600';
    if (list.status === 'completed') {
      progressBarColor = 'bg-green-500 dark:bg-green-600';
    } else if (list.status === 'opened' || list.status === 'in_progress') {
      progressBarColor = 'bg-yellow-500 dark:bg-yellow-600';
    }

    return (
      <Card
        key={list.id}
        onClick={() => openListDetails(list.id)}
        className={cn(
          "bg-white dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-300 overflow-hidden relative rounded-xl",
          "cursor-pointer",
          isProcessingAction && "opacity-70"
        )}
      >
        <CardContent className="p-4">
          <div className="flex flex-col space-y-4">
            <div className="flex justify-between items-start gap-2">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="bg-blue-100 dark:bg-blue-900/50 p-2 rounded-full shrink-0">
                  {isSent ? <Send className="h-5 w-5 text-blue-600 dark:text-blue-400" /> : <Inbox className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
                </div>
                <div className="min-w-0">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                    {listTitle}
                  </h3>
                  <div className="flex items-center flex-wrap gap-x-2 gap-y-1 mt-1 text-sm text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1 shrink-0"><ShoppingCart className="h-4 w-4" /><span>{t('lists.item', { count: itemsCount })}</span></span>
                    {completedItemsCount > 0 && (
                      <span className="flex items-center gap-1 shrink-0"><span className="hidden sm:inline mx-1">•</span><span>{t('lists.purchased', { count: completedItemsCount })}</span></span>
                    )}
                    <span className="flex items-center gap-1 shrink-0"><span className="hidden sm:inline mx-1">•</span><span>{formatDate(list.updated_at)}</span></span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {renderStatusBadge(list.status)}
                {isSent ? (
                  <div className="flex items-center gap-1">
                    {list.status === 'draft' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleInitiateSendDraft(list.id);
                        }}
                        className="p-1.5 rounded-full text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900/30 transition-colors"
                        title={t('createList.sendNowButton')}
                        disabled={isSendingDraft}
                      >
                        <Send className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={handleDeleteClick}
                      className="p-1.5 rounded-full text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      title={t('lists.deleteList')}
                      disabled={isDeleting || isSendingDraft}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                   <button
                      onClick={handleHideClick}
                      className="p-1.5 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
                      title={t('lists.hideList')}
                      disabled={isProcessingAction}
                    >
                      <EyeOff className="h-4 w-4" />
                    </button>
                 )}
              </div>
            </div>

            <div className="mt-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-600 dark:text-gray-300">
                  {statusText}
                </span>
                <span className="font-medium">{completionPercentage}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all duration-500 ease-in-out ${progressBarColor}`}
                  style={{ width: `${completionPercentage}%` }}
                ></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };
  
  const tabContentVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
    exit: { opacity: 0, y: -10, transition: { duration: 0.2, ease: "easeIn" } }
  };

  const tubelightTransition = {
    type: "spring",
    stiffness: 500,
    damping: 40,
  };

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
  
  return (
    <div className="container mx-auto p-4 pt-0 pb-20">
      <Header 
        title={t('lists.pageTitle')} 
        extras={(
          <motion.div
            animate={{
              scale: [1, 1.03, 1],
              boxShadow: [
                "0 0 0 0 rgba(59, 130, 246, 0.3)",
                "0 0 0 6px rgba(59, 130, 246, 0)",
                "0 0 0 0 rgba(59, 130, 246, 0.3)"
              ]
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              repeatType: "loop",
              ease: "easeInOut",
              delay: 0.5
            }}
            className="rounded-lg"
          >
            <Button 
              variant="outline"
              size="sm"
              className="flex items-center gap-1 text-xs p-1 h-auto bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800 border-blue-200 dark:border-blue-700 relative z-10"
              onClick={navigateToCreateList}
            >
              <Plus className="h-4 w-4" />
              <span>{t('lists.createNewList')}</span>
            </Button>
          </motion.div>
        )}
      />
      
      {listToDelete && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-40 flex items-center justify-center p-4 animate__fadeIn animate__faster">
          <Card className="w-full max-w-md z-50 shadow-xl border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800">
            <CardContent className="p-6">
              <div className="flex gap-4 items-start">
                <AlertCircle className="h-6 w-6 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-red-800 dark:text-red-300 mb-2">
                    {t('lists.deleteConfirmTitle')}
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300 mb-4">
                    {t('lists.deleteConfirmMessage')}
                  </p>
                  <div className="flex gap-2 justify-end">
                    <Button onClick={() => deleteList(listToDelete)} disabled={isDeleting} className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800">
                      {isDeleting ? t('lists.deleting') : t('lists.yesDeleteList')}
                    </Button>
                    <Button variant="outline" onClick={() => { setListToDelete(null); }} disabled={isDeleting} className="border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300">
                      {t('common.cancel')}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      <div className="mt-8">
        <Tabs
          defaultValue="received"
          value={tab}
          className="w-full"
          onValueChange={(value) => {
            const newTab = value as 'sent' | 'received';
            setTab(newTab);
            const url = new URL(window.location.href);
            url.searchParams.set('tab', newTab);
            window.history.pushState({}, '', url.toString());
          }}
        >
          <motion.div layout className="mb-6">
            <TabsList className="grid w-full grid-cols-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
              <TabsTrigger
                value="received"
                className="relative flex-1 data-[state=active]:text-blue-700 dark:data-[state=active]:text-white rounded-lg py-2.5 flex items-center justify-center gap-1.5 focus-visible:ring-offset-0 focus-visible:ring-2 focus-visible:ring-blue-400 dark:focus-visible:ring-blue-500 outline-none transition-colors duration-300"
              >
                 <span className="relative z-10 flex items-center justify-center gap-1.5">
                   <Inbox className="h-4 w-4" />
                   <span>{t('lists.receivedTab')}</span>
                   <Badge className="ml-1.5 bg-white/80 text-blue-800 dark:bg-blue-500/30 dark:text-blue-200 font-normal px-1.5 py-0.5 text-xs">
                      {receivedLists.length}
                    </Badge>
                 </span>
                  {tab === 'received' && (
                     <motion.div
                      layoutId="tab-indicator"
                      className="absolute bottom-0 left-0 right-0 h-[3px] px-4 z-0"
                      initial={false}
                      transition={tubelightTransition}
                      style={{ borderRadius: '2px' }}
                    >
                      <div className="w-full h-full bg-blue-500 dark:bg-blue-400 rounded-full">
                         <div className="absolute inset-0 bg-blue-500/30 dark:bg-blue-400/30 blur-md rounded-full" />
                      </div>
                    </motion.div>
                  )}
              </TabsTrigger>
              
              <TabsTrigger
                value="sent"
                 className="relative flex-1 data-[state=active]:text-blue-700 dark:data-[state=active]:text-white rounded-lg py-2.5 flex items-center justify-center gap-1.5 focus-visible:ring-offset-0 focus-visible:ring-2 focus-visible:ring-blue-400 dark:focus-visible:ring-blue-500 outline-none transition-colors duration-300"
              >
                 <span className="relative z-10 flex items-center justify-center gap-1.5">
                   <Send className="h-4 w-4" />
                   <span>{t('lists.sentTab')}</span>
                   <Badge className="ml-1.5 bg-white/80 text-blue-800 dark:bg-blue-500/30 dark:text-blue-200 font-normal px-1.5 py-0.5 text-xs">
                      {sentLists.length}
                    </Badge>
                 </span>
                  {tab === 'sent' && (
                    <motion.div
                      layoutId="tab-indicator"
                      className="absolute bottom-0 left-0 right-0 h-[3px] px-4 z-0"
                      initial={false}
                      transition={tubelightTransition}
                      style={{ borderRadius: '2px' }}
                    >
                      <div className="w-full h-full bg-blue-500 dark:bg-blue-400 rounded-full">
                        <div className="absolute inset-0 bg-blue-500/30 dark:bg-blue-400/30 blur-md rounded-full" />
                      </div>
                    </motion.div>
                  )}
              </TabsTrigger>
            </TabsList>
          </motion.div>
          
          <AnimatePresence mode='wait'>
            {tab === 'sent' && (
              <motion.div
                key="sent-content"
                variants={tabContentVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <TabsContent value="sent" className="space-y-4 mt-0">
                  <div className="flex justify-between items-center mb-3">
                      <h2 className="text-lg font-medium dark:text-white">
                          {t('lists.sentLists')}
                      </h2>
                      <div className="flex items-center gap-2">
                          <Button
                              onClick={refreshLists}
                              variant="outline"
                               size="sm"
                              className="flex items-center gap-1 text-xs"
                              disabled={isRefreshing}
                          >
                              <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                              <span>{t('lists.refresh')}</span>
                          </Button>
                      </div>
                  </div>
                  {sentLists.length > 0 ? (
                      <div className="grid gap-4">
                          {sentLists.map(list => (
                              <ListCard key={list.id} list={list} isSent={true} />
                          ))}
                      </div>
                  ) : (
                      <EmptyListsMessage type="sent" />
                  )}
                </TabsContent>
              </motion.div>
            )}

            {tab === 'received' && (
              <motion.div
                key="received-content"
                variants={tabContentVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <TabsContent value="received" className="space-y-4 mt-0" forceMount>
                  <div className="flex justify-between items-center mb-3">
                      <h2 className="text-lg font-medium dark:text-white">
                          {t('lists.receivedLists')}
                      </h2>
                      <Button
                          onClick={refreshLists}
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-1 text-xs"
                          disabled={isRefreshing}
                      >
                          <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                          <span>{t('lists.refresh')}</span>
                      </Button>
                  </div>
                  {receivedLists.length > 0 ? (
                       <div className="grid gap-4">
                          {receivedLists.map(list => (
                              <ListCard key={list.id} list={list} isSent={false} />
                          ))}
                      </div>
                  ) : (
                      <EmptyListsMessage type="received" />
                  )}
                </TabsContent>
              </motion.div>
            )}
          </AnimatePresence>
        </Tabs>
      </div>

      <SelectRecipientDialog
          isOpen={isDialogOpen}
          onClose={() => {
              setIsDialogOpen(false);
              setListToSendId(null);
          }}
          onSelectRecipient={handleSelectRecipient}
          currentUser={currentUser}
          isSending={isSendingDraft}
      />
    </div>
  );
} 