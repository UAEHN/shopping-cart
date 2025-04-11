import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// إضافة خيارات للاحتفاظ بالجلسة
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storageKey: 'shopping-list-auth-storage',
    autoRefreshToken: true,
    detectSessionInUrl: true,
  }
});

// Helper functions for auth
export const signIn = async (email: string, password: string, rememberMe: boolean = false) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  // إذا كان rememberMe صحيحًا، قم بتخزين معلومات إضافية في localStorage
  if (rememberMe && !error) {
    localStorage.setItem('shopping-list-remember-me', 'true');
  }
  
  return { data, error };
};

export const signUp = async (email: string, password: string, username: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username,
      },
    },
  });
  return { data, error };
};

export const signOut = async () => {
  // حذف علامة تذكر المستخدم عند تسجيل الخروج
  localStorage.removeItem('shopping-list-remember-me');
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  return { user, error };
}; 