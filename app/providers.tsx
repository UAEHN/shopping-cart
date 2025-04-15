'use client';

import { ReactNode } from 'react';
import { AuthProvider } from '@/hooks/useAuth';
// Remove the import for the custom theme provider
// import { ThemeProvider as CustomThemeProvider } from '@/components/theme-provider'; 
import { ThemeProvider } from 'next-themes'; // <-- Import from next-themes
import { GlobalRealtimeProvider } from '@/components/providers/GlobalRealtimeProvider';

export function Providers({ children }: { children: ReactNode }) {
  return (
    // Use ThemeProvider from next-themes
    <ThemeProvider
      attribute="class" 
      defaultTheme="system"
      enableSystem={true} // Pass as boolean prop
      disableTransitionOnChange={true} // Pass as boolean prop
    >
      <AuthProvider>
        <GlobalRealtimeProvider>
          {children}
        </GlobalRealtimeProvider>
      </AuthProvider>
    </ThemeProvider>
  );
} 