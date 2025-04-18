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

/**
 * Sign in using email/password or username/password.
 * Detects if the identifier is an email or username.
 */
export const signIn = async (identifier: string, password: string, rememberMe: boolean = false) => {
  let emailToUse: string | null = null;

  if (identifier.includes('@')) {
    // Assume it's an email
    emailToUse = identifier;
  } else {
    // Assume it's a username, try to get the email from the Edge Function
    try {
      const functionUrl = `${supabaseUrl}/functions/v1/get-email-from-username`;
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey, // Pass anon key
        },
        body: JSON.stringify({ username: identifier })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to get email for username (${response.status})`);
      }

      const { email } = await response.json();
      if (!email) {
         throw new Error('Email not found for the provided username');
      }
      emailToUse = email;

    } catch (error) {
      console.error('Error fetching email from username:', error);
      return { data: null, error: error instanceof Error ? error : new Error('Could not verify username') };
    }
  }

  if (!emailToUse) {
     return { data: null, error: new Error('Could not determine email for login') };
  }

  // Proceed with email and password sign-in
  const { data, error } = await supabase.auth.signInWithPassword({
    email: emailToUse,
    password,
  });
  
  if (rememberMe && !error) {
    localStorage.setItem('shopping-list-remember-me', 'true');
  }
  
  return { data, error };
};

/**
 * Sign up using email, password, and username.
 * Username is passed in options.data to be picked up by the trigger.
 */
export const signUp = async (email: string, password: string, username: string) => {
  // Basic client-side validation (more can be added)
  if (!email || !password || !username) {
      return { data: null, error: new Error('Email, password, and username are required') };
  }
  if (username.length < 3) {
      return { data: null, error: new Error('Username must be at least 3 characters') };
  }

  // Consider adding username availability check here before signing up
  // try {
  //   const checkUrl = `${supabaseUrl}/functions/v1/check-username`;
  //   const checkRes = await fetch(checkUrl, { ... });
  //   const { available } = await checkRes.json();
  //   if (!available) throw new Error('Username already taken');
  // } catch(e) { return { data: null, error: e }; }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username: username, // Ensure username is passed in data
        // If full_name is collected during signup, pass it here too:
        // full_name: fullNameValue 
      },
      // Email confirmation will be sent by default based on Supabase settings
    },
  });
  return { data, error };
};

/**
 * Sign in using Google OAuth.
 */
export const signInWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            // Optional: Add scopes or redirect URL if needed
            // redirectTo: 'http://localhost:3000/auth/callback'
        }
    });
    return { data, error };
};

// signInWithOtp and verifyOtp would be added here later

export const signOut = async () => {
  localStorage.removeItem('shopping-list-remember-me');
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  return { user, error };
};

// Function to hide a notification for the current user
export const hideNotification = async (notificationId: string) => {
  const { user } = await getCurrentUser();
  if (!user) {
    return { data: null, error: new Error('User not authenticated') };
  }

  const { data, error } = await supabase
    .from('notifications')
    .update({ is_hidden: true })
    .eq('id', notificationId)
    .eq('user_id', user.id) // Ensure user only updates their own notifications
    .select(); // Optional: return the updated record

  return { data, error };
};

// Function to hide all notifications for the current user
export const hideAllNotifications = async () => {
  const { user } = await getCurrentUser();
  if (!user) {
    return { data: null, error: new Error('User not authenticated') };
  }

  const { data, error } = await supabase
    .from('notifications')
    .update({ is_hidden: true })
    .eq('user_id', user.id)
    .eq('is_hidden', false); // Only update those that are not already hidden

  return { data, error };
};

/**
 * Checks if a username is available by calling the check-username Edge Function.
 * @param username The username to check.
 * @returns Promise<boolean> - true if available, false otherwise.
 * @throws Error if the function call fails or returns an unexpected response.
 */
export const checkUsernameAvailability = async (username: string): Promise<boolean> => {
  if (!username || username.length < 3) {
    // Basic client-side check to avoid unnecessary function calls
    return false; 
  }
  try {
    const { data, error } = await supabase.functions.invoke('check-username', {
      body: { username },
    });

    if (error) {
      console.error('Error invoking check-username function:', error);
      throw error; // Re-throw the error to be caught by the caller
    }

    // Check the response structure (Edge function returns { available: boolean })
    if (typeof data?.available !== 'boolean') {
        console.error('Unexpected response from check-username:', data);
        throw new Error('Invalid response from username check service.');
    }

    return data.available;
  } catch (error) {
    console.error('Failed to check username availability:', error);
    // Decide how to handle errors - re-throw or return false?
    // Returning false might be safer UX but masks backend issues.
    // Re-throwing allows the UI to show a specific error.
    throw error instanceof Error ? error : new Error('Failed to check username availability.');
  }
}; 