# Dorgham CNC | ضرغام CNC

موقع إلكتروني احترافي لشركة ضرغام CNC - تصاميم خشبية فاخرة بتقنية CNC.

## المميزات

- دعم لغتين: العربية والإنجليزية مع RTL/LTR
- الوضع الليلي والنهاري
- تصميم متجاوب لجميع الأجهزة
- سلايدر تلقائي
- صفحة أعمال مميزة + صفحة جميع الأعمال مع تصنيفات
- بحث بالنص وبالصورة
- حفظ المنتجات المفضلة
- مساعد ذكي (Google Gemini)
- صفحات: الرئيسية، أعمالنا، من نحن، أسئلة شائعة، تواصل معنا، المحفوظات

## لوحة التحكم

- الرابط: `/admin/login`
- البريد الافتراضي: `admin@dorghamcnc.com`
- كلمة المرور الافتراضية: `dorgham2026`

## قاعدة البيانات (Prisma + Supabase)

```bash
cp .env.example .env
# عدّل DATABASE_URL و DIRECT_URL و JWT_SECRET

npm install
npm run db:setup
```

## التشغيل

```bash
npm run dev
```

يشغّل Next.js (App Router) مع API Routes على نفس المنفذ.

## البناء والنشر

```bash
npm run build
npm start
```

### Vercel
1. اربط المستودع — Framework: **Next.js**
2. أضف Environment Variables: `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, و`GEMINI_API_KEY` اختياري
3. انشر

مسار cPanel/PHP البديل موجود تحت `hosting/cpanel/` إن لزم.

## التقنيات

- Next.js (App Router) + React 19 + TypeScript
- Tailwind CSS 3
- Prisma + Supabase PostgreSQL
- Google Gemini AI
