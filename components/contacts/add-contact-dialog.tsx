'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserPlus, User, PlusCircle } from 'lucide-react';
import { supabase } from '@/services/supabase';
import { toast } from '@/components/ui/toast';

interface AddContactDialogProps {
  onContactAdded: () => void;
  buttonVariant?: 'outline' | 'destructive' | 'default';
  buttonSize?: 'icon' | 'default' | 'sm';
  buttonClass?: string;
}

export function AddContactDialog({
  onContactAdded,
  buttonVariant = 'outline',
  buttonSize = 'sm',
  buttonClass = '',
}: AddContactDialogProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contactData, setContactData] = useState({
    name: '',
    email: '',
    phone: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setContactData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddContact = async () => {
    const trimmedUsername = contactData.name.trim();
    
    if (!trimmedUsername) {
      toast.error(t('contacts.addErrorEmpty'));
      return;
    }

    if (trimmedUsername !== contactData.name) {
      setContactData(prev => ({ ...prev, name: trimmedUsername }));
    }

    try {
      setIsSubmitting(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error(t('auth.loginRequired'));
        return;
      }

      console.log('Current user:', user);
      console.log('User ID:', user.id);

      const { data: currentUserData } = await supabase
        .from('users')
        .select('username')
        .eq('id', user.id)
        .single();
        
      if (currentUserData && currentUserData.username === trimmedUsername) {
        toast.error(t('contacts.addErrorSelf'));
        setIsSubmitting(false);
        return;
      }

      const { data: existingContacts, error: existingContactError } = await supabase
        .from('contacts')
        .select('id')
        .eq('user_id', user.id)
        .eq('contact_username', trimmedUsername);
        
      console.log('Existing contacts check:', existingContacts);
        
      if (existingContacts && existingContacts.length > 0) {
        toast.error(t('contacts.addErrorAlreadyExists'));
        setIsSubmitting(false);
        return;
      }

      try {
        const { error: contactError } = await supabase.from('contacts').insert({
          user_id: user.id,
          contact_username: trimmedUsername
        });
        
        if (contactError) {
          console.error('Error adding contact:', contactError);
          throw contactError;
        }
        
        console.log('Contact added successfully');
        
        toast.success(t('contacts.addSuccess'));
        setContactData({ name: '', email: '', phone: '' });
        setOpen(false);
        onContactAdded();
      } catch (contactError) {
        console.error('Failed to add contact:', contactError);
        toast.error(t('contacts.addError'));
      }
    } catch (error) {
      console.error('Error in contact addition process:', error);
      toast.error(t('contacts.addError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <Button
        variant={buttonVariant}
        size={buttonSize}
        className={`transition-all duration-200 hover:scale-105 bg-blue-500 hover:bg-blue-600 text-white dark:bg-blue-600 dark:hover:bg-blue-700 rounded-full shadow-sm hover:shadow-md ${buttonClass}`}
        onClick={() => setOpen(true)}
      >
        <UserPlus className="h-4 w-4 mr-2" />
        {t('contacts.addButton')}
      </Button>
      <AlertDialogContent className="rounded-xl bg-white dark:bg-gray-850 p-0 max-w-md w-full border border-gray-200 dark:border-gray-700 shadow-xl animate__fadeIn overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 p-6 flex flex-col items-center">
          <div className="bg-white dark:bg-gray-800 rounded-full p-3 mb-4 shadow-md">
            <User className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <AlertDialogTitle className="text-xl font-bold text-white text-center">{t('contacts.addContactDialogTitle')}</AlertDialogTitle>
          <div className="w-12 h-1 bg-blue-300 dark:bg-blue-400 rounded-full mt-3 opacity-70"></div>
        </div>
        
        <div className="p-6">
          <AlertDialogDescription className="text-sm text-gray-600 dark:text-gray-300 text-center mb-6">
            {t('contacts.addContactDialogDescription')}
          </AlertDialogDescription>

          <div className="space-y-5">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('contacts.usernameLabel')}</label>
              <div className="relative rounded-lg overflow-hidden shadow-sm focus-within:ring-2 focus-within:ring-blue-500 dark:focus-within:ring-blue-400 transition-all duration-200">
                <Input
                  name="name"
                  value={contactData.name}
                  onChange={handleInputChange}
                  placeholder={t('contacts.usernamePlaceholder')}
                  required
                  className="w-full py-2 ps-10 pe-4 bg-white dark:bg-gray-800 border-0 focus-visible:ring-0 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
                <User className="absolute start-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
              </div>
            </div>
            
            <div className="space-y-2 hidden">
              <label className="block text-sm font-medium mb-1">البريد الإلكتروني</label>
              <Input
                name="email"
                type="email"
                value={contactData.email}
                onChange={handleInputChange}
                placeholder="example@email.com"
                className="w-full py-2 px-3 bg-white dark:bg-gray-700"
              />
            </div>
            
            <div className="space-y-2 hidden">
              <label className="block text-sm font-medium mb-1">رقم الهاتف (اختياري)</label>
              <Input
                name="phone"
                type="tel"
                value={contactData.phone}
                onChange={handleInputChange}
                placeholder="مثال: 0512345678"
                className="w-full py-2 px-3 bg-white dark:bg-gray-700"
              />
            </div>
          </div>

          <AlertDialogFooter className="mt-8 flex-row justify-center gap-4">
            <AlertDialogCancel className="bg-gray-100 hover:bg-gray-200 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200 rounded-lg border-0 transition-all duration-200 shadow-sm">
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white px-6 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-2 font-medium"
              onClick={handleAddContact}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>{t('common.adding')}</>
              ) : (
                <>
                  <PlusCircle className="h-4 w-4" />
                  <span>{t('contacts.addButton')}</span>
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
} 