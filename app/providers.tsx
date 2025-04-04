'use client';

import { ReactNode } from 'react';
import { AuthProvider } from '@/hooks/useAuth';
import { ThemeProvider } from '@/components/theme-provider';
import { GlobalRealtimeProvider } from '@/components/providers/GlobalRealtimeProvider';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <GlobalRealtimeProvider>
          {children}
        </GlobalRealtimeProvider>
      </AuthProvider>
    </ThemeProvider>
  );
} 