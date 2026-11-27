/**
 * public/js/pages/public/home.js
 * الصفحة الرئيسية العامة للمتجر والمنصة (/ و /home).
 */
(function () {
  async function renderHome(root) {
    const ar = I18n.getLocale() === "ar";
    root.innerHTML = PublicLayout.render({
      content: `<div id="ph-root">${Components.escapeHtml(I18n.t("loading"))}</div>`,
    });

    const [siteRes, prodRes, storeRes, postRes] = await Promise.all([
      ApiServices.publicCatalog.getSite(),
      ApiServices.publicCatalog.listProducts({ page: 1, limit: 8 }),
      ApiServices.publicCatalog.listStores({ page: 1, limit: 4 }),
      ApiServices.publicCatalog.listPosts({ page: 1, limit: 3 }),
    ]);

    const site = (siteRes.success && siteRes.data) || { stats: {} };
    const products = (prodRes.success && prodRes.data && prodRes.data.items) || [];
    const stores = (storeRes.success && storeRes.data && storeRes.data.items) || [];
    const posts = (postRes.success && postRes.data && postRes.data.items) || [];
    const el = document.getElementById("ph-root");

    el.innerHTML = `
      <section class="pub-hero">
        <div>
          <h1>${Components.escapeHtml(ar ? (site.site_name || "سوق الكل") : (site.site_name_en || "Souq Al-Kul"))}</h1>
          <p>
            ${ar
              ? "منصة تجارة إلكترونية متكاملة متعددة المتاجر والأدوار — تسوق أحدث المنتجات من التجار المعتمدين وتابع شحناتك لحظة بلحظة."
              : "A unified multi-vendor marketplace platform — discover verified stores, browse curated products, and track shipments in real time."}
          </p>
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            <a href="#/shop" class="btn">🛍️ ${ar ? "تصفح المنتجات" : "Browse Shop"}</a>
            <a href="#/track" class="btn btn-outline">🚚 ${Components.escapeHtml(I18n.t("pub_track"))}</a>
            ${!Auth.isAuthenticated() ? `<a href="#/register" class="btn btn-ghost">${Components.escapeHtml(I18n.t("register"))}</a>` : ""}
          </div>
        </div>
        <div class="stats-grid" style="margin-bottom:0">
          ${Components.statsCard((site.stats && site.stats.products_count) ?? products.length, ar ? "منتج متاح" : "Active Products")}
          ${Components.statsCard((site.stats && site.stats.stores_count) ?? stores.length, ar ? "متجر معتمد" : "Verified Stores")}
          ${Components.statsCard((site.stats && site.stats.posts_count) ?? posts.length, ar ? "مقالات وأدلة" : "Guides & Articles")}
        </div>
      </section>

      <section class="mb-2">
        <div class="toolbar">
          <h2 style="font-size:1.25rem">🛍️ ${ar ? "أحدث المنتجات" : "Featured Products"}</h2>
          <a href="#/shop" class="btn btn-outline btn-sm">${ar ? "عرض الكل" : "View All"}</a>
        </div>
        ${products.length === 0 ? `<div class="card"><p class="empty-state">${Components.escapeHtml(I18n.t("no_data"))}</p></div>` : `
          <div class="pub-grid">
            ${products.map((p) => `
              <div class="product-card">
                <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
                  ${Components.badge(p.category || (ar ? "عام" : "General"), "info")}
                  ${Components.statusBadge(Number(p.stock) > 0 ? "active" : "out_of_stock")}
                </div>
                <h3 style="font-size:1.05rem">${Components.escapeHtml(ar ? (p.title || p.title_en) : (p.title_en || p.title))}</h3>
                <div style="font-size:0.82rem;color:var(--fg-muted)">SKU: ${Components.escapeHtml(p.sku || "—")}</div>
                <div class="product-price">${Components.escapeHtml(p.price ?? 0)} ${Components.escapeHtml(p.currency || "SAR")}</div>
                <div style="margin-top:auto;padding-top:8px">
                  <a href="#/product/${encodeURIComponent(p.id)}" class="btn btn-outline btn-sm" style="width:100%">
                    ${ar ? "عرض التفاصيل" : "View Details"}
                  </a>
                </div>
              </div>
            `).join("")}
          </div>
        `}
      </section>

      <section class="mt-3 mb-2">
        <div class="toolbar">
          <h2 style="font-size:1.25rem">🏢 ${ar ? "المتاجر المعتمدة" : "Verified Stores"}</h2>
          <a href="#/stores" class="btn btn-outline btn-sm">${ar ? "كل المتاجر" : "All Stores"}</a>
        </div>
        <div class="grid-2">
          ${stores.map((s) => `
            <div class="card" style="display:flex;justify-content:space-between;align-items:center;gap:12px">
              <div>
                <h3 style="font-size:1.05rem">${Components.escapeHtml(s.name)}</h3>
                <div style="font-size:0.85rem;color:var(--fg-muted)">${Components.escapeHtml(s.domain || s.slug || "")}</div>
              </div>
              <a href="#/shop?tenant=${encodeURIComponent(s.id)}" class="btn btn-outline btn-sm">
                ${Components.escapeHtml(String(s.products_count ?? 0))} ${ar ? "منتج" : "Products"}
              </a>
            </div>
          `).join("")}
        </div>
      </section>

      <section class="mt-3">
        <div class="toolbar">
          <h2 style="font-size:1.25rem">📝 ${ar ? "أحدث المقالات" : "Latest from the Blog"}</h2>
          <a href="#/blog" class="btn btn-outline btn-sm">${ar ? "اقرأ المدونة" : "Read Blog"}</a>
        </div>
        <div class="grid-3">
          ${posts.map((post) => {
            const title = (post.title_i18n && (post.title_i18n[I18n.getLocale()] || post.title_i18n.ar || post.title_i18n.en)) || post.slug;
            const body = (post.body_i18n && (post.body_i18n[I18n.getLocale()] || post.body_i18n.ar || post.body_i18n.en)) || "";
            return `
              <div class="card" style="margin-top:0;display:flex;flex-direction:column;gap:8px">
                <h3 style="font-size:1rem">${Components.escapeHtml(title)}</h3>
                <p style="font-size:0.88rem;color:var(--fg-muted)">${Components.escapeHtml(String(body).slice(0, 120))}</p>
                <a href="#/blog/${encodeURIComponent(post.slug || post.id)}" class="btn btn-outline btn-sm" style="margin-top:auto">
                  ${ar ? "اقرأ المزيد" : "Read More"}
                </a>
              </div>
            `;
          }).join("")}
        </div>
      </section>
    `;
  }

  Router.add("/", renderHome);
  Router.add("/home", renderHome);
})();
