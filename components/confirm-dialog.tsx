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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  children: React.ReactNode;
}

export function ConfirmDialog({
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  children,
}: ConfirmDialogProps) {
  const [open, setOpen] = React.useState(false);

  const handleConfirm = () => {
    onConfirm();
    setOpen(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {children}
      </AlertDialogTrigger>
      <AlertDialogContent className="w-full max-w-md z-50 shadow-xl border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800 p-0 animate__fadeIn">
        <div className="p-6"> 
          <div className="flex gap-4 items-start"> 
            <AlertTriangle className="h-6 w-6 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <AlertDialogTitle className="text-lg font-medium text-red-800 dark:text-red-300 mb-2">{title}</AlertDialogTitle>
              <AlertDialogDescription className="text-gray-700 dark:text-gray-300 mb-4">
                {description}
              </AlertDialogDescription>
              <AlertDialogFooter className="flex gap-2 justify-end mt-4 pt-0 border-t-0">
                <AlertDialogCancel 
                  onClick={(e) => e.stopPropagation()}
                  className="border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 bg-transparent dark:bg-transparent dark:hover:bg-gray-700 rounded-lg transition-all duration-200 shadow-sm px-4 py-2 h-auto"
                  style={{borderWidth: '1px'}}
                >
                  {cancelText}
                </AlertDialogCancel>
                <AlertDialogAction 
                  className="bg-red-600 hover:bg-red-700 text-white dark:bg-red-700 dark:hover:bg-red-600 rounded-lg transition-all duration-200 shadow-sm hover:shadow font-medium px-4 py-2 h-auto" 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    handleConfirm(); 
                  }}
                >
                  {confirmText}
                </AlertDialogAction>
              </AlertDialogFooter>
            </div>
          </div>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
} 