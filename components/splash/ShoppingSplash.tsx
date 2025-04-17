'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Apple, Milk, Carrot, Banana } from 'lucide-react';
// استيراد خط Cairo
import { Cairo } from 'next/font/google';

// إعداد خط Cairo
const cairo = Cairo({
  subsets: ['arabic', 'latin'], // دعم اللغتين
  weight: ['400', '700'], // تحديد الأوزان المطلوبة
  display: 'swap', // تحسين الأداء
});

// إعادة تعريف المنتجات
const products = [
  { id: 1, Icon: Apple, initialX: '35%', color: 'text-red-500' },
  { id: 2, Icon: Milk, initialX: '45%', color: 'text-blue-300' },
  { id: 3, Icon: Carrot, initialX: '55%', color: 'text-orange-500' },
  { id: 4, Icon: Banana, initialX: '65%', color: 'text-yellow-400' },
];

// إعادة variants المنتجات والحاوية
const containerVariants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.2, delayChildren: 0.3 },
  },
  exit: { 
    opacity: 1, 
    transition: { staggerChildren: 0.1, delayChildren: 0 }
  }
};

// تعديل variants المنتجات لتتوقف أعلى
const productVariants = {
  hidden: (custom: number) => ({
    y: '-50vh', 
    x: '-50%', 
    opacity: 0, 
    scale: 0.8, 
    rotate: custom * 25 
  }),
  visible: (custom: number) => ({
    // تقليل القيمة النهائية لـ y مرة أخرى
    y: `${55 + custom * 5}vh`, // <-- قيمة متوسطة هنا
    x: '-50%',
    opacity: 1,
    scale: 1, 
    rotate: custom * -15, 
    transition: {
      y: { 
          type: 'tween', 
          ease: "easeOut", 
          duration: 1.3 + Math.random() * 0.3, // تعديل المدة للمسافة الجديدة
          delay: Math.random() * 0.1 
      }, 
      opacity: { duration: 0.5 }, 
      rotate: { duration: 1.5, ease: "linear" } 
    },
  }),
  exit: (custom: number) => ({
    x: '0%', 
    // تعديل y للخروج
    y: `${70 + custom * 5}vh`, // <-- تعديل قيمة y للخروج
    opacity: 0,
    scale: 0.1,
    rotate: custom * 30,
    transition: { duration: 0.4, ease: "circIn", delay: 0.1 } 
  })
};

// Variants لحاوية العلامة التجارية (ستكون في الأسفل)
const brandingContainerVariants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.8 } // تأخير ظهورها حتى تبدأ المنتجات بالسقوط
  },
  exit: {
    opacity: 1,
    transition: { staggerChildren: 0.1, staggerDirection: -1 }
  }
};

// Variants لحركة الشعار والنص (نفسها)
const logoVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }, exit: { opacity: 0, y: -10, transition: { duration: 0.2, ease: "easeIn" } } };
const titleVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }, exit: { opacity: 0, y: -10, transition: { duration: 0.2, ease: "easeIn" } } };
const descriptionVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }, exit: { opacity: 0, y: -10, transition: { duration: 0.2, ease: "easeIn" } } };
const sparkVariants = { hidden: { opacity: 0, scale: 0 }, visible: (i: number) => ({ opacity: [1, 0], scale: [1, 0], x: Math.cos((i * Math.PI) / 4) * 50, y: Math.sin((i * Math.PI) / 4) * 50, transition: { duration: 0.4 + Math.random() * 0.2, ease: "easeOut", }, }), };

interface ShoppingSplashProps {
  onAnimationComplete: () => void;
}

export default function ShoppingSplash({ onAnimationComplete }: ShoppingSplashProps) {
  const [productsVisible, setProductsVisible] = useState(true); // للتحكم بـ visible/exit للمنتجات
  const [startExit, setStartExit] = useState(false); // لبدء خروج العلامة التجارية والشاشة
  const [showSparks, setShowSparks] = useState(false); // لتحكم بظهور الأفراح

  const handleProductsFallComplete = () => {
    console.log("Products tween fall (medium height) complete, triggering sparks and exit...");
    setShowSparks(true); 
    // تعديل التأخيرات لتتناسب مع مدة السقوط الجديدة
    setTimeout(() => {
      setShowSparks(false); 
      setProductsVisible(false); 
    }, 300); 
    
    setTimeout(() => {
      setStartExit(true);
    }, 1200); // تعديل التأخير الإجمالي (كان 1300)
  };

  return (
    <AnimatePresence onExitComplete={onAnimationComplete}>
      {!startExit && (
        <motion.div
          key="splash-screen-animated-bg-centered-tween-fall-medium"
          className={`fixed inset-0 z-0 flex flex-col items-center justify-center p-8 bg-gradient-to-br from-blue-100 via-purple-100 to-blue-200 dark:from-gray-800 dark:via-gray-900 dark:to-black overflow-hidden ${cairo.className}`}
          style={{ backgroundSize: '200% 200%' }}
          initial={{ backgroundPosition: "0% 50%", opacity: 1 }}
          animate={{
            backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
            opacity: 1,
          }}
          transition={{
            backgroundPosition: { duration: 20, repeat: Infinity, ease: "linear", repeatType: "mirror" },
            opacity: { duration: 0.5 }
          }}
          exit={{ opacity: 0 }}
        >
          {/* حاوية المنتجات - إضافة z-10 */}
          <motion.div
            className="absolute top-0 left-0 right-0 w-full h-3/5 pointer-events-none z-10" 
            variants={containerVariants}
            initial="hidden"
            animate={productsVisible ? "visible" : "exit"} 
            onAnimationComplete={handleProductsFallComplete} 
          >
            {products.map((product) => (
              <motion.div
                key={product.id}
                variants={productVariants}
                custom={Math.random() * 2 - 1}
                className={`absolute top-0 ${product.color}`}
                style={{ left: product.initialX }} 
              >
                <product.Icon size={48} strokeWidth={1.5} />
              </motion.div>
            ))}
          </motion.div>

          {/* حاوية العلامة التجارية - إضافة z-20 */}
          <motion.div 
            className="flex flex-col items-center text-center w-full max-w-md px-4 mt-16 z-20" 
            variants={brandingContainerVariants}
            initial="hidden"
            animate="visible"
            exit="exit" 
          >
            <motion.div variants={logoVariants}>
              <img 
                src="/icons/icon-512x512.png" 
                alt="شعار عربة التسوق" 
                className="w-16 h-16 mb-4 rounded-lg" 
              />
            </motion.div>
            <motion.h1 
              variants={titleVariants}
              className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2"
            >
              عربة التسوق
            </motion.h1>
            <motion.p 
              variants={descriptionVariants}
              className="text-base text-gray-500 dark:text-gray-400"
            >
              تطبيق لإنشاء وإرسال قوائم التسوق بسهولة
            </motion.p>
          </motion.div>

          {/* حاوية الشرارات - إضافة z-10 (لتكون فوق الخلفية وتحت النص) */}
          <AnimatePresence>
            {showSparks && (
              <motion.div 
                className="absolute bottom-[30%] left-1/2 -translate-x-1/2 z-10"
                // تعديل bottom ليتناسب مع y=55vh (تقريبي)
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {[...Array(8)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-2 h-2 bg-yellow-400 rounded-full"
                    variants={sparkVariants}
                    initial="hidden"
                    animate="visible"
                    custom={i}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>

        </motion.div>
      )}
    </AnimatePresence>
  );
} 