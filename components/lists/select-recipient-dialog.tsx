'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/services/supabase';
import { toast } from '@/components/ui/toast';
import { UserRound, UsersRound, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Contact {
  id: string;
  contact_username: string;
  added_at: string;
}

interface SelectRecipientDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRecipient: (username: string) => void;
  currentUser: string;
  isSending: boolean;
}

export default function SelectRecipientDialog({
  isOpen,
  onClose,
  onSelectRecipient,
  currentUser,
  isSending
}: SelectRecipientDialogProps) {
  const { t } = useTranslation();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedContact, setSelectedContact] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedContact(null);
      loadContacts();
    }
  }, [isOpen]);

  const loadContacts = async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error(t('selectRecipient.loadContactsError'));
        setIsLoading(false);
        return;
      }
      
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', user.id)
        .neq('contact_username', currentUser);
      
      if (error) {
        console.error('Error fetching contacts:', error);
        throw error;
      }
      
      setContacts(data || []);
    } catch (error) {
      console.error('Error loading contacts:', error);
      toast.error(t('selectRecipient.loadContactsError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectRecipient = () => {
    if (!selectedContact) {
      toast.error(t('selectRecipient.selectRecipientError'));
      return;
    }
    onSelectRecipient(selectedContact);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-0 w-[90vw] max-w-md mx-auto shadow-xl animate__fadeIn overflow-hidden">
        <DialogHeader className="bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 p-6 text-white">
          <div className="flex flex-col items-center">
            <div className="bg-white dark:bg-gray-700 rounded-full p-3 mb-4 shadow-md">
              <UsersRound className="h-6 w-6 text-blue-600 dark:text-blue-300" />
            </div>
            <DialogTitle className="text-xl font-bold text-center">{t('selectRecipient.title')}</DialogTitle>
            <DialogDescription className="text-center text-blue-100 dark:text-blue-100 mt-2">
              {t('selectRecipient.description')}
            </DialogDescription>
            <div className="w-12 h-1 bg-blue-300 dark:bg-blue-300 rounded-full mt-3 opacity-70"></div>
          </div>
        </DialogHeader>

        <div className="p-6 dark:bg-gray-800">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <div className="animate-pulse dark:text-white flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>{t('selectRecipient.loadingContacts')}</span>
              </div>
            </div>
          ) : contacts.length > 0 ? (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
              {contacts.map((contact, index) => (
                <div
                  key={contact.id}
                  className={`p-3 rounded-lg transition-all duration-200 flex items-center cursor-pointer ${
                    selectedContact === contact.contact_username
                      ? 'bg-blue-50 dark:bg-blue-900 border-2 border-blue-500 dark:border-blue-400'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700 border-2 border-transparent'
                  }`}
                  onClick={() => setSelectedContact(contact.contact_username)}
                  style={{ animationDelay: `${index * 30}ms` }}
                  role="radio"
                  aria-checked={selectedContact === contact.contact_username}
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedContact(contact.contact_username); }}
                >
                  <div className={`p-2 rounded-full ${
                    selectedContact === contact.contact_username
                      ? 'bg-blue-100 dark:bg-blue-700' 
                      : 'bg-gray-100 dark:bg-gray-600'
                  }`}>
                    <UserRound className={`h-5 w-5 ${
                      selectedContact === contact.contact_username
                        ? 'text-blue-600 dark:text-blue-300'
                        : 'text-gray-600 dark:text-gray-300'
                    }`} />
                  </div>
                  <div className="mr-3">
                    <p className="font-medium text-gray-800 dark:text-gray-100">{contact.contact_username}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center p-8">
              <div className="bg-gray-100 dark:bg-gray-700 p-6 rounded-full mx-auto w-16 h-16 flex items-center justify-center mb-4">
                <UsersRound className="h-8 w-8 text-gray-400 dark:text-gray-300" />
              </div>
              <p className="text-gray-500 dark:text-gray-300">
                {t('selectRecipient.noContactsFound')}
              </p>
              <p className="text-gray-400 dark:text-gray-400 text-sm mt-2">
                {t('selectRecipient.addContactsHint')}
              </p>
            </div>
          )}

          <DialogFooter className="flex-row justify-center gap-4 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
            <Button 
              variant="outline" 
              className="px-6 rounded-lg transition-all duration-200 dark:text-white dark:bg-gray-700 dark:hover:bg-gray-600 dark:border-gray-600"
              onClick={onClose}
              disabled={isSending}
            >
              {t('selectRecipient.cancelButton')}
            </Button>
            <Button 
              className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white px-6 rounded-lg transition-all duration-200 shadow-sm hover:shadow flex items-center gap-2"
              onClick={handleSelectRecipient}
              disabled={!selectedContact || isSending}
            >
              {isSending ? (
                  <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      <span>{t('createList.sendingButton')}</span> 
                  </>
              ) : (
                   <span>{t('selectRecipient.sendButton')}</span>
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
} 