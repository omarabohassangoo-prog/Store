/**
 * public/js/pages/customer/reviews.js
 * صفحة تقييمات المنتجات للعميل.
 */
(function () {
  Router.add("/customer/reviews", async (root) => {
    if (!Guards.requireRole(root, ["customer", "super_admin"])) return;
    const ar = I18n.getLocale() === "ar";
    const state = { page: 1, limit: 10 };

    root.innerHTML = Components.layout({
      title: I18n.t("nav_c_reviews"),
      content: `
        <div class="toolbar">
          <button class="btn btn-sm" id="crv-add">⭐ ${ar ? "إضافة تقييم" : "Write Review"}</button>
        </div>
        <div class="card">
          <div id="crv-table-wrap">${Components.escapeHtml(I18n.t("loading"))}</div>
          <div id="crv-pagination"></div>
        </div>
      `,
    });

    async function loadReviews() {
      const tableWrap = document.getElementById("crv-table-wrap");
      const pagWrap = document.getElementById("crv-pagination");
      const res = await ApiServices.customer.listReviews({ page: state.page, limit: state.limit });
      if (!res.success) {
        tableWrap.innerHTML = Components.alert("error", (res.error && res.error.message) || "Failed");
        return;
      }
      const items = (res.data && res.data.items) || [];
      DataTable.mount(tableWrap, {
        rows: items,
        columns: [
          { key: "id", label: "ID" },
          { key: "product_id", label: ar ? "المنتج" : "Product ID" },
          { key: "rating", label: ar ? "التقييم" : "Rating", render: (rv) => `⭐ ${Components.escapeHtml(rv.rating || 5)}` },
          { key: "comment", label: ar ? "التعليق" : "Comment" },
          { key: "reply", label: ar ? "رد التاجر" : "Vendor Reply" },
        ],
      });
      const meta = (res.meta && res.meta.pagination) || { page: state.page, limit: state.limit, total: res.data && res.data.total };
      Pagination.mount(pagWrap, meta, (p) => { state.page = p; loadReviews(); });
    }

    document.getElementById("crv-add").addEventListener("click", () => {
      Modal.open({
        title: ar ? "إضافة تقييم جديد" : "Write a Review",
        bodyHtml: `
          <form id="crv-form">
            ${Forms.renderFields([
              { name: "product_id", label: "Product ID", placeholder: "prd_101", required: true },
              { name: "rating", label: ar ? "التقييم (1-5)" : "Rating (1-5)", type: "number", value: 5, required: true },
              { name: "comment", label: ar ? "التعليق" : "Comment", type: "textarea", required: true },
            ])}
            <button class="btn" type="submit">${Components.escapeHtml(I18n.t("submit"))}</button>
          </form>
        `,
      });
      document.getElementById("crv-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const check = Forms.validate(e.target, { product_id: { required: true }, rating: { required: true, min: 1 }, comment: { required: true } });
        if (!check.valid) return;
        const r = await ApiServices.customer.createReview(check.values);
        if (r.success) {
          Modal.close();
          Toast.success(ar ? "تم إرسال التقييم" : "Review submitted");
          loadReviews();
        }
      });
    });

    await loadReviews();
  }, { requiresAuth: true, roles: ["customer", "super_admin"] });
})();
