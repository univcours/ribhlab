# RibhLab — ربح لاب | العربية · English · Français

موقع نشر تعليمي بثلاث لغات، جاهز للبناء والاستضافة على Netlify أو أي خدمة تستضيف ملفات HTML. **المشروع مكتمل كموقع، لكنه غير منشور على الإنترنت بعد**. يلزمك دومين، وبريد تواصل حقيقي، وربط مستودع GitHub بلوحة الإدارة.

## ما الذي يضمّه المشروع؟

- **60 صفحة HTML**: ثلاث صفحات رئيسية، تسع صفحات أقسام، 27 صفحة مقالة، 18 صفحة تعريفية وقانونية، وثلاث صفحات أدوات تفاعلية.
- **9 موضوعات مفيدة × 3 لغات** (27 نسخة لغوية أصلية/مترجمة بعناية)، قابلة للتعديل أو الحذف أو الإضافة.
- إدارة محتوى مبنية على **Sveltia CMS** في `/admin/` مع محرر JSON قابل للتحرير، يتطلب ربط GitHub والاعتماد المناسب.
- بحث سريع حسب اللغة، تصميم RTL بالعربية وLTR بالإنجليزية/الفرنسية، قائمة للهاتف وروابط لتغيير لغة المقال.
- أدوات تعمل محلياً: حاسبة ميزانية مخاطرة التداول، حاسبة تسعير العمل الحر، ومولّد برومبت.
- SEO: HTML جاهز للزحف، عناوين وأوصاف مختلفة، بيانات Article structured data، `robots.txt`، وملفات sitemap/canonical/hreflang تلقائية **بعد** إعداد الدومين.
- صفحات: سياسة الخصوصية، شروط الاستخدام، من نحن، التواصل، إخلاء المسؤولية، السياسة التحريرية.
- **AdSense غير مفعّل افتراضياً.** لا توجد إعلانات أو كوكيز تتبع أو تحليلات خارجية في هذا الإصدار.

## 1. تشغيل الموقع محلياً

يلزم **Node.js 20 أو أحدث**؛ لا توجد مكتبات npm ضرورية.

```bash
npm run build
npm run check
npm run dev
```

افتح `http://localhost:4173/ar/`، أو `/en/`، أو `/fr/`. أوقف الخادم بـ `Ctrl+C`.

يمكن أيضاً استضافة محتوى مجلد `dist/` على أي استضافة ثابتة. لا ترفع المشروع كاملاً كموقع جاهز؛ ارفع `dist` فقط بعد البناء.

## 2. التحضير الفعلي للنشر — مطلوب

حرّر `site.config.json`:

```json
{
  "brand": "RibhLab",
  "domain": "https://YOUR-REAL-DOMAIN.COM",
  "contactEmail": "YOUR-REAL-EMAIL@YOUR-DOMAIN.COM",
  "publisherName": "RibhLab Editorial Team",
  "adsensePublisherId": "",
  "social": {"youtube":"", "linkedin":""}
}
```

استعمل الدومين والبريد اللذين تملكهما فعلياً؛ لا تختلق بيانات اتصال. أدخل اسم الناشر الحقيقي والجهة المسؤولة عن المحتوى. بعد ذلك شغّل `npm run build` و `npm run check` من جديد. لا تنتج روابط canonical صحيحة أو sitemap إلا بعد تحديد الدومين.

**Netlify**: ضع المشروع في GitHub وأنشئ موقعاً من المستودع (Build command: `npm run build`; Publish directory: `dist`). ملف `netlify.toml` مهيأ. كل تغيير تُرسله إلى الفرع `main` يطلق إعادة بناء تلقائية وفق إعدادات الاستضافة.

## 3. لوحة إدارة المقالات (قابلة للتحديث)

1. أنشئ مستودع GitHub واحفظ فيه محتويات هذا المشروع.
2. حرّر `admin/config.yml` ثم غيّر `repo: YOUR_GITHUB_USERNAME/YOUR_REPOSITORY` إلى اسم المستودع الصحيح.
3. افتح `https://YOUR-REAL-DOMAIN.COM/admin/` بعد النشر.
4. لتسجيل الدخول كمالك مستودع GitHub، اختر **Sign In with Token** في Sveltia CMS واستعمل access token بحدود الوصول المناسبة إلى المستودع فقط. لا تشارك المفتاح مع أحد، ولا تضفه إلى ملفات الموقع.
5. بعد حفظ أي مقالة، يكتب CMS المحتوى إلى GitHub ويعيد Netlify بناء الموقع. قد تحتاج إلى مراجعة صلاحيات المستودع وواجهة التحكم عند أول نشر.

للفرق التي تفضّل دخولاً دون token، يمكن إعداد OAuth وفق توثيق Sveltia الرسمي. لوحة التحكم تعتمد على خدمة خارجية وقت التشغيل ولا تعمل بدون الربط والإنترنت.

### تحرير مباشر دون لوحة تحكم

كل مقالة ملف في `content/articles/*.json`. يمكنك فتحه وتعديل محتوى `translations.ar` و`translations.en` و`translations.fr` و`sections`. لنسخ مقال جديد، انسخ ملفاً، غيّر اسمه و`slug` والفئة والتواريخ واللغات الثلاث، ثم أعد البناء. سيظهر في الأقسام والبحث والخريطة تلقائياً. **تحتوي كل مقالة على اللغات الثلاث كاملة**؛ البناء يمنع النشر إذا نقصت ترجمة أو ثلاثة أقسام على الأقل. حافظ على استقلالية التحرير وجودة الترجمة.

## 4. AdSense: التجهيز ≠ الموافقة

تم تصميم التنقل والصفحات والمحتوى الأصلي والمراجعة لتسهيل استيفاء متطلبات شائعة، **لكن لا توجد أي طريقة تضمن القبول**؛ Google وحدها تقرر، وهي تتحقق من جودة الموقع الحقيقية وملاءمة المحتوى والالتزام بالسياسات. قبل تقديم الطلب:

- انشر الموقع على دومين صالح مع SSL، واختبره على الهاتف، واملأ بريد التواصل باسم حقيقي يعمل، واكتب تعريفاً صادقاً عن الناشر.
- راجع جميع المقالات وأضف محتوى أصلياً من خبرتك، أمثلة أو اختبارات حقيقية، روابط مرجعية موثوقة، وتحديثات منتظمة حيث يلزم. المحتوى الحالي نقطة بداية، وليس ضماناً للجودة المطلوبة.
- أصلح أي صفحات ناقصة أو مكررة، وأبقِ روابط التنقل والفهرسة فعّالة؛ أرسل sitemap إلى Search Console.
- لا تعرض وعوداً بتحقيق أرباح مضمونة أو نتائج تداول مضللة، ولا تشجّع النقر على الإعلانات.
- أضف الإفصاحات المناسبة لأي روابط تسويق بالعمولة وشروط المنتجات قبل إطلاقها.
- بعد قبول الحساب، أدخل معرف الناشر `ca-pub-XXXXXXXXXXXXXXXX` في `adsensePublisherId`، وسيولّد الموقع `ads.txt` عند البناء.
- **لا تفعّل تحميل سكربت الإعلانات قبل إعداد الموافقات المطلوبة.** لخدمة إعلانات مخصّصة للمستخدمين في EEA/UK/سويسرا، تتطلب Google منصة إدارة موافقة معتمدة من Google ومتكاملة مع IAB TCF. استخدم Google Privacy & messaging أو مزوداً معتمداً. هذا المشروع لا يحتوي CMP معتمدة؛ ولا يُعد أي إشعار كوكيز عادي بديلاً عنها.
- بعد التفعيل القانوني والصحيح للـ CMP وتحديث سياسة الخصوصية، أضف `"enableAdsense": true` إلى `site.config.json`، وأعد البناء. سيُحمّل سكربت Auto Ads إذا أدخلت معرف ناشر صالحاً.

الوثائق الرسمية:

- Google AdSense eligibility: https://support.google.com/adsense/answer/9724
- Page readiness: https://support.google.com/adsense/answer/7299563
- Certified consent platforms: https://support.google.com/adsense/answer/13554116
- Sveltia CMS GitHub: https://sveltiacms.app/en/docs/backends/github

## 5. حدود النسخة الحالية

- لا يمكنني نشره على دومين أو ربطه بحساب Google/GitHub نيابة عنك دون الحسابات وصلاحياتك.
- الإدارة تحتاج إعداد GitHub مرة واحدة. المستخدم النهائي يرى موقعاً ثابتاً سريعاً؛ التحديثات ليست تلقائية من مصادر الأخبار، بل تتم بالنشر والتحرير والتحقق.
- لم يتم تفعيل نموذج إرسال مباشر؛ التواصل عبر البريد الفعلي الذي ستحدده. يجب تهيئته قبل تقديم الموقع للمراجعة.
- أدوات التداول تعليمية ولا تقدم حساب حجم عقد فعلي أو إشارات تداول.
- صفحة `privacy` تصف النسخة الافتراضية بدون أدوات تتبع. **يجب تحديثها** إذا أضفت خدمات تحليل أو إعلانات أو نماذج أو تقنيات تخزين بيانات.

---

**EN**: Build with `npm run build`; preview with `npm run dev`; edit `site.config.json`, configure `admin/config.yml` for your GitHub repository, then deploy `dist/` (Netlify build is preconfigured). Ads are intentionally off; the site is not automatically accepted to AdSense.

**FR** : Lancez `npm run build`, puis `npm run dev` pour prévisualiser. Renseignez le domaine et l’e-mail dans `site.config.json`, configurez GitHub dans `admin/config.yml`, puis publiez `dist/` avec Netlify. AdSense est désactivé par défaut et l’admission n’est jamais garantie.

## Sharing and Google Search

Every article has share links for WhatsApp, Facebook, X, LinkedIn, Telegram, Pinterest, Reddit and email. Native device sharing and copy-link also support Instagram/TikTok/Snapchat manually (they do not offer universal web prefilled sharing links). Metadata includes Open Graph image, Twitter/X card, canonical, hreflang and Article JSON-LD. Sitemap and robots.txt are produced from `SITE_URL` during builds. After deployment, submit `https://univcours.github.io/ribhlab-site/sitemap.xml` to Google Search Console and verify ownership. Indexation is determined by search engines, not guaranteed.
