import type { Metadata, Viewport } from "next";
import { Inter, Tajawal } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import { Providers } from "./providers";
import { Toaster } from "@/components/ui/toast";

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

export const metadata: Metadata = {
  title: "عربة التسوق | Shopping Cart",
  description: "تطبيق لإنشاء وإرسال قوائم التسوق بسهولة",
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
  return (
    <html lang="ar" dir="rtl" className="scroll-smooth">
      <body className={`${tajawal.variable} ${inter.variable} font-tajawal min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 antialiased`}>
        <Providers>
          <div className="flex-1 pb-16 pt-16 max-w-screen-lg mx-auto w-full">
            {children}
          </div>
          <Navbar />
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
