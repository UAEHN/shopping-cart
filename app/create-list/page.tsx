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
import { ShoppingCart, Plus, X, Send, Trash2, RefreshCw } from 'lucide-react';
import SelectRecipientDialog from '@/components/lists/select-recipient-dialog';
import { createNotification, type CreateNotificationParams } from '@/services/notifications';
import { useTranslation } from 'react-i18next';

interface ListItem {
  id: string;
  name: string;
  list_id?: string;
}

export default function CreateListPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [listItems, setListItems] = useState<ListItem[]>([]);
  const [newItem, setNewItem] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast.info(t('auth.loginRequired'), 2000);
          router.push('/login');
          return;
        }
        const userMetadata = user.user_metadata;
        let username = '';
        if (userMetadata && userMetadata.username) {
          username = userMetadata.username;
        } else {
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
          toast.error(t('lists.usernameNotFound'), 2000);
          router.push('/profile');
          return;
        }
        setCurrentUser(username);
        setIsLoading(false);
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus();
          }
        }, 500);
      } catch (error) {
        console.error('Error checking auth:', error);
        toast.error(t('auth.authCheckError'), 2000);
        router.push('/login');
      }
    };
    clearAllToasts();
    checkAuth();
    return () => {
      clearAllToasts();
    };
  }, [router, t]);

  const addItem = () => {
    if (!newItem.trim()) return;
    const trimmedItem = newItem.trim();
    const itemExists = listItems.some(item =>
      item.name.toLowerCase() === trimmedItem.toLowerCase()
    );
    if (itemExists) {
      toast.error(t('createList.itemAlreadyExists'), 1500);
      return;
    }
    const newId = Date.now().toString();
    setListItems(prev => [...prev, { id: newId, name: trimmedItem }]);
    setNewItem('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const removeItem = (id: string) => {
    setListItems(prev => prev.filter(item => item.id !== id));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addItem();
    }
  };

  const openSelectRecipientDialog = () => {
    if (listItems.length === 0) {
      toast.error(t('createList.cannotSendEmpty'), 1500);
      return;
    }
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

  const handleSelectRecipient = async (recipientUsername: string) => {
    setIsSending(true);
    setIsDialogOpen(false);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        console.error('Error getting current user for list creation:', authError);
        toast.error(t('createList.currentUserError'), 2000);
        setIsSending(false);
        return;
    }
    const currentUserId = user.id;
    const currentUserUsername = user.user_metadata?.username || (await findUserByUsername(user.email || ''))?.username || '';
    if (!currentUserUsername) {
        console.error('Could not determine current username for list creation');
        toast.error(t('createList.currentUsernameError'), 2000);
        setIsSending(false);
        return;
    }
    try {
      const recipient = await findUserByUsername(recipientUsername);
      if (!recipient) {
        toast.error(t('createList.recipientNotFound', { name: recipientUsername }), 2000);
        setIsSending(false);
        return;
      }
      const listToInsert = {
        creator_id: currentUserId,
        recipient_id: recipient.id,
        creator_username: currentUserUsername,
        recipient_username: recipient.username,
        status: 'new'
      };
      const { data: newListData, error: listError } = await supabase
        .from('lists')
        .insert(listToInsert)
        .select('id')
        .single();
      if (listError || !newListData) {
        console.error('Error creating list:', listError);
        toast.error(t('createList.listCreationError'), 2000);
        setIsSending(false);
        return;
      }
      const listId = newListData.id;
      const itemsToInsert = listItems.map(item => ({
        name: item.name,
        list_id: listId,
        purchased: false
      }));
      const { error: itemsError } = await supabase.from('items').insert(itemsToInsert);
      if (itemsError) {
        console.error('Error inserting items:', itemsError);
        toast.error(t('createList.itemInsertionError'), 2000);
        setIsSending(false);
        return;
      }
      
      console.log("List ID for notification:", listId);
      
      try {
        const notificationParams: CreateNotificationParams = {
          recipientUserId: recipient.id,
          message: t('notifications.newListReceived', { sender: currentUserUsername }),
          type: 'NEW_LIST',
          relatedListId: listId
        };

        console.log("Calling createNotification with params:", notificationParams);

        await createNotification(notificationParams);

        console.log('Notification creation attempt finished.');
      } catch (notificationError) {
        console.error('Error creating notification (will proceed anyway):', notificationError);
      }
      toast.success(t('createList.listSentSuccess'), 2000);
      router.push('/lists?tab=sent');
    } catch (error) {
      console.error('Unexpected error sending list:', error);
      toast.error(t('createList.unexpectedError'), 2000);
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
          <span className="text-xl">{t('common.loading')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 pt-0 pb-20">
      <Header title={t('createList.pageTitle')} showBackButton />

      <div className="space-y-6 mt-8">
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950 dark:to-gray-900 dark:border-blue-800 transition-all duration-300 hover:shadow-lg rounded-2xl overflow-hidden">
          <CardContent className="p-6">
            <div className="flex flex-col items-center mb-4">
              <div className="bg-blue-100 dark:bg-blue-900 p-4 rounded-full mb-4 shadow-inner">
                <ShoppingCart className="h-10 w-10 text-blue-600 dark:text-blue-300" />
              </div>
              <h1 className="text-xl font-bold text-center text-gray-800 dark:text-gray-200">
                {t('createList.cardTitle')}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-center mt-2 text-sm">
                {t('createList.cardDescription')}
              </p>
            </div>

            <div className="relative mt-6">
              <div className="relative bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm focus-within:shadow-md transition-all duration-200 border border-gray-200 dark:border-gray-700 flex">
                <Input
                  ref={inputRef}
                  type="text"
                  placeholder={t('createList.addItemPlaceholder')}
                  value={newItem}
                  onChange={(e) => setNewItem(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="border-0 shadow-none focus-visible:ring-0 py-6 text-base flex-1"
                  aria-label={t('createList.addItemLabel')}
                />
                <Button
                  type="button"
                  onClick={addItem}
                  className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 h-full px-4 rounded-r-xl"
                  aria-label={t('createList.addButton')}
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
                <span>{t('createList.itemsListTitle')}</span>
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
                <span>{t('createList.clearAllButton')}</span>
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
                      <span className="font-medium text-gray-800 dark:text-gray-100">{item.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 rounded-full text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30"
                        onClick={() => removeItem(item.id)}
                        aria-label={t('createList.removeItemAria', { name: item.name })}
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
                {isSending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    <span>{t('createList.sendingButton')}</span>
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5" />
                    <span>{t('createList.sendButton')}</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>

      <SelectRecipientDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSelectRecipient={handleSelectRecipient}
        currentUser={currentUser}
        isSending={isSending}
      />
    </div>
  );
} 