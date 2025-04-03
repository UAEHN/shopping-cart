'use client';

import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ConfirmDialogProps {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  buttonVariant?: 'ghost' | 'destructive' | 'default';
  buttonSize?: 'icon' | 'default' | 'sm';
  buttonClass?: string;
}

export function ConfirmDialog({
  title,
  description,
  confirmText = 'حذف',
  cancelText = 'إلغاء',
  onConfirm,
  buttonVariant = 'ghost',
  buttonSize = 'icon',
  buttonClass = 'h-8 w-8 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 dark:text-red-400 transition-all duration-200 rounded-full',
}: ConfirmDialogProps) {
  const [open, setOpen] = React.useState(false);

  const handleConfirm = () => {
    onConfirm();
    setOpen(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <Button
        variant={buttonVariant}
        size={buttonSize}
        className={buttonClass}
        onClick={() => setOpen(true)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
      <AlertDialogContent className="rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg bg-white dark:bg-gray-850 p-6 max-w-md mx-auto animate__fadeIn">
        <AlertDialogHeader className="gap-4 items-center">
          <div className="mx-auto bg-red-100 dark:bg-red-900/30 p-3 rounded-full">
            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <AlertDialogTitle className="text-center text-lg font-bold text-gray-800 dark:text-gray-100">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-center text-gray-600 dark:text-gray-300">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-row space-x-2 space-x-reverse pt-4 border-t border-gray-100 dark:border-gray-800 mt-4">
          <AlertDialogCancel className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-300 rounded-lg transition-all duration-200 shadow-sm">
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction 
            className="flex-1 bg-red-500 hover:bg-red-600 text-white dark:bg-red-700 dark:hover:bg-red-600 rounded-lg transition-all duration-200 shadow-sm hover:shadow font-medium" 
            onClick={handleConfirm}
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
} 