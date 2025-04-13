'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe } from 'lucide-react';

// تعريف اللغات المتاحة مع التسميات والاتجاهات
const languages = [
  { code: 'ar', label: 'العربية', dir: 'rtl' },
  { code: 'en', label: 'English', dir: 'ltr' },
];

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const currentLanguageCode = i18n.language.split('-')[0]; // الحصول على رمز اللغة الأساسي (مثل 'ar')

  const changeLanguage = (lng: string, dir: string) => {
    i18n.changeLanguage(lng);
    document.documentElement.setAttribute('dir', dir);
    document.documentElement.setAttribute('lang', lng);
    // حفظ اللغة المختارة في localStorage
    localStorage.setItem('i18nextLng', lng); 
  };

  // العثور على معلومات اللغة الحالية
  const currentLanguage = languages.find(lang => lang.code === currentLanguageCode) || languages[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">
          <Globe className="h-5 w-5" />
          <span>{currentLanguage.label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((lang) => (
          <DropdownMenuItem 
            key={lang.code}
            onClick={() => changeLanguage(lang.code, lang.dir)}
            disabled={currentLanguageCode === lang.code}
            className={`justify-end ${currentLanguageCode === lang.code ? 'bg-muted' : ''}`}
          >
            {lang.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSwitcher; 