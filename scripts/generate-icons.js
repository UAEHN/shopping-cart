// سكريبت لتوليد أيقونات PWA بأحجام مختلفة من ملف SVG
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('بدء توليد أيقونات PWA...');

// تحقق من وجود مجلد الأيقونات
const iconsDir = path.join(__dirname, '../public/icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
  console.log('تم إنشاء مجلد الأيقونات');
}

// أحجام الأيقونات المطلوبة
const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];

// مسار ملف SVG المصدر
const svgPath = path.join(__dirname, '../public/icons/shopping-cart.svg');

// تحقق من وجود ملف SVG
if (!fs.existsSync(svgPath)) {
  console.error('خطأ: ملف SVG غير موجود في المسار:', svgPath);
  process.exit(1);
}

// تثبيت المكتبات اللازمة إذا لم تكن موجودة
try {
  console.log('التحقق من وجود المكتبات اللازمة...');
  execSync('npm list sharp || npm install sharp', { stdio: 'inherit' });
} catch (error) {
  console.error('خطأ أثناء تثبيت المكتبات:', error);
  process.exit(1);
}

// استيراد مكتبة sharp بعد التأكد من تثبيتها
const sharp = require('sharp');

// توليد الأيقونات بمختلف الأحجام
async function generateIcons() {
  try {
    // قراءة ملف SVG
    const svgBuffer = fs.readFileSync(svgPath);
    
    // توليد الأيقونات بمختلف الأحجام
    for (const size of iconSizes) {
      const outputPath = path.join(iconsDir, `icon-${size}x${size}.png`);
      
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      
      console.log(`تم إنشاء أيقونة بحجم ${size}x${size} في: ${outputPath}`);
    }
    
    // نسخ الأيقونة الرئيسية إلى المجلد العام
    await sharp(svgBuffer)
      .resize(192, 192)
      .png()
      .toFile(path.join(__dirname, '../public/icon.png'));
    
    console.log('تم إنشاء جميع الأيقونات بنجاح!');
  } catch (error) {
    console.error('خطأ أثناء توليد الأيقونات:', error);
    process.exit(1);
  }
}

// تنفيذ الدالة
generateIcons();
