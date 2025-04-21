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
import { ShoppingCart, Plus, X, Send, Trash2, RefreshCw, ArrowRight, Check, Pencil } from 'lucide-react';
import SelectRecipientDialog from '@/components/lists/select-recipient-dialog';
import { createNotification, type CreateNotificationParams } from '@/services/notifications';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

interface ListItem {
  id: string;
  name: string;
  list_id?: string;
}

// Define Step type
type CreationStep = 'enterName' | 'addItems';

export default function CreateListPage() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const [step, setStep] = useState<CreationStep>('enterName'); // State for current step
  const [listName, setListName] = useState(''); // State for list name
  const [listItems, setListItems] = useState<ListItem[]>([]);
  const [newItem, setNewItem] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<string>('');
  const [isEditingName, setIsEditingName] = useState(false); // <-- New state for editing name
  const nameInputRef = useRef<HTMLInputElement>(null); // Ref for name input
  const itemInputRef = useRef<HTMLInputElement>(null); // Ref for item input
  const editableNameInputRef = useRef<HTMLInputElement>(null); // Ref for the editable input

  // Function to get current locale for date-fns
  const getDateLocale = () => {
    return i18n.language === 'ar' ? ar : enUS;
  };

  useEffect(() => {
    // Focus the name input when the component mounts and step is 'enterName'
    if (step === 'enterName' && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [step]); // Dependency on step ensures focus logic runs when step changes

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
        // Focus logic moved to the other useEffect based on step
        // setTimeout(() => {
        //   if (itemInputRef.current) {
        //     itemInputRef.current.focus();
        //   }
        // }, 500);
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

  // Handle submitting the list name and moving to the next step
  const handleNameSubmit = () => {
    const nameToSet = listName.trim() || t('createList.defaultListName', { date: format(new Date(), 'P', { locale: getDateLocale() }) });
    setListName(nameToSet);
    setStep('addItems'); // Directly move to addItems
    setTimeout(() => {
      if (itemInputRef.current) {
        itemInputRef.current.focus();
      }
    }, 0);
  };

  // Handle Enter key press on the name input
  const handleNameKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleNameSubmit();
    }
  };

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
    if (itemInputRef.current) {
      itemInputRef.current.focus();
    }
  };

  const removeItem = (id: string) => {
    setListItems(prev => prev.filter(item => item.id !== id));
  };

  // Handle Enter key press on the item input
  const handleItemKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
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

  // Placeholder for future implementation
  const handleSaveForLater = async () => {
    setIsSending(true);
    console.log("Saving list:", listName, listItems);

    // 1. Get current user ID and username
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Error getting current user for saving draft:', authError);
      toast.error(t('createList.currentUserError'), 2000);
      setIsSending(false);
      return;
    }
    const currentUserId = user.id;
    // Fetch username from public.users table as it might not be in metadata
    let currentUserUsername = '';
    try {
        const { data: profileData } = await supabase
          .from('users')
          .select('username')
          .eq('id', currentUserId)
          .single();
        if (profileData) {
          currentUserUsername = profileData.username;
        } else {
            throw new Error('Profile not found')
        }
      } catch (profileError) {
        console.error('Could not determine current username for saving draft:', profileError);
        toast.error(t('createList.currentUsernameError'), 2000);
        setIsSending(false);
        return;
    }

    try {
      // 2. Insert into public.lists with status 'draft'
      const listToInsert = {
        creator_id: currentUserId,
        creator_username: currentUserUsername,
        status: 'draft',
        name: listName, // listName state already has default or user input
        recipient_id: null, // No recipient for drafts
        recipient_username: null
      };

      const { data: newListData, error: listError } = await supabase
        .from('lists')
        .insert(listToInsert)
        .select('id')
        .single();

      if (listError || !newListData) {
        console.error('Error creating draft list:', listError);
        toast.error(t('createList.draftCreationError'), 2000); // New translation key
        setIsSending(false);
        return;
      }

      const listId = newListData.id;

      // 3. Insert items into public.items linking to the new list_id
      if (listItems.length > 0) {
          const itemsToInsert = listItems.map(item => ({
            name: item.name,
            list_id: listId,
            purchased: false
          }));
          const { error: itemsError } = await supabase.from('items').insert(itemsToInsert);

          if (itemsError) {
            console.error('Error inserting draft items:', itemsError);
            // Attempt to delete the list if items fail? Or just warn?
            // For now, warn the user but proceed with navigation.
            toast.warning(t('createList.itemInsertionWarning'), 3000); // New translation key
          }
      }

      // 4. Show success toast
      toast.success(t('createList.draftSavedSuccess'), 2000); // New translation key

      // 5. Navigate to /lists (maybe specific tab later?)
      router.push('/lists');

    } catch (error) {
        console.error('Unexpected error saving draft list:', error);
        toast.error(t('createList.unexpectedDraftError'), 2000); // New translation key
    } finally {
        // 6. Set isSending(false)
        setIsSending(false);
    }
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
    // 1. Get current user ID and username
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        console.error('Error getting current user for list creation:', authError);
        toast.error(t('createList.currentUserError'), 2000);
        setIsSending(false);
        return;
    }
    const currentUserId = user.id;
    // Fetch username from public.users table
    let currentUserUsername = '';
    try {
        const { data: profileData } = await supabase
          .from('users')
          .select('username')
          .eq('id', currentUserId)
          .single();
        if (profileData) {
          currentUserUsername = profileData.username;
        } else {
            throw new Error('Profile not found')
        }
      } catch (profileError) {
        console.error('Could not determine current username for list creation', profileError);
        toast.error(t('createList.currentUsernameError'), 2000);
        setIsSending(false);
        return;
    }

    try {
      // 2. Get recipient data
      const recipient = await findUserByUsername(recipientUsername);
      if (!recipient) {
        toast.error(t('createList.recipientNotFound', { name: recipientUsername }), 2000);
        setIsSending(false);
        return;
      }

      // 3. Insert list
      const listToInsert = {
        creator_id: currentUserId,
        recipient_id: recipient.id,
        creator_username: currentUserUsername,
        recipient_username: recipient.username,
        status: 'new', // Sent lists start with 'new' status
        name: listName // Use listName from state
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

      // 4. Insert items
      if (listItems.length > 0) {
          const itemsToInsert = listItems.map(item => ({
            name: item.name,
            list_id: listId,
            purchased: false
          }));
          const { error: itemsError } = await supabase.from('items').insert(itemsToInsert);

          if (itemsError) {
            console.error('Error inserting items:', itemsError);
            // Consider rolling back list creation or just warning?
            // For now, warn user but proceed.
            toast.warning(t('createList.itemInsertionWarning'), 3000);
          }
      }

      // 5. Show success toast (since DB trigger handles notification)
      toast.success(t('createList.listSentSuccess'), 2000);

      // 6. Navigate to /lists
      router.push('/lists');

    } catch (error) {
      console.error('Error sending list:', error);
      toast.error(t('createList.sendError'), 2000);
    } finally {
      setIsSending(false);
      setIsDialogOpen(false);
    }
  };

  // Focus the editable name input when editing starts
  useEffect(() => {
    if (isEditingName && editableNameInputRef.current) {
      editableNameInputRef.current.focus();
      // Optionally select text
      editableNameInputRef.current.select();
    }
  }, [isEditingName]);

  // Function to save the edited name
  const saveListName = () => {
    // Optionally add validation or trimming here if needed
    setIsEditingName(false);
  };

  // Handle Enter key press on the editable name input
  const handleEditableNameKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveListName();
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
    <div className="container mx-auto p-4 pb-20">
      <Header title={t('createList.pageTitle')} showBackButton={true} />
      <Card className="mt-6 bg-white dark:bg-gray-800 shadow-lg rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
        <CardContent className="p-6">
          {/* Step 1: Enter List Name */}
          {step === 'enterName' && (
            <div>
              <h2 className="text-xl font-semibold mb-2 text-gray-800 dark:text-gray-100">{t('createList.step1Title')}</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">{t('createList.step1Description')}</p>
              <Input
                ref={nameInputRef}
                type="text"
                value={listName}
                onChange={(e) => setListName(e.target.value)}
                placeholder={t('createList.listNamePlaceholder')}
                onKeyDown={handleNameKeyDown}
                className="mb-4 bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600"
              />
              <Button onClick={handleNameSubmit} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                {t('common.nextButton')}
                 <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Step 2: Add Items (Now also includes action buttons) */}
          {step === 'addItems' && (
            <div>
              {/* List Name Display/Edit Section */}
              <div className="flex items-center gap-2 mb-1">
                {isEditingName ? (
                  // Input field shown when editing
                  <div className="flex items-center gap-2 flex-grow">
                    <Input
                      ref={editableNameInputRef}
                      type="text"
                      value={listName}
                      onChange={(e) => setListName(e.target.value)}
                      onKeyDown={handleEditableNameKeyDown} // Save on Enter
                      className="text-xl font-semibold text-gray-800 dark:text-gray-100 bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500 h-auto p-1 flex-grow"
                      placeholder={t('createList.listNamePlaceholder')}
                    />
                    <Button variant="ghost" size="icon" onClick={saveListName} className="text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 h-8 w-8">
                      <Check className="h-5 w-5" />
                    </Button>
                  </div>
                ) : (
                  // Static text with edit icon shown when not editing
                  <div className="flex items-center gap-2 flex-grow">
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 break-all">{listName}</h2>
                    <Button variant="ghost" size="icon" onClick={() => setIsEditingName(true)} className="text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 h-8 w-8">
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-4">{t('createList.cardDescription')}</p>

              {/* Item Input Section */}
              <div className="flex gap-2 mb-4">
                <Input
                  ref={itemInputRef}
                  type="text"
                  value={newItem}
                  onChange={(e) => setNewItem(e.target.value)}
                  placeholder={t('createList.addItemPlaceholder')}
                  onKeyDown={handleItemKeyDown}
                  className="flex-grow bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                />
                <Button onClick={addItem} className="bg-blue-600 hover:bg-blue-700 text-white shrink-0">
                  <Plus className="h-4 w-4 mr-1" /> {t('createList.addButton')}
                </Button>
              </div>

              {/* Items List */}
              <div className="space-y-2 mb-6 min-h-[100px]">
                {listItems.length === 0 ? (
                  <p className="text-center text-gray-500 dark:text-gray-400 py-4">{t('createList.noItemsYet')}</p>
                ) : (
                  listItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-2 rounded-md">
                      <span className="text-gray-800 dark:text-gray-200">{item.name}</span>
                      <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)} className="text-red-500 hover:text-red-700 h-7 w-7">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>

              {/* Conditionally render Send and Save buttons if items exist */}
              {listItems.length > 0 && (
                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row gap-3">
                  <Button onClick={openSelectRecipientDialog} disabled={isSending} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                    <Send className="mr-2 h-4 w-4" />
                    {t('createList.sendNowButton')}
                  </Button>
                   <Button variant="outline" onClick={handleSaveForLater} disabled={isSending} className="flex-1 border-blue-600 text-blue-600 hover:bg-blue-50 dark:border-blue-500 dark:text-blue-400 dark:hover:bg-blue-900/20">
                     {isSending ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                     {isSending ? t('createList.sendingButton') : t('createList.saveForLaterButton')}
                   </Button>
                </div>
              )}
            </div>
          )}

        </CardContent>
      </Card>

      {/* Select Recipient Dialog remains the same */}
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