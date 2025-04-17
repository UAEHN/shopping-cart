// No 'use client' here - this remains a Server Component
import type { Metadata, Viewport } from "next";
import { Inter, Tajawal } from "next/font/google";
import "./globals.css";
// Removed unused imports for client-side logic
// import Navbar from "@/components/layout/Navbar";
// import { Providers } from "./providers";
// import { Toaster } from "@/components/ui/toast";
// import { RegisterSW } from "@/components/pwa/register-sw";
// import RequestNotificationPermission from '@/components/functional/request-notification-permission';
// import I18nInitializer from '@/components/I18nInitializer';
// import ShoppingSplash from "@/components/splash/ShoppingSplash";
// import { useState, useEffect } from 'react';

// Import the new Client Wrapper
import ClientLayoutWrapper from "@/components/layout/ClientLayoutWrapper";

// استيراد خط مناسب للغة العربية
const tajawal = Tajawal({ 
  subsets: ["arabic"],
  weight: ["400", "500", "700", "800"],
  variable: "--font-tajawal",
});

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter",
});

// Metadata and Viewport exports are allowed here
export const metadata: Metadata = {
  title: "عربة التسوق | Shopping Cart",
  description: "تطبيق لإنشاء وإرسال قوائم التسوق بسهولة",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "قوائم التسوق",
  },
  applicationName: "قوائم التسوق التفاعلية",
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#3b82f6"
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Removed state and effect logic from here

  return (
    <html lang="ar" dir="rtl" className="scroll-smooth" suppressHydrationWarning>
      <head>
        {/* Keep existing head content */}
        <link rel="icon" href="/icon.png" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="قوائم التسوق" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#3b82f6" />
      </head>
      <body className={`${tajawal.variable} ${inter.variable} font-tajawal min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 antialiased`}>
        {/* Use the Client Wrapper to handle splash screen and main content */}
        <ClientLayoutWrapper>
          {children}
        </ClientLayoutWrapper>
      </body>
    </html>
  );
}
