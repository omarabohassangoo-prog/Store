/**
 * public/js/pages/vendor/reviews.js
 * صفحة تقييمات منتجات التاجر والرد عليها.
 */
(function () {
  Router.add("/vendor/reviews", async (root) => {
    if (!Guards.requireRole(root, ["vendor", "super_admin"])) return;
    const ar = I18n.getLocale() === "ar";
    const state = { page: 1, limit: 10, search: "" };

    root.innerHTML = Components.layout({
      title: I18n.t("nav_v_reviews"),
      content: `
        <div class="toolbar">
          <input class="form-control" id="vr-search" style="width:220px" placeholder="${Components.escapeHtml(I18n.t("search"))}">
        </div>
        <div class="card">
          <div id="vr-table-wrap">${Components.escapeHtml(I18n.t("loading"))}</div>
          <div id="vr-pagination"></div>
        </div>
      `,
    });

    async function loadReviews() {
      const tableWrap = document.getElementById("vr-table-wrap");
      const pagWrap = document.getElementById("vr-pagination");
      const res = await ApiServices.vendor.listReviews({ page: state.page, limit: state.limit, search: state.search || undefined });
      if (!res.success) {
        tableWrap.innerHTML = Components.alert("error", (res.error && res.error.message) || "Failed");
        return;
      }
      const items = (res.data && res.data.items) || [];
      DataTable.mount(tableWrap, {
        rows: items,
        columns: [
          { key: "id", label: "ID" },
          { key: "product_id", label: ar ? "المنتج" : "Product" },
          { key: "rating", label: ar ? "التقييم" : "Rating", render: (rv) => `⭐ ${Components.escapeHtml(rv.rating || 5)}` },
          { key: "comment", label: ar ? "التعليق" : "Comment" },
          { key: "reply", label: ar ? "الرد" : "Reply" },
          {
            key: "actions",
            label: I18n.t("actions"),
            render: (rv) => `<button class="btn btn-outline btn-sm" onclick="window.__replyVendorReview('${Components.escapeHtml(rv.id)}')">${ar ? "رد" : "Reply"}</button>`,
          },
        ],
      });
      const meta = (res.meta && res.meta.pagination) || { page: state.page, limit: state.limit, total: res.data && res.data.total };
      Pagination.mount(pagWrap, meta, (p) => { state.page = p; loadReviews(); });
    }

    document.getElementById("vr-search").addEventListener("input", (e) => {
      state.search = e.target.value.trim();
      state.page = 1;
      loadReviews();
    });

    window.__replyVendorReview = (id) => {
      Modal.open({
        title: ar ? "الرد على التقييم" : "Reply to Review",
        bodyHtml: `
          <form id="rr-form">
            ${Forms.renderFields([{ name: "reply", label: ar ? "نص الرد" : "Reply", type: "textarea", required: true }])}
            <button class="btn" type="submit">${Components.escapeHtml(I18n.t("submit"))}</button>
          </form>
        `,
      });
      document.getElementById("rr-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const check = Forms.validate(e.target, { reply: { required: true } });
        if (!check.valid) return;
        const r = await ApiServices.vendor.replyReview(id, check.values.reply);
        if (r.success) {
          Modal.close();
          Toast.success(ar ? "تم إرسال الرد" : "Reply saved");
          loadReviews();
        }
      });
    };

    await loadReviews();
  }, { requiresAuth: true, roles: ["vendor", "super_admin"] });
})();
