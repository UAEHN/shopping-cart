import { useState, useEffect } from 'react';
import { supabase } from '@/services/supabase';
import { ListItem } from '@/types/list';
import { ListMessage } from '@/types/message';

// Hook لمراقبة التغييرات في المنتجات
export const useListItemsRealtime = (listId: string) => {
  const [items, setItems] = useState<ListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // جلب المنتجات الأولية
    const fetchItems = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('items')
          .select('*')
          .eq('list_id', listId)
          .order('created_at', { ascending: true });

        if (error) {
          throw error;
        }

        setItems(data as ListItem[]);
      } catch (err: any) {
        console.error('Error fetching items:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchItems();

    // الاشتراك في التغييرات
    const subscription = supabase
      .channel(`items-${listId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'items',
          filter: `list_id=eq.${listId}`
        },
        (payload) => {
          setItems((prevItems) => [...prevItems, payload.new as ListItem]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'items',
          filter: `list_id=eq.${listId}`
        },
        (payload) => {
          setItems((prevItems) =>
            prevItems.map((item) =>
              item.id === payload.new.id ? (payload.new as ListItem) : item
            )
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'items',
          filter: `list_id=eq.${listId}`
        },
        (payload) => {
          setItems((prevItems) =>
            prevItems.filter((item) => item.id !== payload.old.id)
          );
        }
      )
      .subscribe();

    // تنظيف الاشتراك
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [listId]);

  return { items, isLoading, error };
};

// Hook لمراقبة التغييرات في الرسائل
export const useListMessagesRealtime = (listId: string) => {
  const [messages, setMessages] = useState<ListMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // جلب الرسائل الأولية
    const fetchMessages = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('list_id', listId)
          .order('created_at', { ascending: true });

        if (error) {
          throw error;
        }

        setMessages(data as ListMessage[]);
      } catch (err: any) {
        console.error('Error fetching messages:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMessages();

    // الاشتراك في التغييرات
    const subscription = supabase
      .channel(`messages-${listId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `list_id=eq.${listId}`
        },
        (payload) => {
          setMessages((prevMessages) => [...prevMessages, payload.new as ListMessage]);
        }
      )
      .subscribe();

    // تنظيف الاشتراك
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [listId]);

  return { messages, isLoading, error };
}; 