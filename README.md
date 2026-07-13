# Dorgham CNC | ضرغام CNC

موقع إلكتروني احترافي لشركة ضرغام CNC - تصاميم خشبية فاخرة بتقنية CNC.

## المميزات

- دعم لغتين: العربية والإنجليزية مع RTL/LTR
- الوضع الليلي والنهاري
- تصميم متجاوب لجميع الأجهزة
- سلايدر تلقائي بـ 6 صور
- صفحة أعمال مميزة + صفحة جميع الأعمال مع تصنيفات
- بحث بالنص وبالصورة (مطابقة الألوان)
- حفظ المنتجات المفضلة
- تحميل الصور
- تفاصيل كل منتج
- صفحات: الرئيسية، أعمالنا، من نحن، أسئلة شائعة، تواصل معنا

## لوحة التحكم

- الرابط: `/admin/login`
- البريد الافتراضي: `admin@dorghamcnc.com`
- كلمة المرور الافتراضية: `dorgham2026`

### الأقسام
- **الصفحة الرئيسية**: العنوان والوصف وصور السلايدر
- **أعمالنا**: إضافة وتعديل وحذف الأعمال
- **روابط التواصل**: واتساب، فيسبوك، الموقع، العنوان
- **المسؤولين**: إدارة فريق العمل

### الحفظ والنشر
1. **حفظ مسودة**: يحفظ في المتصفح محلياً
2. **حفظ ونشر**: يحفظ على السيرفر (إن كان PHP متاحاً) أو ينزّل ملف `site-data.json` لرفعه يدوياً

## قاعدة البيانات (Prisma + Supabase)

### 1) إنشاء مشروع Supabase
1. ادخل [supabase.com](https://supabase.com) وأنشئ مشروعاً جديداً
2. من **Settings → Database** انسخ:
   - **Connection string → Transaction pooler** → `DATABASE_URL`
   - **Connection string → Direct** → `DIRECT_URL`

### 2) إعداد المشروع
```bash
cp .env.example .env
# عدّل DATABASE_URL و DIRECT_URL و JWT_SECRET في ملف .env

npm install
npm run db:setup
```

### 3) التشغيل
```bash
npm run dev
```
يشغّل الموقع (Vite) + API (Prisma) معاً.

### 4) النشر
- **الموقع (dist)**: ارفعه للاستضافة كما سبق
- **API (server)**: انشره على Railway / Render / VPS واضبط `DATABASE_URL`
- أو استخدم `npm run dev:api` على سيرفر Node.js

### الجداول
| الجدول | المحتوى |
|--------|---------|
| `SiteConfig` | الصفحة الرئيسية، التواصل، حساب الأدمن |
| `Product` | الأعمال |
| `Manager` | المسؤولين |

## التشغيل

```bash
npm install
npm run dev
```

## البناء للإنتاج

```bash
npm run build
npm run preview
```

## ربط الموقع بالاستضافة والدومين

### 1) بناء الموقع
```bash
npm install
npm run build
```
سيُنشأ مجلد `dist` — هذا ما ترفعه للاستضافة.

### 2) الرفع على cPanel (الأكثر شيوعاً)
1. ادخل **cPanel → File Manager**
2. افتح مجلد `public_html`
3. ارفع **كل محتويات** مجلد `dist` (ليس المجلد نفسه)
4. تأكد من وجود:
   - `index.html`
   - `site-data.json`
   - مجلد `api` (يحتوي `save-data.php`)
   - `.htaccess`

### 3) ربط الدومين
في لوحة تحكم الدومين (مثل GoDaddy / Namecheap / NIC Iraq):
| النوع | القيمة |
|--------|--------|
| A | `@` → IP السيرفر |
| A | `www` → IP السيرفر |

أو غيّر **Nameservers** إلى nameservers الاستضافة.

انتظر 15 دقيقة إلى 24 ساعة حتى يعمل الدومين.

### 4) بعد الربط
- الموقع: `https://yourdomain.com`
- لوحة التحكم: `https://yourdomain.com/admin/login`
- البريد: `admin@dorghamcnc.com`
- كلمة المرور: `dorgham2026`

### 5) إعدادات من لوحة التحكم
من **روابط التواصل**:
- واتساب
- فيسبوك
- **رابط الموقع على الخريطة** (Google Maps)
- العنوان

ثم اضغط **نشر على الموقع**.

### 6) استضافة بدون PHP (Netlify / Vercel)
- ارفع مجلد `dist` أو اربط GitHub
- بعد كل تعديل من لوحة التحكم: ارفع ملف `site-data.json` المُنزّل إلى `public`

## التقنيات

- React 19 + TypeScript
- Vite 6
- Tailwind CSS 3
- React Router 7
