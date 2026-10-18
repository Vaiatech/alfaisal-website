# رفع موقع الفيصل على Hostinger

الموقع المعتمد (Dark Luxury) موجود في المجلد `concepts/1-dark-luxury`. باقي مجلدات المستودع نسخ وتصاميم سابقة لا تُرفع.

## أولًا: الرفع (بدون أي برمجة)

1. من صفحة **Releases** في هذا المستودع حمّل الملف `alfaisal-site-hostinger.zip`.
2. في لوحة Hostinger (hPanel): **Websites ← Manage ← File Manager**، وافتح المجلد `public_html`.
3. احذف الملفات الافتراضية الموجودة فيه (مثل `default.php` أو `index.php`).
4. اضغط **Upload** وارفع ملف الـ zip، ثم اضغط عليه بالزر الأيمن واختر **Extract** واستخرجه داخل `public_html` نفسه.
5. تأكد أن `index.html` أصبح مباشرة داخل `public_html` (وليس داخل مجلد فرعي)، ثم احذف ملف الـ zip.
6. من **Security ← SSL** فعّل شهادة SSL ثم **Force HTTPS**.

ملاحظات:
- يجب رفع الموقع على جذر الدومين (`public_html`) لا على مجلد فرعي، لأن روابط الصفحات تبدأ من الجذر.
- الملف `.htaccess` يكون مخفيًا أحيانًا في File Manager؛ هو جزء من الموقع فلا تحذفه.
- النسخة الإنجليزية على `/en/`، وصفحة التواصل على `/contact/`.

## ثانيًا: مواصلة التطوير

المتطلبات: Node.js 22 أو أحدث، وGit.

```bash
git clone https://github.com/Vaiatech/alfaisal-website.git
cd alfaisal-website
git checkout dark-luxury
cd concepts/1-dark-luxury
npm install
npm run dev
```

ثم افتح `http://127.0.0.1:4401`.

أين تُعدّل الأشياء:
- النصوص العربية: `concepts/shared/content.ts`
- النصوص الإنجليزية: `concepts/shared/content.en.ts`
- صور الفريق: `concepts/1-dark-luxury/public/team/`
- التصميم: `concepts/1-dark-luxury/src/styles/global.css` والمكوّنات في `src/components/`

## ثالثًا: نشر التعديلات على Hostinger

```bash
cd concepts/1-dark-luxury
npm run build
```

ينتج المجلد `dist/`. اضغط **محتويات** هذا المجلد (وليس المجلد نفسه) في ملف zip، وارفعه إلى `public_html` واستخرجه فوق الملفات القديمة كما في الخطوات أعلاه. عند الضغط على Windows يُفضّل 7-Zip، لأن الضغط المدمج في بعض نسخ Windows يكتب المسارات بشكل لا تقرؤه خوادم Linux.

---

# Deploying the Al-Faisal site on Hostinger (English)

The approved site lives in `concepts/1-dark-luxury`.

1. **Upload:** download `alfaisal-site-hostinger.zip` from this repo's Releases. In hPanel open File Manager → `public_html`, remove the default files, upload the zip, and Extract it there so `index.html` sits directly in `public_html`. Enable SSL and Force HTTPS. The site must be at the domain root, not a subfolder.
2. **Develop:** Node.js 22+. `git checkout dark-luxury`, `cd concepts/1-dark-luxury`, `npm install`, `npm run dev` (http://127.0.0.1:4401). Copy is in `concepts/shared/content.ts` (Arabic) and `content.en.ts` (English).
3. **Publish changes:** `npm run build`, zip the *contents* of `dist/`, upload and extract over the old files in `public_html`.
