'use client';

import React, { useEffect, useState, createContext, useContext } from 'react';
import { supabase, signIn, signUp, signOut, getCurrentUser } from '@/services/supabase';
import { User } from '@/types/user';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, username: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const getUserProfile = async () => {
      setIsLoading(true);
      try {
        const { user: authUser, error: authError } = await getCurrentUser();
        
        if (authError) {
          setError(authError.message);
          setUser(null);
          return;
        }
        
        if (authUser) {
          // Fetch user profile from the database
          const { data, error: profileError } = await supabase
            .from('users')
            .select('*')
            .eq('id', authUser.id)
            .single();
          
          if (profileError) {
            setError(profileError.message);
            setUser(null);
            return;
          }
          
          setUser(data as User);
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error('Auth error:', err);
        setError('Failed to get user profile');
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    // Setup auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          getUserProfile();
        } else {
          setUser(null);
          setIsLoading(false);
        }
      }
    );

    // Initial check
    getUserProfile();

    // Cleanup
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error: signInError } = await signIn(email, password);
      
      if (signInError) {
        setError(signInError.message);
        return { success: false, error: signInError.message };
      }
      
      if (!data.user) {
        setError('User not found');
        return { success: false, error: 'User not found' };
      }
      
      return { success: true };
    } catch (err: any) {
      setError(err.message || 'Login failed');
      return { success: false, error: err.message || 'Login failed' };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, username: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Check if username is already taken
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('username')
        .eq('username', username)
        .single();
      
      if (existingUser) {
        setError('Username already taken');
        return { success: false, error: 'Username already taken' };
      }
      
      const { data, error: signUpError } = await signUp(email, password, username);
      
      if (signUpError) {
        setError(signUpError.message);
        return { success: false, error: signUpError.message };
      }
      
      if (!data.user) {
        setError('Registration failed');
        return { success: false, error: 'Registration failed' };
      }
      
      return { success: true };
    } catch (err: any) {
      setError(err.message || 'Registration failed');
      return { success: false, error: err.message || 'Registration failed' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { error: signOutError } = await signOut();
      
      if (signOutError) {
        setError(signOutError.message);
        return { success: false, error: signOutError.message };
      }
      
      setUser(null);
      router.push('/login');
      return { success: true };
    } catch (err: any) {
      setError(err.message || 'Logout failed');
      return { success: false, error: err.message || 'Logout failed' };
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        login,
        register,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 