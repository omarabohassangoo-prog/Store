/**
 * public/js/pages/vendor/products.js
 * صفحة إدارة منتجات التاجر (Vendor Products).
 */
(function () {
  Router.add("/vendor/products", async (root) => {
    if (!Guards.requireRole(root, ["vendor", "super_admin"])) return;
    const ar = I18n.getLocale() === "ar";
    const state = { page: 1, limit: 10, search: "", status: "", sort_by: "created_at", sort_dir: "desc" };

    root.innerHTML = Components.layout({
      title: I18n.t("nav_v_products"),
      content: `
        <div class="toolbar">
          <div class="toolbar-group">
            <input class="form-control" id="vp-search" style="width:220px" placeholder="${Components.escapeHtml(I18n.t("search"))}">
            <select class="form-control" id="vp-status" style="width:auto">
              <option value="">${ar ? "كل الحالات" : "All Statuses"}</option>
              <option value="active">${ar ? "نشط" : "Active"}</option>
              <option value="draft">${ar ? "مسودة" : "Draft"}</option>
            </select>
          </div>
          <button class="btn btn-sm" id="vp-add-btn">➕ ${ar ? "إضافة منتج جديد" : "Add Product"}</button>
        </div>
        <div class="card">
          <div id="vp-table-wrap">${Components.escapeHtml(I18n.t("loading"))}</div>
          <div id="vp-pagination"></div>
        </div>
      `,
    });

    async function loadProducts() {
      const tableWrap = document.getElementById("vp-table-wrap");
      const pagWrap = document.getElementById("vp-pagination");
      const res = await ApiServices.vendor.listProducts({
        page: state.page,
        limit: state.limit,
        search: state.search || undefined,
        status: state.status || undefined,
        sort_by: state.sort_by,
        sort_dir: state.sort_dir,
      });

      if (!res.success) {
        tableWrap.innerHTML = Components.alert("error", (res.error && res.error.message) || "Failed to load products");
        pagWrap.innerHTML = "";
        return;
      }

      const items = (res.data && res.data.items) || [];
      window.__vendorProductsList = items;

      DataTable.mount(tableWrap, {
        rows: items,
        sortBy: state.sort_by,
        sortDir: state.sort_dir,
        onSort: (key, dir) => {
          state.sort_by = key;
          state.sort_dir = dir;
          loadProducts();
        },
        columns: [
          { key: "id", label: "ID", sortable: true },
          { key: "title", label: ar ? "المنتج" : "Title", sortable: true, render: (p) => Components.escapeHtml(p.title || p.slug || "") },
          { key: "sku", label: "SKU", sortable: true },
          { key: "price", label: ar ? "السعر" : "Price", sortable: true, render: (p) => `${Components.escapeHtml(p.price ?? 0)} SAR` },
          { key: "stock", label: ar ? "المخزون" : "Stock", sortable: true },
          { key: "status", label: I18n.t("status"), render: (p) => Components.statusBadge(p.status || "active") },
          {
            key: "actions",
            label: I18n.t("actions"),
            render: (p) => `
              <div style="display:flex;gap:6px;flex-wrap:wrap">
                <button class="btn btn-outline btn-sm" onclick="window.__editVendorProd('${Components.escapeHtml(p.id)}')">${Components.escapeHtml(I18n.t("edit"))}</button>
                <button class="btn btn-outline btn-sm" onclick="window.__stockVendorProd('${Components.escapeHtml(p.id)}', ${Number(p.stock ?? 0)})">${ar ? "المخزون" : "Stock"}</button>
                <button class="btn btn-danger btn-sm" onclick="window.__delVendorProd('${Components.escapeHtml(p.id)}')">${Components.escapeHtml(I18n.t("delete"))}</button>
              </div>
            `,
          },
        ],
      });

      const meta = (res.meta && res.meta.pagination) || { page: state.page, limit: state.limit, total: res.data && res.data.total };
      Pagination.mount(pagWrap, meta, (nextPage) => {
        state.page = nextPage;
        loadProducts();
      });
    }

    document.getElementById("vp-search").addEventListener("input", (e) => {
      state.search = e.target.value.trim();
      state.page = 1;
      loadProducts();
    });
    document.getElementById("vp-status").addEventListener("change", (e) => {
      state.status = e.target.value;
      state.page = 1;
      loadProducts();
    });

    document.getElementById("vp-add-btn").addEventListener("click", () => {
      Modal.open({
        title: ar ? "إضافة منتج جديد" : "Add Product",
        bodyHtml: `
          <form id="vp-create-form">
            ${Forms.renderFields([
              { name: "title", label: ar ? "اسم المنتج" : "Title", required: true },
              { name: "slug", label: "Slug", required: true },
              { name: "sku", label: "SKU", required: true },
              { name: "price", label: ar ? "السعر (SAR)" : "Price (SAR)", type: "number", required: true },
              { name: "stock", label: ar ? "المخزون" : "Stock", type: "number", value: 10, required: true },
              {
                name: "status",
                label: I18n.t("status"),
                type: "select",
                value: "active",
                options: [
                  { value: "active", label: ar ? "نشط" : "Active" },
                  { value: "draft", label: ar ? "مسودة" : "Draft" },
                ],
              },
            ])}
            <button class="btn" type="submit">${Components.escapeHtml(I18n.t("create"))}</button>
          </form>
        `,
      });
      document.getElementById("vp-create-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const check = Forms.validate(e.target, {
          title: { required: true },
          slug: { required: true },
          sku: { required: true },
          price: { required: true, min: 1 },
          stock: { required: true, min: 0 },
        });
        if (!check.valid) return;
        const r = await ApiServices.vendor.createProduct(check.values);
        if (r.success) {
          Modal.close();
          Toast.success(ar ? "تمت إضافة المنتج" : "Product created");
          loadProducts();
        } else {
          Toast.error((r.error && r.error.message) || "Failed");
        }
      });
    });

    window.__editVendorProd = (id) => {
      const p = (window.__vendorProductsList || []).find((x) => x.id === id);
      if (!p) return;
      Modal.open({
        title: (ar ? "تعديل المنتج: " : "Edit Product: ") + (p.title || p.slug),
        bodyHtml: `
          <form id="vp-edit-form">
            ${Forms.renderFields([
              { name: "title", label: ar ? "اسم المنتج" : "Title", value: p.title || "", required: true },
              { name: "price", label: ar ? "السعر (SAR)" : "Price (SAR)", type: "number", value: p.price ?? 0, required: true },
              {
                name: "status",
                label: I18n.t("status"),
                type: "select",
                value: p.status || "active",
                options: [
                  { value: "active", label: ar ? "نشط" : "Active" },
                  { value: "draft", label: ar ? "مسودة" : "Draft" },
                ],
              },
            ])}
            <button class="btn" type="submit">${Components.escapeHtml(I18n.t("save"))}</button>
          </form>
        `,
      });
      document.getElementById("vp-edit-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const check = Forms.validate(e.target, { title: { required: true }, price: { required: true, min: 1 } });
        if (!check.valid) return;
        const r = await ApiServices.vendor.updateProduct(id, check.values);
        if (r.success) {
          Modal.close();
          Toast.success(ar ? "تم تحديث المنتج" : "Product updated");
          loadProducts();
        } else {
          Toast.error((r.error && r.error.message) || "Failed");
        }
      });
    };

    window.__stockVendorProd = (id, current) => {
      Modal.open({
        size: "sm",
        title: ar ? "تحديث المخزون" : "Update Stock",
        bodyHtml: `
          <form id="vp-stock-form">
            ${Forms.renderFields([{ name: "stock", label: ar ? "الكمية المتاحة" : "Quantity", type: "number", value: current, required: true }])}
            <button class="btn" type="submit">${Components.escapeHtml(I18n.t("save"))}</button>
          </form>
        `,
      });
      document.getElementById("vp-stock-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const check = Forms.validate(e.target, { stock: { required: true, min: 0 } });
        if (!check.valid) return;
        const r = await ApiServices.vendor.updateStock(id, check.values.stock);
        if (r.success) {
          Modal.close();
          Toast.success(ar ? "تم تحديث المخزون" : "Stock updated");
          loadProducts();
        } else {
          Toast.error((r.error && r.error.message) || "Failed");
        }
      });
    };

    window.__delVendorProd = async (id) => {
      const ok = await Modal.confirm({
        danger: true,
        message: ar ? "هل تريد حذف هذا المنتج نهائياً؟" : "Delete this product?",
      });
      if (!ok) return;
      const r = await ApiServices.vendor.deleteProduct(id);
      if (r.success) {
        Toast.success(ar ? "تم حذف المنتج" : "Product deleted");
        loadProducts();
      } else {
        Toast.error((r.error && r.error.message) || "Failed");
      }
    };

    await loadProducts();
  }, { requiresAuth: true, roles: ["vendor", "super_admin"] });
})();
