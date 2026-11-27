/**
 * public/js/pages/moderator/reviews.js
 * صفحة مراجعة التقييمات لمشرف المحتوى.
 */
(function () {
  Router.add("/moderator/reviews", async (root) => {
    if (!Guards.requireRole(root, ["moderator", "super_admin"])) return;
    const ar = I18n.getLocale() === "ar";
    const state = { page: 1, limit: 10, status: "" };

    root.innerHTML = Components.layout({
      title: I18n.t("nav_m_reviews"),
      content: `
        <div class="toolbar">
          <select class="form-control" id="mrv-status" style="width:auto">
            <option value="">${ar ? "كل الحالات" : "All Statuses"}</option>
            <option value="approved">approved</option>
            <option value="hidden">hidden</option>
            <option value="flagged">flagged</option>
          </select>
        </div>
        <div class="card">
          <div id="mrv-table-wrap">${Components.escapeHtml(I18n.t("loading"))}</div>
          <div id="mrv-pagination"></div>
        </div>
      `,
    });

    async function loadReviews() {
      const tableWrap = document.getElementById("mrv-table-wrap");
      const pagWrap = document.getElementById("mrv-pagination");
      const res = await ApiServices.moderator.listReviews({ page: state.page, limit: state.limit, status: state.status || undefined });
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
          { key: "status", label: I18n.t("status"), render: (rv) => Components.statusBadge(rv.status || "approved") },
          {
            key: "actions",
            label: I18n.t("actions"),
            render: (rv) => `
              <div style="display:flex;gap:6px;flex-wrap:wrap">
                <button class="btn btn-success btn-sm" onclick="window.__modRev('${Components.escapeHtml(rv.id)}','approved')">${ar ? "موافقة" : "Approve"}</button>
                <button class="btn btn-outline btn-sm" onclick="window.__modRev('${Components.escapeHtml(rv.id)}','flagged')">${ar ? "تنبيه" : "Flag"}</button>
                <button class="btn btn-danger btn-sm" onclick="window.__modRev('${Components.escapeHtml(rv.id)}','hidden')">${ar ? "إخفاء" : "Hide"}</button>
              </div>
            `,
          },
        ],
      });
      const meta = (res.meta && res.meta.pagination) || { page: state.page, limit: state.limit, total: res.data && res.data.total };
      Pagination.mount(pagWrap, meta, (p) => { state.page = p; loadReviews(); });
    }

    document.getElementById("mrv-status").addEventListener("change", (e) => {
      state.status = e.target.value;
      state.page = 1;
      loadReviews();
    });

    window.__modRev = async (id, status) => {
      const r = await ApiServices.moderator.updateReviewStatus(id, status);
      if (r.success) {
        Toast.success(ar ? "تم تحديث التقييم" : "Review updated");
        loadReviews();
      }
    };

    await loadReviews();
  }, { requiresAuth: true, roles: ["moderator", "super_admin"] });
})();
