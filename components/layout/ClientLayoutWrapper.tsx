'use client';

import { useState, useEffect } from 'react';
import ShoppingSplash from "@/components/splash/ShoppingSplash";
import I18nInitializer from '@/components/I18nInitializer';
import { Providers } from "@/app/providers"; // Adjusted import path for app directory
import RequestNotificationPermission from '@/components/functional/request-notification-permission';
import Navbar from "@/components/layout/Navbar";
import { Toaster } from "@/components/ui/toast";
import { RegisterSW } from "@/components/pwa/register-sw";

export default function ClientLayoutWrapper({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    // State to control splash screen visibility
    const [showSplash, setShowSplash] = useState(true);
    // State to prevent splash on subsequent navigations (optional but good UX)
    const [isInitialLoad, setIsInitialLoad] = useState(true);

    useEffect(() => {
        // Basic check to only show splash on the very first load
        // A more robust solution might use sessionStorage
        if (isInitialLoad) {
            // Set a timer to hide splash automatically if animation stalls (fallback)
            const fallbackTimer = setTimeout(() => {
                console.warn("Splash screen fallback triggered.");
                setShowSplash(false);
                setIsInitialLoad(false);
            }, 7000); // Adjust timeout as needed (e.g., 7 seconds)

            return () => clearTimeout(fallbackTimer);
        }
    }, [isInitialLoad]);

    const handleSplashComplete = () => {
        console.log("ClientLayoutWrapper received splash complete signal.");
        setShowSplash(false);
        setIsInitialLoad(false); // Mark initial load as complete
    };

    return (
        <>
            {/* Conditional rendering of Splash Screen or Main App Content */}
            {showSplash && isInitialLoad ? (
                <ShoppingSplash onAnimationComplete={handleSplashComplete} />
            ) : (
                <I18nInitializer>
                    <Providers>
                        <RequestNotificationPermission />
                        <div className="flex-1 pb-16 pt-16 max-w-screen-lg mx-auto w-full">
                            {children} { /* Render the actual page content here */}
                        </div>
                        <Navbar />
                        <Toaster />
                        <RegisterSW />
                    </Providers>
                </I18nInitializer>
            )}
        </>
    );
} 