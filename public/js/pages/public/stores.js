/**
 * public/js/pages/public/stores.js
 * صفحة دليل المتاجر المعتمدة العامة.
 */
(function () {
  Router.add("/stores", async (root) => {
    const ar = I18n.getLocale() === "ar";
    const state = { page: 1, limit: 12, search: "" };

    root.innerHTML = PublicLayout.render({
      title: I18n.t("pub_stores"),
      content: `
        <div class="toolbar">
          <input class="form-control" id="pub-store-search" style="width:240px" placeholder="${Components.escapeHtml(I18n.t("search"))}">
        </div>
        <div id="pub-stores-grid">${Components.escapeHtml(I18n.t("loading"))}</div>
        <div id="pub-stores-pagination" class="mt-2"></div>
      `,
    });

    async function loadStores() {
      const gridEl = document.getElementById("pub-stores-grid");
      const pagEl = document.getElementById("pub-stores-pagination");
      const res = await ApiServices.publicCatalog.listStores({
        page: state.page,
        limit: state.limit,
        search: state.search || undefined,
      });
      if (!res.success) {
        gridEl.innerHTML = Components.alert("error", (res.error && res.error.message) || "Failed");
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
          ${items.map((s) => `
            <div class="product-card">
              <div style="display:flex;justify-content:space-between;align-items:center">
                ${Components.statusBadge(s.status || "active")}
                <span style="font-size:0.82rem;color:var(--fg-muted)">${Components.escapeHtml(String(s.products_count ?? 0))} ${ar ? "منتج" : "Products"}</span>
              </div>
              <h3 style="font-size:1.1rem">🏢 ${Components.escapeHtml(s.name)}</h3>
              <div style="font-size:0.85rem;color:var(--fg-muted)">${Components.escapeHtml(s.domain || s.slug || "")}</div>
              <div style="margin-top:auto;padding-top:8px">
                <a href="#/shop?tenant=${encodeURIComponent(s.id)}" class="btn btn-outline btn-sm" style="width:100%">
                  ${ar ? "تصفح منتجات المتجر" : "Browse Store Products"}
                </a>
              </div>
            </div>
          `).join("")}
        </div>
      `;
      const meta = (res.meta && res.meta.pagination) || { page: state.page, limit: state.limit, total: res.data && res.data.total };
      Pagination.mount(pagEl, meta, (p) => { state.page = p; loadStores(); });
    }

    document.getElementById("pub-store-search").addEventListener("input", (e) => {
      state.search = e.target.value.trim();
      state.page = 1;
      loadStores();
    });

    await loadStores();
  });
})();
