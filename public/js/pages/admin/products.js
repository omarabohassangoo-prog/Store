/**
 * public/js/pages/admin/products.js
 * صفحة كتالوج المنتجات العام لمدير النظام.
 */
(function () {
  Router.add("/admin/products", async (root) => {
    if (!Guards.requireRole(root, ["super_admin"])) return;
    const ar = I18n.getLocale() === "ar";
    const state = { page: 1, limit: 10, search: "", status: "", sort_by: "created_at", sort_dir: "desc" };

    root.innerHTML = Components.layout({
      title: I18n.t("nav_products"),
      content: `
        <div class="toolbar">
          <div class="toolbar-group">
            <input class="form-control" id="ap-search" style="width:220px" placeholder="${Components.escapeHtml(I18n.t("search"))}">
            <select class="form-control" id="ap-status" style="width:auto">
              <option value="">${ar ? "كل الحالات" : "All Statuses"}</option>
              <option value="active">${ar ? "نشط" : "Active"}</option>
              <option value="draft">${ar ? "مسودة" : "Draft"}</option>
            </select>
          </div>
          <a href="#/admin/orders" class="btn btn-outline btn-sm">📦 ${Components.escapeHtml(I18n.t("nav_orders"))}</a>
        </div>
        <div class="card">
          <div id="ap-table-wrap">${Components.escapeHtml(I18n.t("loading"))}</div>
          <div id="ap-pagination"></div>
        </div>
      `,
    });

    async function loadProducts() {
      const tableWrap = document.getElementById("ap-table-wrap");
      const pagWrap = document.getElementById("ap-pagination");
      const res = await ApiServices.admin.listProducts({
        page: state.page,
        limit: state.limit,
        search: state.search || undefined,
        status: state.status || undefined,
        sort_by: state.sort_by,
        sort_dir: state.sort_dir,
      });
      if (!res.success) {
        tableWrap.innerHTML = Components.alert("error", (res.error && res.error.message) || "Failed");
        pagWrap.innerHTML = "";
        return;
      }
      const items = (res.data && res.data.items) || [];
      DataTable.mount(tableWrap, {
        rows: items,
        sortBy: state.sort_by,
        sortDir: state.sort_dir,
        onSort: (k, d) => { state.sort_by = k; state.sort_dir = d; loadProducts(); },
        columns: [
          { key: "id", label: "ID", sortable: true },
          { key: "title", label: ar ? "المنتج" : "Product", sortable: true, render: (p) => Components.escapeHtml(p.title || p.slug || "") },
          { key: "sku", label: "SKU", sortable: true },
          { key: "vendor_id", label: ar ? "التاجر" : "Vendor" },
          { key: "price", label: ar ? "السعر" : "Price", sortable: true, render: (p) => `${Components.escapeHtml(p.price ?? 0)} ${Components.escapeHtml(p.currency || "SAR")}` },
          { key: "stock", label: ar ? "المخزون" : "Stock", sortable: true },
          { key: "status", label: I18n.t("status"), render: (p) => Components.statusBadge(p.status || "active") },
        ],
      });
      const meta = (res.meta && res.meta.pagination) || { page: state.page, limit: state.limit, total: res.data && res.data.total };
      Pagination.mount(pagWrap, meta, (p) => { state.page = p; loadProducts(); });
    }

    document.getElementById("ap-search").addEventListener("input", (e) => {
      state.search = e.target.value.trim();
      state.page = 1;
      loadProducts();
    });
    document.getElementById("ap-status").addEventListener("change", (e) => {
      state.status = e.target.value;
      state.page = 1;
      loadProducts();
    });

    await loadProducts();
  }, { requiresAuth: true, roles: ["super_admin"] });
})();
