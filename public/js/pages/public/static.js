/**
 * public/js/pages/public/static.js
 * الصفحات العامة التعريفية والقانونية (/about, /privacy, /terms, /faq).
 */
(function () {
  Router.add("/about", async (root) => {
    const ar = I18n.getLocale() === "ar";
    const siteRes = await ApiServices.publicCatalog.getSite();
    const site = (siteRes.success && siteRes.data) || { stats: {} };

    root.innerHTML = PublicLayout.render({
      title: I18n.t("pub_about"),
      content: `
        <div class="card">
          <h2 class="card-title">${Components.escapeHtml(ar ? (site.site_name || "سوق الكل") : (site.site_name_en || "Souq Al-Kul"))}</h2>
          <p style="line-height:1.8;color:var(--fg-muted);margin-bottom:18px">
            ${ar
              ? "سوق الكل هي منصة تجارة إلكترونية متعددة المستأجرين والأدوار تجمع بين تجربة التسوق السريعة للعملاء، وأدوات إدارة المخزون والمدفوعات للتجار، وإشراف المحتوى، وتنفيذ الشحنات للفرق التشغيلية."
              : "Souq Al-Kul is a unified multi-tenant e-commerce platform connecting shoppers with verified merchants, streamlined order fulfillment, moderation workflows, and multi-channel notifications."}
          </p>
          <div class="stats-grid" style="margin-bottom:0">
            ${Components.statsCard((site.stats && site.stats.products_count) ?? 0, ar ? "منتجات نشطة" : "Active Products")}
            ${Components.statsCard((site.stats && site.stats.stores_count) ?? 0, ar ? "متاجر شريكة" : "Partner Stores")}
            ${Components.statsCard((site.stats && site.stats.posts_count) ?? 0, ar ? "مقالات منشورة" : "Published Articles")}
            ${Components.statsCard(site.default_currency || "SAR", ar ? "العملة المعتمدة" : "Default Currency")}
          </div>
        </div>
      `,
    });
  });

  Router.add("/privacy", async (root) => {
    const ar = I18n.getLocale() === "ar";
    root.innerHTML = PublicLayout.render({
      title: I18n.t("pub_privacy"),
      content: `
        <div class="card" style="line-height:1.9">
          <h2 class="card-title">${ar ? "التزامنا بحماية الخصوصية" : "Our Privacy Commitment"}</h2>
          <p>${ar
            ? "نلتزم بحماية بيانات المستخدمين والتجار وتأمين جلسات الدخول باستخدام ملفات تعريف ارتباط مشفرة (HttpOnly) وعدم مشاركة البيانات الشخصية مع أي أطراف خارجية غير مصرح لها."
            : "We protect user and merchant data using secure HttpOnly session cookies, strict role-based access control, and never sell personal data to unauthorized third parties."}</p>
          <h3 class="mt-2 mb-1">${ar ? "البيانات التي نجمعها" : "Data We Collect"}</h3>
          <p style="color:var(--fg-muted)">${ar
            ? "بيانات الحساب الأساسية (الاسم، البريد الإلكتروني، رقم الهاتف)، عناوين التوصيل، وسجل الطلبات اللازم لإتمام عمليات الشراء والشحن."
            : "Account contact details, delivery addresses, and order records strictly required to fulfill purchases and shipping."}</p>
        </div>
      `,
    });
  });

  Router.add("/terms", async (root) => {
    const ar = I18n.getLocale() === "ar";
    root.innerHTML = PublicLayout.render({
      title: I18n.t("pub_terms"),
      content: `
        <div class="card" style="line-height:1.9">
          <h2 class="card-title">${ar ? "شروط استخدام منصة سوق الكل" : "Terms of Service"}</h2>
          <p>${ar
            ? "باستخدامك منصة سوق الكل كعميل أو تاجر، فإنك توافق على الالتزام بسياسات النشر المعتمدة، ودقة معلومات المنتجات والأسعار، واحترام حقوق الملكية الفكرية."
            : "By using Souq Al-Kul as a customer or vendor, you agree to comply with marketplace content policies, accurate product pricing, and applicable commercial regulations."}</p>
          <h3 class="mt-2 mb-1">${ar ? "الطلبات والإلغاء" : "Orders & Cancellations"}</h3>
          <p style="color:var(--fg-muted)">${ar
            ? "يحق للعميل إلغاء الطلب قبل دخوله مرحلة التسليم النهائي، وتُعالج طلبات سحب أرباح التجار وفق دورة المراجعة المالية المعتمدة."
            : "Customers may cancel eligible orders prior to delivery; vendor payout requests are processed following standard operational review."}</p>
        </div>
      `,
    });
  });

  Router.add("/faq", async (root) => {
    const ar = I18n.getLocale() === "ar";
    const items = ar
      ? [
          { q: "كيف يمكنني فتح متجر جديد على سوق الكل؟", a: "من صفحة إنشاء حساب جديد اختر نوع الحساب (تاجر)، وبعد تسجيل الدخول يمكنك إدارة منتجاتك وطلباتك ومدفوعاتك." },
          { q: "كيف أتابع شحنتي بدون تسجيل الدخول؟", a: "انتقل إلى صفحة تتبع الشحنة وأدخل رقم التتبع مثل TRK-SQ-88412 للاطلاع على الحالة الفورية." },
          { q: "ما العملة المعتمدة في المنصة؟", a: "الريال السعودي (SAR) هو العملة الافتراضية ويمكن لمدير النظام تعديل الإعدادات." },
        ]
      : [
          { q: "How do I open a vendor store on Souq Al-Kul?", a: "Select Vendor on the Create Account page, then sign in to manage your products, orders, shipments, and payouts." },
          { q: "Can I track a shipment without signing in?", a: "Yes, open the Track Shipment page and enter your tracking number (e.g., TRK-SQ-88412)." },
          { q: "What is the default marketplace currency?", a: "Saudi Riyal (SAR) is configured by default." },
        ];
    root.innerHTML = PublicLayout.render({
      title: I18n.t("pub_faq"),
      content: `
        <div style="display:grid;gap:14px">
          ${items.map((it) => `
            <div class="card" style="margin-top:0">
              <h3 style="font-size:1.05rem;color:var(--primary);margin-bottom:8px">${Components.escapeHtml(it.q)}</h3>
              <p style="color:var(--fg-muted);line-height:1.7">${Components.escapeHtml(it.a)}</p>
            </div>
          `).join("")}
        </div>
      `,
    });
  });
})();
