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
import { Input } from '@/components/ui/input';
import { supabase } from '@/services/supabase';
import { toast } from '@/components/ui/toast';
import { Search, UserRound, UsersRound } from 'lucide-react';

interface Contact {
  id: string;
  contact_username: string;
  added_at: string;
}

interface SelectRecipientDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRecipient: (username: string) => void;
}

export default function SelectRecipientDialog({
  isOpen,
  onClose,
  onSelectRecipient
}: SelectRecipientDialogProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContact, setSelectedContact] = useState<string | null>(null);

  // جلب قائمة الأشخاص المضافين
  useEffect(() => {
    if (isOpen) {
      loadContacts();
    }
  }, [isOpen]);

  const loadContacts = async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('حدث خطأ في تحميل جهات الاتصال');
        return;
      }
      
      // جلب جهات الاتصال من قاعدة البيانات
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', user.id);
      
      if (error) {
        console.error('Error fetching contacts:', error);
        throw error;
      }
      
      setContacts(data || []);
    } catch (error) {
      console.error('Error loading contacts:', error);
      toast.error('حدث خطأ أثناء تحميل جهات الاتصال');
    } finally {
      setIsLoading(false);
    }
  };

  // تصفية جهات الاتصال حسب البحث
  const filteredContacts = contacts.filter(contact => 
    contact.contact_username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // اختيار جهة اتصال ومتابعة العملية
  const handleSelectRecipient = () => {
    if (!selectedContact) {
      toast.error('الرجاء اختيار شخص لإرسال القائمة إليه');
      return;
    }

    onSelectRecipient(selectedContact);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white dark:bg-gray-850 border border-gray-200 dark:border-gray-700 rounded-xl p-0 w-[90vw] max-w-md mx-auto shadow-xl animate__fadeIn overflow-hidden">
        <DialogHeader className="bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 p-6 text-white">
          <div className="flex flex-col items-center">
            <div className="bg-white dark:bg-gray-800 rounded-full p-3 mb-4 shadow-md">
              <UsersRound className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <DialogTitle className="text-xl font-bold text-center">اختر المستلم</DialogTitle>
            <DialogDescription className="text-center text-blue-100 dark:text-blue-200 mt-2">
              اختر شخص لإرسال قائمة التسوق إليه
            </DialogDescription>
            <div className="w-12 h-1 bg-blue-300 dark:bg-blue-400 rounded-full mt-3 opacity-70"></div>
          </div>
        </DialogHeader>

        <div className="p-6">
          <div className="mb-6">
            <div className="relative bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm focus-within:shadow-md transition-all duration-200 border border-gray-200 dark:border-gray-700">
              <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
              <Input
                placeholder="بحث..."
                className="border-0 shadow-none focus-visible:ring-0 pr-12 py-5 text-base bg-transparent dark:text-gray-100 dark:placeholder:text-gray-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-10">
              <div className="animate-pulse">جاري التحميل...</div>
            </div>
          ) : filteredContacts.length > 0 ? (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
              {filteredContacts.map((contact, index) => (
                <div
                  key={contact.id}
                  className={`p-3 rounded-lg transition-all duration-200 flex items-center cursor-pointer ${
                    selectedContact === contact.contact_username
                      ? 'bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-500 dark:border-blue-700'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800 border-2 border-transparent'
                  }`}
                  onClick={() => setSelectedContact(contact.contact_username)}
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <div className={`p-2 rounded-full ${
                    selectedContact === contact.contact_username
                      ? 'bg-blue-100 dark:bg-blue-800' 
                      : 'bg-gray-100 dark:bg-gray-700'
                  }`}>
                    <UserRound className={`h-5 w-5 ${
                      selectedContact === contact.contact_username
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-gray-600 dark:text-gray-400'
                    }`} />
                  </div>
                  <div className="mr-3">
                    <p className="font-medium">{contact.contact_username}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center p-8">
              <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-full mx-auto w-16 h-16 flex items-center justify-center mb-4">
                <UsersRound className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-gray-500 dark:text-gray-400">
                {searchQuery ? 'لا توجد نتائج للبحث' : 'لا توجد جهات اتصال مضافة'}
              </p>
              <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
                {searchQuery 
                  ? 'حاول استخدام كلمات بحث مختلفة' 
                  : 'أضف جهات اتصال من صفحة الأشخاص أولاً'}
              </p>
            </div>
          )}

          <DialogFooter className="flex-row justify-center gap-4 mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
            <Button 
              variant="outline" 
              className="px-6 rounded-lg transition-all duration-200"
              onClick={onClose}
            >
              إلغاء
            </Button>
            <Button 
              className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 px-6 rounded-lg transition-all duration-200 shadow-sm hover:shadow flex items-center gap-2"
              onClick={handleSelectRecipient}
              disabled={!selectedContact}
            >
              <span>إرسال القائمة</span>
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
} 