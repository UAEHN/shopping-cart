'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import { Card, CardContent } from '@/components/ui/card';
import { UserRound, UsersRound, CalendarDays } from 'lucide-react';
import { supabase } from '@/services/supabase';
import { toast } from '@/components/ui/toast';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { AddContactDialog } from '@/components/contacts/add-contact-dialog';

interface Contact {
  id: string;
  contact_username: string;
  added_at: string;
}

export default function ContactsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [contacts, setContacts] = useState<Contact[]>([]);
  
  const loadContacts = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.info('الرجاء تسجيل الدخول أولاً');
        router.push('/login');
        return;
      }
      
      console.log('Fetching contacts for user ID:', user.id);
      
      // جلب جهات الاتصال الفعلية من قاعدة البيانات
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', user.id);
      
      if (error) {
        console.error('Error fetching contacts:', error);
        throw error;
      }
      
      console.log('Fetched contacts:', data);
      setContacts(data || []);
    } catch (error) {
      console.error('Error loading contacts:', error);
      toast.error('حدث خطأ أثناء تحميل البيانات');
    } finally {
      setIsLoading(false);
    }
  }, [router]);
  
  useEffect(() => {
    loadContacts();
  }, [loadContacts]);
  
  const handleContactAdded = () => {
    // إعادة تحميل جهات الاتصال بعد إضافة جهة جديدة
    loadContacts();
  };
  
  const handleDeleteContact = async (id: string) => {
    try {
      // حذف جهة الاتصال من قاعدة البيانات
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      // تحديث جهات الاتصال بعد الحذف مع تأثير بصري
      const updatedContacts = contacts.filter(contact => contact.id !== id);
      
      // نستخدم تأثير انتقالي عند حذف العنصر
      const contactElement = document.getElementById(`contact-${id}`);
      if (contactElement) {
        contactElement.classList.add('opacity-0', 'scale-95');
        contactElement.style.transition = 'all 0.3s ease';
        
        // ننتظر انتهاء التأثير قبل إزالة العنصر من الحالة
        setTimeout(() => {
          setContacts(updatedContacts);
          toast.success('تم حذف جهة الاتصال بنجاح');
        }, 300);
      } else {
        setContacts(updatedContacts);
        toast.success('تم حذف جهة الاتصال بنجاح');
      }
    } catch (error) {
      console.error('Error deleting contact:', error);
      toast.error('حدث خطأ أثناء حذف جهة الاتصال');
    }
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="bg-blue-100 dark:bg-blue-900 p-4 rounded-full">
            <UsersRound className="h-10 w-10 text-blue-500 dark:text-blue-300" />
          </div>
          <span className="text-xl">جاري التحميل...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 pt-0 pb-20">
      <Header title="الأشخاص" />
      
      <div className="space-y-6 mt-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
            <UsersRound size={20} className="text-blue-600 dark:text-blue-400" />
            <span>جهات الاتصال</span>
            <span className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs rounded-full px-2 py-1 ml-2">
              {contacts.length}
            </span>
          </h2>
          <AddContactDialog onContactAdded={handleContactAdded} />
        </div>
        
        <div className="space-y-3">
          {contacts.length > 0 ? (
            contacts.map((contact, index) => (
              <Card 
                key={contact.id} 
                id={`contact-${contact.id}`}
                className="transition-all duration-300 hover:shadow-md hover:translate-y-[-2px] rounded-xl overflow-hidden border-gray-200 dark:border-gray-700 animate__fadeIn"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardContent className="p-0">
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 p-3 rounded-full shadow-inner">
                        <UserRound className="h-6 w-6 text-blue-600 dark:text-blue-300" />
                      </div>
                      <div className="mr-4">
                        <h3 className="font-semibold text-gray-800 dark:text-gray-200">{contact.contact_username}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
                          <CalendarDays size={14} />
                          <span>{new Date(contact.added_at).toLocaleDateString('en-US')}</span>
                        </p>
                      </div>
                    </div>
                    <ConfirmDialog
                      title="حذف جهة الاتصال"
                      description={`هل أنت متأكد من حذف "${contact.contact_username}" من جهات الاتصال؟ لا يمكن التراجع عن هذا الإجراء.`}
                      onConfirm={() => handleDeleteContact(contact.id)}
                    />
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-xl overflow-hidden">
              <CardContent className="flex flex-col items-center justify-center p-10 text-center">
                <div className="bg-gray-100 dark:bg-gray-700 p-6 rounded-full mb-4">
                  <UsersRound className="h-10 w-10 text-gray-400 dark:text-gray-500" />
                </div>
                <p className="text-gray-500 dark:text-gray-400 font-medium">
                  لا توجد جهات اتصال
                </p>
                <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
                  يمكنك إضافة المستخدمين المسجلين في النظام كجهات اتصال
                </p>
                <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
                  فقط المستخدمين الذين لديهم حسابات في التطبيق يمكن إضافتهم
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
} 