/**
 * public/js/pages/admin/settings.js
 * صفحة الإعدادات الشاملة لمدير النظام: الهوية، القنوات، الدفع، التخزين، المظهر والتخطيط.
 */
(function () {
  Router.add("/admin/settings", async (root) => {
    if (!Guards.requireRole(root, ["super_admin"])) return;
    const ar = I18n.getLocale() === "ar";

    root.innerHTML = Components.layout({
      title: I18n.t("nav_settings"),
      content: `
        <div class="tabs" id="as-tabs">
          <button class="tab-btn active" data-tab="general">${ar ? "الإعدادات والهوية" : "General & Identity"}</button>
          <button class="tab-btn" data-tab="channels">${ar ? "قنوات الإرسال" : "Channels"}</button>
          <button class="tab-btn" data-tab="payments">${ar ? "PayPal والتخزين" : "PayPal & Storage"}</button>
          <button class="tab-btn" data-tab="appearance">${ar ? "المظهر والتخطيط والبيئة" : "Appearance, Layout & Env"}</button>
        </div>
        <div id="as-body">${Components.escapeHtml(I18n.t("loading"))}</div>
      `,
    });

    const [setRes, stateRes, idRes, ppRes, stgRes, thmRes, locRes, envRes] = await Promise.all([
      ApiServices.admin.getSettings(),
      ApiServices.admin.getSystemState(),
      ApiServices.admin.getSiteIdentity(),
      ApiServices.admin.getPaypal(),
      ApiServices.admin.getStorage(),
      ApiServices.admin.getThemes(),
      ApiServices.admin.getLocales(),
      ApiServices.admin.getEnv(),
    ]);

    const settings = (setRes.success && setRes.data) || {};
    const sysState = (stateRes.success && stateRes.data) || {};
    const identity = (idRes.success && idRes.data) || {};
    const paypal = (ppRes.success && ppRes.data) || {};
    const storage = (stgRes.success && stgRes.data) || {};
    const themes = (thmRes.success && thmRes.data) || {};
    const locales = (locRes.success && locRes.data) || {};
    const envCfg = (envRes.success && envRes.data) || {};

    document.getElementById("as-body").innerHTML = `
      <div id="as-panel-general">
        <div class="grid-2">
          <div class="card">
            <h3 class="card-title">${ar ? "إعدادات النظام والهوية" : "System & Site Identity"}</h3>
            <form id="as-general-form">
              ${Forms.renderFields([
                {
                  name: "system_mode",
                  label: ar ? "وضع النظام" : "System Mode",
                  type: "select",
                  value: sysState.state || settings.system_mode || "ready",
                  options: [
                    { value: "ready", label: "ready" },
                    { value: "maintenance", label: "maintenance" },
                    { value: "development", label: "development" },
                  ],
                },
                { name: "default_currency", label: ar ? "العملة الافتراضية" : "Default Currency", value: settings.default_currency || "SAR" },
                { name: "site_name", label: ar ? "اسم الموقع" : "Site Name", value: identity.site_name || "سوق الكل", required: true },
                { name: "official_url", label: ar ? "الرابط الرسمي" : "Official URL", value: identity.official_url || "" },
                { name: "favicon_url", label: "Favicon URL", value: identity.favicon_url || "" },
              ])}
              <button class="btn" type="submit">${Components.escapeHtml(I18n.t("save"))}</button>
            </form>
          </div>
          <div class="card">
            <h3 class="card-title">${ar ? "حالة التشغيل الحالية" : "Runtime Readiness"}</h3>
            <p class="mb-2">${ar ? "الوضع النشط:" : "Active Mode:"} ${Components.statusBadge(sysState.state || "ready")}</p>
            <p style="color:var(--fg-muted);font-size:0.9rem">
              ${ar ? "يمكنك تبديل وضع الصيانة أو التطوير والهوية البصرية للمنصة من النموذج المجاور." : "Configure maintenance mode, currency, and official site branding."}
            </p>
          </div>
        </div>
      </div>

      <div id="as-panel-channels" class="hidden">
        <div class="grid-2">
          <div class="card">
            <h3 class="card-title">${ar ? "إعدادات القناة وحفظ القوالب" : "Channel Config & Templates"}</h3>
            <form id="ac-cfg-form">
              ${Forms.renderFields([
                {
                  name: "channel",
                  label: ar ? "القناة" : "Channel",
                  type: "select",
                  value: "mail",
                  options: [
                    { value: "mail", label: "Email (mail)" },
                    { value: "sms", label: "SMS" },
                    { value: "whatsapp", label: "WhatsApp" },
                  ],
                },
                { name: "provider", label: ar ? "المزود" : "Provider", value: "smtp-relay" },
                { name: "sender", label: ar ? "المرسل" : "Sender ID / Email", value: "noreply@souqalkul.local" },
                { name: "template_key", label: ar ? "مفتاح القالب" : "Template Key", value: "order_confirmed" },
              ])}
              <button class="btn" type="submit">${Components.escapeHtml(I18n.t("save"))}</button>
            </form>
          </div>
          <div class="card">
            <h3 class="card-title">${ar ? "اختبار إرسال القنوات" : "Channel Dispatch Test"}</h3>
            <form id="ac-test-form">
              ${Forms.renderFields([
                {
                  name: "channel",
                  label: ar ? "القناة" : "Channel",
                  type: "select",
                  value: "mail",
                  options: [
                    { value: "mail", label: "Email" },
                    { value: "sms", label: "SMS" },
                    { value: "whatsapp", label: "WhatsApp" },
                  ],
                },
                { name: "to", label: ar ? "الهدف" : "Recipient", required: true, placeholder: "test@souqalkul.local" },
                { name: "message", label: ar ? "الرسالة" : "Message", required: true, value: "Souq Al-Kul Test Notification" },
              ])}
              <button class="btn btn-outline" type="submit">${ar ? "اختبار الإرسال" : "Send Test"}</button>
            </form>
          </div>
        </div>
      </div>

      <div id="as-panel-payments" class="hidden">
        <div class="grid-2">
          <div class="card">
            <h3 class="card-title">${ar ? "إعدادات بوابة PayPal" : "PayPal Payment Config"}</h3>
            <form id="pp-form">
              ${Forms.renderFields([
                {
                  name: "mode",
                  label: ar ? "الوضع" : "Mode",
                  type: "select",
                  value: paypal.mode || "sandbox",
                  options: [
                    { value: "sandbox", label: "Sandbox" },
                    { value: "live", label: "Live" },
                  ],
                },
                { name: "currency", label: ar ? "العملة" : "Currency", value: paypal.currency || "USD" },
              ])}
              <div style="display:flex;gap:8px;flex-wrap:wrap">
                <button class="btn" type="submit">${Components.escapeHtml(I18n.t("save"))}</button>
                <button class="btn btn-outline" type="button" id="pp-test-btn">${ar ? "اختبار نية دفع" : "Test Payment Intent"}</button>
              </div>
            </form>
          </div>
          <div class="card">
            <h3 class="card-title">${ar ? "إعدادات التخزين السحابي / المحلي" : "Storage Driver Config"}</h3>
            <form id="stg-form">
              ${Forms.renderFields([
                {
                  name: "driver",
                  label: ar ? "المحرك" : "Driver",
                  type: "select",
                  value: storage.driver || "local",
                  options: [
                    { value: "local", label: "Local Disk" },
                    { value: "s3", label: "S3 Compatible" },
                  ],
                },
                { name: "bucket", label: "Bucket / Folder", value: storage.bucket || "uploads" },
              ])}
              <div style="display:flex;gap:8px;flex-wrap:wrap">
                <button class="btn" type="submit">${Components.escapeHtml(I18n.t("save"))}</button>
                <button class="btn btn-outline" type="button" id="stg-test-btn">${ar ? "فحص التخزين" : "Test Storage"}</button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div id="as-panel-appearance" class="hidden">
        <div class="grid-2">
          <div class="card">
            <h3 class="card-title">${ar ? "المظهر واللغة الافتراضية" : "Themes & Locales"}</h3>
            <form id="app-form">
              ${Forms.renderFields([
                {
                  name: "active_theme",
                  label: ar ? "المظهر الافتراضي" : "Default Theme",
                  type: "select",
                  value: themes.active_theme || "light",
                  options: [
                    { value: "light", label: I18n.t("theme_light") },
                    { value: "dark", label: I18n.t("theme_dark") },
                    { value: "brand", label: I18n.t("theme_brand") },
                  ],
                },
                {
                  name: "default_locale",
                  label: ar ? "اللغة الافتراضية" : "Default Locale",
                  type: "select",
                  value: locales.default_locale || "ar",
                  options: [
                    { value: "ar", label: "العربية (RTL)" },
                    { value: "en", label: "English (LTR)" },
                  ],
                },
              ])}
              <button class="btn" type="submit">${Components.escapeHtml(I18n.t("save"))}</button>
            </form>
          </div>
          <div class="card">
            <h3 class="card-title">${ar ? "فحص متغيرات البيئة" : "Environment Diagnostics"}</h3>
            <form id="env-form">
              ${Forms.renderFields([
                { name: "app_name", label: "APP_NAME", value: (envCfg.variables && envCfg.variables.APP_NAME) || "Souq Al-Kul" },
              ])}
              <div style="display:flex;gap:8px;flex-wrap:wrap">
                <button class="btn" type="submit">${Components.escapeHtml(I18n.t("save"))}</button>
                <button class="btn btn-outline" type="button" id="env-test-btn">${ar ? "فحص البيئة" : "Test Env"}</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;

    document.querySelectorAll("#as-tabs .tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("#as-tabs .tab-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        const tab = btn.dataset.tab;
        ["general", "channels", "payments", "appearance"].forEach((p) => {
          document.getElementById("as-panel-" + p).classList.toggle("hidden", p !== tab);
        });
      });
    });

    document.getElementById("as-general-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const check = Forms.validate(e.target, { site_name: { required: true } });
      if (!check.valid) return;
      const v = check.values;
      await Promise.all([
        ApiServices.admin.updateSettings({ system_mode: v.system_mode, default_currency: v.default_currency }),
        ApiServices.admin.updateSystemState({ mode: v.system_mode, state: v.system_mode }),
        ApiServices.admin.updateSiteIdentity({ site_name: v.site_name, official_url: v.official_url, favicon_url: v.favicon_url }),
      ]);
      Toast.success(ar ? "تم حفظ الإعدادات العامة" : "General settings saved");
    });

    document.getElementById("ac-cfg-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const v = Forms.serialize(e.target);
      await Promise.all([
        ApiServices.admin.updateChannelConfig(v.channel, { provider: v.provider, sender: v.sender }),
        ApiServices.admin.saveChannelTemplate(v.channel, { key: v.template_key }),
      ]);
      Toast.success(ar ? "تم حفظ إعدادات القناة" : "Channel config saved");
    });

    document.getElementById("ac-test-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const check = Forms.validate(e.target, { to: { required: true }, message: { required: true } });
      if (!check.valid) return;
      const r = await ApiServices.admin.testChannel(check.values.channel, { to: check.values.to, message: check.values.message });
      if (r.success) Toast.success(ar ? "تم إرسال رسالة الاختبار" : "Test dispatched");
      else Toast.error((r.error && r.error.message) || "Failed");
    });

    document.getElementById("pp-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const v = Forms.serialize(e.target);
      const r = await ApiServices.admin.updatePaypalConfig(v);
      if (r.success) Toast.success(ar ? "تم حفظ إعدادات PayPal" : "PayPal config saved");
    });
    document.getElementById("pp-test-btn").addEventListener("click", async () => {
      const r = await ApiServices.admin.testPaypal({ amount: 10, currency: "USD" });
      if (r.success) Toast.success(ar ? "اختبار الدفع ناجح" : "Payment intent test OK");
    });

    document.getElementById("stg-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const v = Forms.serialize(e.target);
      const r = await ApiServices.admin.updateStorage(v);
      if (r.success) Toast.success(ar ? "تم حفظ إعدادات التخزين" : "Storage config saved");
    });
    document.getElementById("stg-test-btn").addEventListener("click", async () => {
      const r = await ApiServices.admin.testStorage();
      if (r.success) Toast.success(ar ? "التخزين جاهز للعمل" : "Storage ready");
    });

    document.getElementById("app-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const v = Forms.serialize(e.target);
      await Promise.all([
        ApiServices.admin.updateThemes({ active_theme: v.active_theme, themes: ["light", "dark", "brand"] }),
        ApiServices.admin.updateLocales({ default_locale: v.default_locale, supported_locales: ["ar", "en"] }),
      ]);
      Toast.success(ar ? "تم تحديث المظهر واللغة" : "Appearance updated");
    });

    document.getElementById("env-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const v = Forms.serialize(e.target);
      const r = await ApiServices.admin.updateEnv({ variables: { APP_NAME: v.app_name } });
      if (r.success) Toast.success(ar ? "تم تحديث متغيرات البيئة" : "Env updated");
    });
    document.getElementById("env-test-btn").addEventListener("click", async () => {
      const r = await ApiServices.admin.testEnv();
      if (r.success) Toast.success(ar ? "فحص البيئة سليم" : "Environment OK");
    });
  }, { requiresAuth: true, roles: ["super_admin"] });
})();
