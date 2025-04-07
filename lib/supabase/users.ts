import { supabase } from '@/services/supabase';

/**
 * تحديث رمز الدفع FCM للمستخدم في قاعدة بيانات Supabase.
 * @param userId - معرف المستخدم (UUID) من Supabase Auth.
 * @param token - رمز FCM الجديد.
 * @returns {Promise<{ success: boolean; error: any }>} كائن يشير إلى نجاح العملية أو فشلها مع الخطأ.
 */
export const updateUserPushToken = async (
  userId: string,
  token: string | null // السماح بـ null لمسح الرمز إذا لزم الأمر
): Promise<{ success: boolean; error: any }> => {
  if (!userId) {
    return { success: false, error: 'User ID is required.' };
  }

  try {
    const { error } = await supabase
      .from('users')
      .update({ push_token: token })
      .eq('id', userId);

    if (error) {
      console.error('Error updating push token:', error);
      return { success: false, error: error };
    }

    console.log(`Push token ${token ? 'updated' : 'cleared'} successfully for user:`, userId);
    return { success: true, error: null };
  } catch (error) {
    console.error('Unexpected error updating push token:', error);
    return { success: false, error: error };
  }
}; 