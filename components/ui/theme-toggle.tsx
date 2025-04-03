'use client';

import { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from './button';

export function ThemeToggle() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  // تحميل تفضيلات السمة من التخزين المحلي عند تحميل المكون
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') ?? 'light';
    setIsDarkMode(savedTheme === 'dark');
    document.documentElement.classList.toggle('dark', savedTheme === 'dark');
  }, []);

  // تبديل وضع السمة بين المظلم والفاتح
  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    document.documentElement.classList.toggle('dark', newMode);
    localStorage.setItem('theme', newMode ? 'dark' : 'light');
  };

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      onClick={toggleTheme}
      className="rounded-full w-8 h-8"
      aria-label={isDarkMode ? 'التبديل إلى الوضع الفاتح' : 'التبديل إلى الوضع المظلم'}
    >
      {isDarkMode ? (
        <Sun size={18} className="text-yellow-500 transition-transform hover:rotate-45" />
      ) : (
        <Moon size={18} className="text-blue-500 transition-transform hover:-rotate-12" />
      )}
    </Button>
  );
} 