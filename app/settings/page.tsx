'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { User, Mail, Edit, LogOut, Languages, Palette, Sun, Moon, Laptop } from 'lucide-react';
import { supabase } from '@/services/supabase';
import { toast } from '@/components/ui/toast';
import { useTranslation } from 'react-i18next';
import { useTheme } from "next-themes";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

// Re-adding language definitions
const languages = [
  { code: 'ar', label: 'العربية', dir: 'rtl' },
  { code: 'en', label: 'English', dir: 'ltr' },
];

export default function SettingsPage() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    username: ''
  });
  
  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true); // Start loading
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          toast.info(t('auth.loginRequired'));
          router.push('/login');
          return;
        }
        
        // Fetch user data from the users table
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('name, username')
          .eq('id', user.id)
          .single();
          
        if (userError && userError.code !== 'PGRST116') { // Ignore "No rows found" error if profile doesn't exist yet
            throw userError;
        }
          
        setProfile({
          name: userData?.name || user.user_metadata?.name || '',
          email: user.email || '',
          username: userData?.username || user.user_metadata?.username || ''
        });
      } catch (error) {
        console.error('Error fetching profile:', error);
        toast.error(t('settings.fetchError'));
      } finally {
        setIsLoading(false); // Stop loading
      }
    };
    
    fetchProfile();
  }, [router, t]);
  
  const handleSaveProfile = async () => {
    try {
      setIsLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error(t('settings.userNotFound')); // Use correct key
        setIsLoading(false);
        return;
      }
      
      // Update data in the users table
      const { error } = await supabase
        .from('users')
        .update({ name: profile.name })
        .eq('id', user.id);
      
      if (error) throw error;
      
      toast.success(t('settings.updateSuccess'));
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(t('settings.updateError'));
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.info(t('settings.logoutSuccess')); // Use correct key
      router.push('/login');
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error(t('settings.logoutError'));
    }
  };

  // Re-adding function to handle language change
  const changeLanguage = (lng: string) => {
    const language = languages.find(lang => lang.code === lng);
    if (language) {
      i18n.changeLanguage(language.code);
      document.documentElement.setAttribute('dir', language.dir);
      document.documentElement.setAttribute('lang', language.code);
      localStorage.setItem('i18nextLng', language.code); 
    }
  };
  
  // Re-adding current language code calculation
  const currentLanguageCode = i18n.language.split('-')[0];

  // Restore Loading state display
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        {/* Restore spinner or loading indicator */}
        <div className="animate-pulse text-xl">{t('common.loading')}</div> 
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 pt-20 pb-20"> 
      <Header title={t('settings.pageTitle')} /> 
      
      <div className="space-y-6 mt-4">
        {/* Restore User Info Section */}
        <div className="flex flex-col items-center justify-center">
           <div className="bg-blue-100 dark:bg-blue-900 p-6 rounded-full">
             <User className="h-16 w-16 text-blue-500 dark:text-blue-300" />
           </div>
           <h1 className="text-2xl font-bold mt-4">
             {profile.name || t('settings.defaultName')} 
           </h1>
           <p className="text-gray-500 dark:text-gray-400">
             {profile.username ? `@${profile.username}` : ''}
           </p>
        </div>
        
        <Card>
          <CardHeader> 
            <CardTitle className="text-xl font-semibold flex items-center justify-between">
              {t('settings.personalInfoTitle')} 
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setIsEditing(!isEditing)}
              >
                <Edit className="h-5 w-5" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4"> 
            <div className="space-y-4">
              {/* Restore Input/Display for name */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('settings.nameLabel')}</label> 
                {isEditing ? (
                  <Input 
                    value={profile.name}
                    onChange={(e) => setProfile({...profile, name: e.target.value})}
                  />
                ) : (
                  <div className="flex items-center p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
                    <User className="h-4 w-4 text-gray-500 mr-2" /> {/* Adjusted margin */} 
                    <span>{profile.name || t('settings.noDataPlaceholder')}</span>
                  </div>
                )}
              </div>
              {/* Restore Display for email */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('auth.emailLabel')}</label> 
                <div className="flex items-center p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
                  <Mail className="h-4 w-4 text-gray-500 mr-2" /> {/* Adjusted margin */} 
                  <span>{profile.email}</span>
                </div>
              </div>
              {/* Restore Display for username */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('auth.usernameLabel')}</label> 
                <div className="flex items-center p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
                  <User className="h-4 w-4 text-gray-500 mr-2" /> {/* Adjusted margin */} 
                  <span>{profile.username || t('settings.noDataPlaceholder')}</span>
                </div>
              </div>
              {isEditing && (
                <Button 
                  className="w-full mt-4"
                  onClick={handleSaveProfile}
                  disabled={isLoading}
                >
                  {t('settings.saveChangesButton')} 
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold flex items-center">
               <Palette className="h-5 w-5 mr-2 text-gray-600 dark:text-gray-400" />
              {t('settings.appSettingsTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            {/* Language Switcher Row - Adding ToggleGroup */}
            <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
              <div className="flex items-center">
                <Languages className="h-5 w-5 mr-3 text-gray-500 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('settings.languageLabel')}</span>
              </div>
              <ToggleGroup 
                type="single" 
                value={currentLanguageCode} 
                onValueChange={(value: string) => {
                  if (value) changeLanguage(value);
                }}
                aria-label={t('settings.languageLabel')}
                className="gap-1"
              >
                {languages.map((lang: { code: string; label: string; dir: string }) => ( // Added type to lang
                  <ToggleGroupItem 
                    key={lang.code} 
                    value={lang.code} 
                    aria-label={lang.label} 
                    className="p-2 h-auto rounded-md text-xs"
                  >
                    {lang.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
            {/* Theme Switcher Row (remains ToggleGroup) */}
             <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
               <div className="flex items-center">
                 <Palette className="h-5 w-5 mr-3 text-gray-500 dark:text-gray-400" />
                 <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('settings.themeLabel')}</span>
               </div>
               <ToggleGroup 
                 type="single" 
                 value={theme} 
                 onValueChange={(value: string) => {
                   if (value) setTheme(value);
                 }}
                 aria-label={t('theme.toggleTheme')}
                 className="gap-1"
               >
                 <ToggleGroupItem value="light" aria-label={t('theme.light')} className="p-2 h-auto rounded-md">
                   <Sun className="h-4 w-4" />
                 </ToggleGroupItem>
                 <ToggleGroupItem value="dark" aria-label={t('theme.dark')} className="p-2 h-auto rounded-md">
                   <Moon className="h-4 w-4" />
                 </ToggleGroupItem>
                 <ToggleGroupItem value="system" aria-label={t('theme.system')} className="p-2 h-auto rounded-md">
                   <Laptop className="h-4 w-4" />
                 </ToggleGroupItem>
               </ToggleGroup>
            </div>
          </CardContent>
        </Card>
        
        {/* Restore Logout Button Section */}
        <div className="pt-6">
           <Button 
             variant="outline" 
             className="w-full bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-all duration-300 h-12 rounded-xl shadow-sm hover:shadow-md"
             onClick={handleLogout}
           >
             <LogOut className="h-5 w-5 mr-2" /> {/* Adjusted margin */} 
             {t('auth.logout')}
           </Button>
        </div>
      </div>
    </div>
  );
} 