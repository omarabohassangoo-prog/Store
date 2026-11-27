/**
 * public/js/pages/admin/audit-logs.js
 * صفحة سجل المراجعة والأحداث لمدير النظام.
 */
(function () {
  Router.add("/admin/audit-logs", async (root) => {
    if (!Guards.requireRole(root, ["super_admin"])) return;
    const ar = I18n.getLocale() === "ar";
    const state = { page: 1, limit: 15, search: "", sort_by: "created_at", sort_dir: "desc" };

    root.innerHTML = Components.layout({
      title: I18n.t("nav_audit"),
      content: `
        <div class="toolbar">
          <div class="toolbar-group">
            <input class="form-control" id="al-search" style="width:240px" placeholder="${Components.escapeHtml(I18n.t("search"))}">
          </div>
        </div>
        <div class="card">
          <div id="al-table-wrap">${Components.escapeHtml(I18n.t("loading"))}</div>
          <div id="al-pagination"></div>
        </div>
      `,
    });

    async function loadLogs() {
      const tableWrap = document.getElementById("al-table-wrap");
      const pagWrap = document.getElementById("al-pagination");
      const res = await ApiServices.admin.listAuditLogs({
        page: state.page,
        limit: state.limit,
        search: state.search || undefined,
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
        onSort: (k, d) => { state.sort_by = k; state.sort_dir = d; loadLogs(); },
        columns: [
          { key: "id", label: "ID", sortable: true },
          { key: "action", label: "Action", sortable: true, render: (l) => Components.badge(l.action || l.event || "EVENT", "info") },
          { key: "target_type", label: ar ? "الهدف" : "Target", render: (l) => Components.escapeHtml((l.target_type || "") + (l.target_id ? " #" + l.target_id : "")) },
          { key: "user_id", label: ar ? "المنفّذ" : "Actor", render: (l) => Components.escapeHtml(l.actor_email || l.user_id || "—") },
          { key: "created_at", label: I18n.t("created_at"), sortable: true },
        ],
      });
      const meta = (res.meta && res.meta.pagination) || { page: state.page, limit: state.limit, total: res.data && res.data.total };
      Pagination.mount(pagWrap, meta, (p) => { state.page = p; loadLogs(); });
    }

    document.getElementById("al-search").addEventListener("input", (e) => {
      state.search = e.target.value.trim();
      state.page = 1;
      loadLogs();
    });

    await loadLogs();
  }, { requiresAuth: true, roles: ["super_admin"] });
})();
