import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  const currentLanguage = i18n.language;
  const nextLanguage = currentLanguage === 'ar' ? 'en' : 'ar';
  const nextLanguageLabel = currentLanguage === 'ar' ? 'English' : 'العربية';

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => changeLanguage(nextLanguage)}
      aria-label={`Switch to ${nextLanguageLabel}`}
      className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
    >
      <Globe className="h-5 w-5 mr-1" />
    </Button>
  );
};

export default LanguageSwitcher; 