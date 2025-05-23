'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { User, Mail, Edit, LogOut } from 'lucide-react';
import { supabase } from '@/services/supabase';
import { toast } from '@/components/ui/toast';
import { useTranslation } from 'react-i18next';

export default function ProfilePage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    username: ''
  });
  
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          toast.info(t('auth.loginRequired'));
          router.push('/login');
          return;
        }
        
        // جلب بيانات المستخدم من جدول المستخدمين
        const { data: userData } = await supabase
          .from('users')
          .select('name, username')
          .eq('id', user.id)
          .single();
          
        setProfile({
          name: userData?.name || user.user_metadata?.name || '',
          email: user.email || '',
          username: userData?.username || user.user_metadata?.username || ''
        });
      } catch (error) {
        console.error('Error fetching profile:', error);
        toast.error(t('profile.fetchError'));
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProfile();
  }, [router, t]);
  
  const handleSaveProfile = async () => {
    try {
      setIsLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error(t('profile.userNotFound'));
        return;
      }
      
      // تحديث البيانات في جدول المستخدمين
      const { error } = await supabase
        .from('users')
        .update({ name: profile.name })
        .eq('id', user.id);
      
      if (error) throw error;
      
      toast.success(t('profile.updateSuccess'));
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(t('profile.updateError'));
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.info(t('profile.logoutSuccess'));
      router.push('/login');
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error(t('profile.logoutError'));
    }
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-xl">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="p-4 pt-20 pb-20">
      <Header title={t('profile.pageTitle')} />
      
      <div className="space-y-6 mt-4">
        <div className="flex flex-col items-center justify-center">
          <div className="bg-blue-100 dark:bg-blue-900 p-6 rounded-full">
            <User className="h-16 w-16 text-blue-500 dark:text-blue-300" />
          </div>
          <h1 className="text-2xl font-bold mt-4">
            {profile.name || t('profile.defaultName')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            {profile.username ? `@${profile.username}` : ''}
          </p>
        </div>
        
        <Card>
          <CardContent className="p-6 space-y-4">
            <h2 className="text-xl font-semibold flex items-center justify-between">
              {t('profile.personalInfoTitle')}
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setIsEditing(!isEditing)}
              >
                <Edit className="h-5 w-5" />
              </Button>
            </h2>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('profile.nameLabel')}</label>
                {isEditing ? (
                  <Input 
                    value={profile.name}
                    onChange={(e) => setProfile({...profile, name: e.target.value})}
                  />
                ) : (
                  <div className="flex items-center p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
                    <User className="h-4 w-4 text-gray-500 ml-2" />
                    <span>{profile.name || t('profile.noDataPlaceholder')}</span>
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('auth.emailLabel')}</label>
                <div className="flex items-center p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
                  <Mail className="h-4 w-4 text-gray-500 ml-2" />
                  <span>{profile.email}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('auth.usernameLabel')}</label>
                <div className="flex items-center p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
                  <User className="h-4 w-4 text-gray-500 ml-2" />
                  <span>{profile.username || t('profile.noDataPlaceholder')}</span>
                </div>
              </div>
              
              {isEditing && (
                <Button 
                  className="w-full mt-4"
                  onClick={handleSaveProfile}
                  disabled={isLoading}
                >
                  {t('profile.saveChangesButton')}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
        
        <div className="pt-6">
          <Button 
            variant="outline" 
            className="w-full bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-all duration-300 h-12 rounded-xl shadow-sm hover:shadow-md"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5 ml-2" />
            {t('auth.logout')}
          </Button>
        </div>
      </div>
    </div>
  );
} 