/**
 * public/js/pages/moderator/posts.js
 * صفحة مراجعة المنشورات والمقالات لمشرف المحتوى.
 */
(function () {
  Router.add("/moderator/posts", async (root) => {
    if (!Guards.requireRole(root, ["moderator", "super_admin"])) return;
    const ar = I18n.getLocale() === "ar";
    const state = { page: 1, limit: 10, search: "" };

    root.innerHTML = Components.layout({
      title: I18n.t("nav_m_posts"),
      content: `
        <div class="toolbar">
          <input class="form-control" id="mp-search" style="width:220px" placeholder="${Components.escapeHtml(I18n.t("search"))}">
        </div>
        <div class="card">
          <div id="mp-table-wrap">${Components.escapeHtml(I18n.t("loading"))}</div>
          <div id="mp-pagination"></div>
        </div>
      `,
    });

    async function loadPosts() {
      const tableWrap = document.getElementById("mp-table-wrap");
      const pagWrap = document.getElementById("mp-pagination");
      const res = await ApiServices.moderator.listPosts({ page: state.page, limit: state.limit, search: state.search || undefined });
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
          { key: "moderation_status", label: I18n.t("status"), render: (p) => Components.statusBadge(p.moderation_status || p.status || "approved") },
          {
            key: "actions",
            label: I18n.t("actions"),
            render: (p) => `
              <div style="display:flex;gap:6px;flex-wrap:wrap">
                <button class="btn btn-success btn-sm" onclick="window.__modPost('${Components.escapeHtml(p.id)}','approved')">${ar ? "اعتماد" : "Approve"}</button>
                <button class="btn btn-outline btn-sm" onclick="window.__modPost('${Components.escapeHtml(p.id)}','hidden')">${ar ? "إخفاء" : "Hide"}</button>
                <button class="btn btn-danger btn-sm" onclick="window.__modPost('${Components.escapeHtml(p.id)}','rejected')">${ar ? "رفض" : "Reject"}</button>
              </div>
            `,
          },
        ],
      });
      const meta = (res.meta && res.meta.pagination) || { page: state.page, limit: state.limit, total: res.data && res.data.total };
      Pagination.mount(pagWrap, meta, (p) => { state.page = p; loadPosts(); });
    }

    document.getElementById("mp-search").addEventListener("input", (e) => {
      state.search = e.target.value.trim();
      state.page = 1;
      loadPosts();
    });

    window.__modPost = async (id, status) => {
      const r = await ApiServices.moderator.moderatePost(id, status, "");
      if (r.success) {
        Toast.success(ar ? "تم تحديث حالة المنشور" : "Post updated");
        loadPosts();
      }
    };

    await loadPosts();
  }, { requiresAuth: true, roles: ["moderator", "super_admin"] });
})();
