/**
 * public/js/pages/customer/wishlist.js
 * صفحة قائمة المفضلة للعميل.
 */
(function () {
  Router.add("/customer/wishlist", async (root) => {
    if (!Guards.requireRole(root, ["customer", "super_admin"])) return;
    const ar = I18n.getLocale() === "ar";
    const state = { page: 1, limit: 10 };

    root.innerHTML = Components.layout({
      title: I18n.t("nav_c_wishlist"),
      content: `
        <div class="toolbar">
          <button class="btn btn-sm" id="cw-add">❤️ ${ar ? "إضافة منتج للمفضلة" : "Add Product to Wishlist"}</button>
        </div>
        <div class="card">
          <div id="cw-table-wrap">${Components.escapeHtml(I18n.t("loading"))}</div>
          <div id="cw-pagination"></div>
        </div>
      `,
    });

    async function loadWishlist() {
      const tableWrap = document.getElementById("cw-table-wrap");
      const pagWrap = document.getElementById("cw-pagination");
      const res = await ApiServices.customer.listWishlist({ page: state.page, limit: state.limit });
      if (!res.success) {
        tableWrap.innerHTML = Components.alert("error", (res.error && res.error.message) || "Failed");
        return;
      }
      const items = (res.data && res.data.items) || [];
      DataTable.mount(tableWrap, {
        rows: items,
        columns: [
          { key: "id", label: "ID" },
          { key: "product_id", label: ar ? "معرّف المنتج" : "Product ID" },
          { key: "created_at", label: I18n.t("created_at") },
          {
            key: "actions",
            label: I18n.t("actions"),
            render: (w) => `<button class="btn btn-danger btn-sm" onclick="window.__rmCustWish('${Components.escapeHtml(w.product_id || w.id)}')">${Components.escapeHtml(I18n.t("delete"))}</button>`,
          },
        ],
      });
      const meta = (res.meta && res.meta.pagination) || { page: state.page, limit: state.limit, total: res.data && res.data.total };
      Pagination.mount(pagWrap, meta, (p) => { state.page = p; loadWishlist(); });
    }

    document.getElementById("cw-add").addEventListener("click", () => {
      Modal.open({
        size: "sm",
        title: ar ? "إضافة للمفضلة" : "Add to Wishlist",
        bodyHtml: `
          <form id="cw-form">
            ${Forms.renderFields([{ name: "product_id", label: "Product ID", placeholder: "prd_101", required: true }])}
            <button class="btn" type="submit">${Components.escapeHtml(I18n.t("add"))}</button>
          </form>
        `,
      });
      document.getElementById("cw-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const check = Forms.validate(e.target, { product_id: { required: true } });
        if (!check.valid) return;
        const r = await ApiServices.customer.addWishlist(check.values.product_id);
        if (r.success) {
          Modal.close();
          Toast.success(ar ? "تمت الإضافة للمفضلة" : "Added to wishlist");
          loadWishlist();
        }
      });
    });

    window.__rmCustWish = async (pid) => {
      const ok = await Modal.confirm({ danger: true, message: ar ? "إزالة المنتج من المفضلة؟" : "Remove from wishlist?" });
      if (!ok) return;
      const r = await ApiServices.customer.removeWishlist(pid);
      if (r.success) {
        Toast.success(ar ? "تمت الإزالة" : "Removed");
        loadWishlist();
      }
    };

    await loadWishlist();
  }, { requiresAuth: true, roles: ["customer", "super_admin"] });
})();
