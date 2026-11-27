/**
 * public/js/pages/admin/integrations.js
 * صفحة SEO والتحليلات و AdSense والمدونة لمدير النظام.
 */
(function () {
  Router.add("/admin/integrations", async (root) => {
    if (!Guards.requireRole(root, ["super_admin"])) return;
    const ar = I18n.getLocale() === "ar";
    const blogState = { page: 1, limit: 10, search: "" };

    root.innerHTML = Components.layout({
      title: I18n.t("nav_integrations"),
      content: `
        <div class="tabs" id="ai-tabs">
          <button class="tab-btn active" data-tab="seo">SEO & Sitemap</button>
          <button class="tab-btn" data-tab="analytics">Analytics & AdSense</button>
          <button class="tab-btn" data-tab="blog">${ar ? "المدونة والمقالات" : "Blog Posts"}</button>
        </div>
        <div id="ai-body">${Components.escapeHtml(I18n.t("loading"))}</div>
      `,
    });

    const [seoRes, gaRes, adsRes] = await Promise.all([
      ApiServices.admin.getSeo(),
      ApiServices.admin.getAnalytics(),
      ApiServices.admin.getAdsense(),
    ]);
    const seo = (seoRes.success && seoRes.data) || {};
    const ga = (gaRes.success && gaRes.data) || {};
    const ads = (adsRes.success && adsRes.data) || {};

    document.getElementById("ai-body").innerHTML = `
      <div id="ai-panel-seo">
        <div class="card">
          <h3 class="card-title">${ar ? "إعدادات محركات البحث (SEO)" : "Search Engine Optimization (SEO)"}</h3>
          <form id="seo-form">
            ${Forms.renderFields([
              { name: "robots_txt", label: "robots.txt", type: "textarea", value: seo.robots_txt || "User-agent: *\nAllow: /" },
              { name: "sitemap_xml", label: "sitemap.xml URL", value: seo.sitemap_xml || "/sitemap.xml" },
            ])}
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <button class="btn" type="submit">${Components.escapeHtml(I18n.t("save"))}</button>
              <button class="btn btn-outline" type="button" id="seo-gen-btn">${ar ? "توليد ملفات SEO" : "Generate SEO Files"}</button>
            </div>
          </form>
        </div>
      </div>

      <div id="ai-panel-analytics" class="hidden">
        <div class="grid-2">
          <div class="card">
            <h3 class="card-title">Google Analytics</h3>
            <form id="ga-form">
              ${Forms.renderFields([
                { name: "measurement_id", label: "Measurement ID (G-...)", value: ga.measurement_id || "" },
                {
                  name: "enabled",
                  label: I18n.t("status"),
                  type: "select",
                  value: String(Boolean(ga.enabled)),
                  options: [
                    { value: "true", label: ar ? "مفعّل" : "Enabled" },
                    { value: "false", label: ar ? "معطّل" : "Disabled" },
                  ],
                },
              ])}
              <div style="display:flex;gap:8px;flex-wrap:wrap">
                <button class="btn" type="submit">${Components.escapeHtml(I18n.t("save"))}</button>
                <button class="btn btn-outline" type="button" id="ga-exp-btn">${ar ? "تصدير الإعدادات" : "Export Config"}</button>
              </div>
            </form>
          </div>
          <div class="card">
            <h3 class="card-title">Google AdSense</h3>
            <form id="ads-form">
              ${Forms.renderFields([
                { name: "publisher_id", label: "Publisher ID (pub-...)", value: ads.publisher_id || "" },
                { name: "ads_txt", label: "ads.txt", type: "textarea", value: ads.ads_txt || "" },
              ])}
              <div style="display:flex;gap:8px;flex-wrap:wrap">
                <button class="btn" type="submit">${Components.escapeHtml(I18n.t("save"))}</button>
                <button class="btn btn-outline" type="button" id="ads-gen-btn">${ar ? "توليد ads.txt" : "Generate ads.txt"}</button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div id="ai-panel-blog" class="hidden">
        <div class="toolbar">
          <div class="toolbar-group">
            <input class="form-control" id="ab-search" style="width:220px" placeholder="${Components.escapeHtml(I18n.t("search"))}">
          </div>
          <button class="btn btn-sm" id="ab-add-btn">➕ ${ar ? "مقال جديد" : "New Blog Post"}</button>
        </div>
        <div class="card">
          <div id="ab-table-wrap">${Components.escapeHtml(I18n.t("loading"))}</div>
          <div id="ab-pagination"></div>
        </div>
      </div>
    `;

    document.querySelectorAll("#ai-tabs .tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("#ai-tabs .tab-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        const tab = btn.dataset.tab;
        ["seo", "analytics", "blog"].forEach((p) => {
          document.getElementById("ai-panel-" + p).classList.toggle("hidden", p !== tab);
        });
      });
    });

    async function loadBlogPosts() {
      const tableWrap = document.getElementById("ab-table-wrap");
      const pagWrap = document.getElementById("ab-pagination");
      const res = await ApiServices.admin.listPosts({ page: blogState.page, limit: blogState.limit, search: blogState.search || undefined });
      if (!res.success) {
        tableWrap.innerHTML = Components.alert("error", (res.error && res.error.message) || "Failed");
        return;
      }
      const items = (res.data && res.data.items) || [];
      DataTable.mount(tableWrap, {
        rows: items,
        columns: [
          { key: "id", label: "ID" },
          { key: "slug", label: "Slug" },
          { key: "title_i18n", label: ar ? "العنوان" : "Title", render: (p) => Components.escapeHtml((p.title_i18n && (p.title_i18n[I18n.getLocale()] || p.title_i18n.ar || p.title_i18n.en)) || p.slug || "") },
          { key: "status", label: I18n.t("status"), render: (p) => Components.statusBadge(p.status || "published") },
          { key: "created_at", label: I18n.t("created_at") },
        ],
      });
      const meta = (res.meta && res.meta.pagination) || { page: blogState.page, limit: blogState.limit, total: res.data && res.data.total };
      Pagination.mount(pagWrap, meta, (p) => { blogState.page = p; loadBlogPosts(); });
    }

    document.getElementById("seo-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const r = await ApiServices.admin.updateSeo(Forms.serialize(e.target));
      if (r.success) Toast.success(ar ? "تم حفظ إعدادات SEO" : "SEO updated");
    });
    document.getElementById("seo-gen-btn").addEventListener("click", async () => {
      const r = await ApiServices.admin.generateSeoFiles();
      if (r.success) Toast.success(ar ? "تم توليد robots.txt و sitemap.xml" : "SEO files generated");
    });

    document.getElementById("ga-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const v = Forms.serialize(e.target);
      const r = await ApiServices.admin.updateAnalytics({ measurement_id: v.measurement_id, enabled: v.enabled === "true" });
      if (r.success) Toast.success(ar ? "تم حفظ إعدادات التحليلات" : "Analytics saved");
    });
    document.getElementById("ga-exp-btn").addEventListener("click", async () => {
      const r = await ApiServices.admin.exportAnalyticsConfig();
      if (r.success) Toast.success(ar ? "تم تصدير الإعدادات" : "Config exported");
    });

    document.getElementById("ads-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const r = await ApiServices.admin.updateAdsense(Forms.serialize(e.target));
      if (r.success) Toast.success(ar ? "تم حفظ إعدادات AdSense" : "AdSense saved");
    });
    document.getElementById("ads-gen-btn").addEventListener("click", async () => {
      const r = await ApiServices.admin.generateAdsTxt();
      if (r.success) Toast.success(ar ? "تم توليد ملف ads.txt" : "ads.txt generated");
    });

    document.getElementById("ab-search").addEventListener("input", (e) => {
      blogState.search = e.target.value.trim();
      blogState.page = 1;
      loadBlogPosts();
    });

    document.getElementById("ab-add-btn").addEventListener("click", () => {
      Modal.open({
        title: ar ? "نشر مقال جديد" : "Create Blog Post",
        bodyHtml: `
          <form id="ab-form">
            ${Forms.renderFields([
              { name: "slug", label: "Slug", required: true, placeholder: "souq-launch-guide" },
              { name: "title_ar", label: ar ? "العنوان (عربي)" : "Title (AR)", required: true },
              { name: "title_en", label: ar ? "العنوان (إنجليزي)" : "Title (EN)" },
              { name: "body_ar", label: ar ? "المحتوى" : "Body", type: "textarea", required: true },
            ])}
            <button class="btn" type="submit">${Components.escapeHtml(I18n.t("create"))}</button>
          </form>
        `,
      });
      document.getElementById("ab-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const check = Forms.validate(e.target, { slug: { required: true }, title_ar: { required: true }, body_ar: { required: true } });
        if (!check.valid) return;
        const v = check.values;
        const r = await ApiServices.admin.createPost({
          slug: v.slug,
          title_i18n: { ar: v.title_ar, en: v.title_en || v.title_ar },
          body_i18n: { ar: v.body_ar, en: v.body_ar },
          status: "published",
        });
        if (r.success) {
          Modal.close();
          Toast.success(ar ? "تم نشر المقال" : "Post published");
          loadBlogPosts();
        }
      });
    });

    await loadBlogPosts();
  }, { requiresAuth: true, roles: ["super_admin"] });
})();
