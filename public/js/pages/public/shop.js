/**
 * public/js/pages/public/shop.js
 * صفحة المتجر العام (قائمة المنتجات + البحث والتصفية + صفحة تفاصيل المنتج).
 */
(function () {
  async function renderShop(root) {
    const ar = I18n.getLocale() === "ar";
    const hashQuery = (location.hash.split("?")[1] || "");
    const params = new URLSearchParams(hashQuery);
    const state = {
      page: 1,
      limit: 12,
      search: params.get("search") || "",
      category: params.get("category") || "",
      tenant_id: params.get("tenant") || "",
      sort_by: "created_at",
      sort_dir: "desc",
    };

    root.innerHTML = PublicLayout.render({
      title: I18n.t("pub_shop"),
      content: `
        <div class="toolbar">
          <div class="toolbar-group">
            <input class="form-control" id="pub-shop-search" style="width:220px" value="${Components.escapeHtml(state.search)}" placeholder="${Components.escapeHtml(I18n.t("search"))}">
            <select class="form-control" id="pub-shop-cat" style="width:auto">
              <option value="">${ar ? "كل التصنيفات" : "All Categories"}</option>
            </select>
            <select class="form-control" id="pub-shop-sort" style="width:auto">
              <option value="created_at:desc">${ar ? "الأحدث" : "Newest"}</option>
              <option value="price:asc">${ar ? "السعر: الأقل للأعلى" : "Price: Low to High"}</option>
              <option value="price:desc">${ar ? "السعر: الأعلى للأقل" : "Price: High to Low"}</option>
            </select>
          </div>
          ${state.tenant_id ? `<a href="#/shop" class="btn btn-ghost btn-sm">${ar ? "إلغاء فلتر المتجر ✕" : "Clear Store Filter ✕"}</a>` : ""}
        </div>
        <div id="pub-shop-grid">${Components.escapeHtml(I18n.t("loading"))}</div>
        <div id="pub-shop-pagination" class="mt-2"></div>
      `,
    });

    const siteRes = await ApiServices.publicCatalog.getSite();
    const categories = (siteRes.success && siteRes.data && siteRes.data.categories) || [];
    const catSelect = document.getElementById("pub-shop-cat");
    categories.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = c;
      if (state.category === c) opt.selected = true;
      catSelect.appendChild(opt);
    });

    async function loadCatalog() {
      const gridEl = document.getElementById("pub-shop-grid");
      const pagEl = document.getElementById("pub-shop-pagination");
      const res = await ApiServices.publicCatalog.listProducts({
        page: state.page,
        limit: state.limit,
        search: state.search || undefined,
        category: state.category || undefined,
        tenant_id: state.tenant_id || undefined,
        sort_by: state.sort_by,
        sort_dir: state.sort_dir,
      });
      if (!res.success) {
        gridEl.innerHTML = Components.alert("error", (res.error && res.error.message) || "Failed to load catalog");
        return;
      }
      const items = (res.data && res.data.items) || [];
      if (items.length === 0) {
        gridEl.innerHTML = `<div class="card"><p class="empty-state">${Components.escapeHtml(I18n.t("no_data"))}</p></div>`;
        pagEl.innerHTML = "";
        return;
      }
      gridEl.innerHTML = `
        <div class="pub-grid">
          ${items.map((p) => `
            <div class="product-card">
              <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
                ${Components.badge(p.category || (ar ? "عام" : "General"), "info")}
                ${Components.statusBadge(Number(p.stock) > 0 ? "active" : "out_of_stock")}
              </div>
              <h3 style="font-size:1.05rem">${Components.escapeHtml(ar ? (p.title || p.title_en) : (p.title_en || p.title))}</h3>
              <div style="font-size:0.82rem;color:var(--fg-muted)">SKU: ${Components.escapeHtml(p.sku || "—")} · ${ar ? "المتوفر:" : "Stock:"} ${Components.escapeHtml(p.stock ?? 0)}</div>
              <div class="product-price">${Components.escapeHtml(p.price ?? 0)} ${Components.escapeHtml(p.currency || "SAR")}</div>
              <div style="margin-top:auto;display:flex;gap:8px">
                <a href="#/product/${encodeURIComponent(p.id)}" class="btn btn-outline btn-sm" style="flex:1">${ar ? "التفاصيل" : "Details"}</a>
                ${Auth.isAuthenticated() && (Auth.getRole() === "customer" || Auth.getRole() === "super_admin")
                  ? `<button class="btn btn-sm" onclick="window.__pubAddWish('${Components.escapeHtml(p.id)}')">❤️</button>`
                  : ""}
              </div>
            </div>
          `).join("")}
        </div>
      `;
      const meta = (res.meta && res.meta.pagination) || { page: state.page, limit: state.limit, total: res.data && res.data.total };
      Pagination.mount(pagEl, meta, (p) => { state.page = p; loadCatalog(); });
    }

    window.__pubAddWish = async (productId) => {
      const r = await ApiServices.customer.addWishlist(productId);
      if (r.success) Toast.success(ar ? "تمت الإضافة إلى المفضلة" : "Added to wishlist");
    };

    document.getElementById("pub-shop-search").addEventListener("input", (e) => {
      state.search = e.target.value.trim();
      state.page = 1;
      loadCatalog();
    });
    catSelect.addEventListener("change", (e) => {
      state.category = e.target.value;
      state.page = 1;
      loadCatalog();
    });
    document.getElementById("pub-shop-sort").addEventListener("change", (e) => {
      const [sb, sd] = e.target.value.split(":");
      state.sort_by = sb;
      state.sort_dir = sd;
      state.page = 1;
      loadCatalog();
    });

    await loadCatalog();
  }

  Router.add("/shop", renderShop);
  Router.add("/products", renderShop);

  Router.add("/product/:id", async (root, params) => {
    const ar = I18n.getLocale() === "ar";
    root.innerHTML = PublicLayout.render({
      content: `<div id="pub-prd-root">${Components.escapeHtml(I18n.t("loading"))}</div>`,
    });
    const res = await ApiServices.publicCatalog.getProduct(params.id);
    const el = document.getElementById("pub-prd-root");
    if (!res.success || !res.data) {
      el.innerHTML = Components.alert("error", (res.error && res.error.message) || I18n.t("error_404")) +
        `<a href="#/shop" class="btn btn-outline">${ar ? "العودة للمتجر" : "Back to Shop"}</a>`;
      return;
    }
    const p = res.data;
    const reviews = p.reviews || [];
    el.innerHTML = `
      <div class="mb-2"><a href="#/shop" class="btn btn-ghost btn-sm">← ${ar ? "العودة للمتجر" : "Back to Shop"}</a></div>
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap">
          <div>
            ${Components.badge(p.category || (ar ? "عام" : "General"), "info")}
            <h1 style="font-size:1.6rem;margin:10px 0">${Components.escapeHtml(ar ? (p.title || p.title_en) : (p.title_en || p.title))}</h1>
            <p style="color:var(--fg-muted);font-size:0.9rem">
              SKU: ${Components.escapeHtml(p.sku || "—")}
              ${p.store ? ` · ${ar ? "المتجر:" : "Store:"} <strong>${Components.escapeHtml(p.store.name)}</strong>` : ""}
            </p>
          </div>
          <div style="text-align:end">
            <div class="product-price" style="font-size:1.8rem">${Components.escapeHtml(p.price ?? 0)} ${Components.escapeHtml(p.currency || "SAR")}</div>
            <div class="mt-1">${ar ? "المخزون المتاح:" : "Available Stock:"} <strong>${Components.escapeHtml(p.stock ?? 0)}</strong></div>
          </div>
        </div>
        <div class="mt-2" style="display:flex;gap:10px;flex-wrap:wrap">
          ${Auth.isAuthenticated()
            ? `<button class="btn" id="prd-wish-btn">❤️ ${ar ? "أضف للمفضلة" : "Add to Wishlist"}</button>
               <a href="#/customer/orders" class="btn btn-outline">🛍️ ${ar ? "طلباتي" : "My Orders"}</a>`
            : `<a href="#/login" class="btn">${ar ? "سجل الدخول للشراء أو الحفظ" : "Sign In to Order or Save"}</a>`
          }
        </div>
      </div>

      <div class="card mt-2">
        <h3 class="card-title">⭐ ${ar ? "تقييمات العملاء" : "Customer Reviews"} (${reviews.length})</h3>
        ${reviews.length === 0 ? `<p class="empty-state">${Components.escapeHtml(I18n.t("no_data"))}</p>` : `
          <div style="display:grid;gap:10px">
            ${reviews.map((rv) => `
              <div style="padding:12px;border:1px solid var(--border);border-radius:10px">
                <div><strong>⭐ ${Components.escapeHtml(rv.rating)} / 5</strong></div>
                <p class="mt-1">${Components.escapeHtml(rv.comment)}</p>
                ${rv.reply ? `<div class="alert alert-info mt-1">${ar ? "رد التاجر:" : "Vendor Reply:"} ${Components.escapeHtml(rv.reply)}</div>` : ""}
              </div>
            `).join("")}
          </div>
        `}
      </div>
    `;

    const wishBtn = document.getElementById("prd-wish-btn");
    if (wishBtn) {
      wishBtn.addEventListener("click", async () => {
        const r = await ApiServices.customer.addWishlist(p.id);
        if (r.success) Toast.success(ar ? "تمت الإضافة للمفضلة" : "Added to wishlist");
        else Toast.error((r.error && r.error.message) || "Failed");
      });
    }
  });
})();
