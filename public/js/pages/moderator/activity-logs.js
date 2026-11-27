/**
 * public/js/pages/moderator/activity-logs.js
 * صفحة سجل نشاط الإشراف وتسجيل إجراءات المشرف.
 */
(function () {
  Router.add("/moderator/activity-logs", async (root) => {
    if (!Guards.requireRole(root, ["moderator", "super_admin"])) return;
    const ar = I18n.getLocale() === "ar";
    const state = { page: 1, limit: 10, search: "" };

    root.innerHTML = Components.layout({
      title: I18n.t("nav_m_activity"),
      content: `
        <div class="toolbar">
          <div class="toolbar-group">
            <input class="form-control" id="ma-search" style="width:220px" placeholder="${Components.escapeHtml(I18n.t("search"))}">
          </div>
          <button class="btn btn-sm" id="ma-add-btn">➕ ${ar ? "تسجيل إجراء إشرافي" : "Log Moderation Action"}</button>
        </div>
        <div class="card">
          <div id="ma-table-wrap">${Components.escapeHtml(I18n.t("loading"))}</div>
          <div id="ma-pagination"></div>
        </div>
      `,
    });

    async function loadLogs() {
      const tableWrap = document.getElementById("ma-table-wrap");
      const pagWrap = document.getElementById("ma-pagination");
      const res = await ApiServices.moderator.listActivityLogs({ page: state.page, limit: state.limit, search: state.search || undefined });
      if (!res.success) {
        tableWrap.innerHTML = Components.alert("error", (res.error && res.error.message) || "Failed");
        return;
      }
      const items = (res.data && res.data.items) || [];
      DataTable.mount(tableWrap, {
        rows: items,
        columns: [
          { key: "id", label: "ID" },
          { key: "action", label: ar ? "الإجراء" : "Action", render: (l) => Components.badge(l.action || "MOD_ACTION", "info") },
          { key: "user_id", label: ar ? "المشرف" : "Moderator" },
          { key: "created_at", label: I18n.t("created_at") },
        ],
      });
      const meta = (res.meta && res.meta.pagination) || { page: state.page, limit: state.limit, total: res.data && res.data.total };
      Pagination.mount(pagWrap, meta, (p) => { state.page = p; loadLogs(); });
    }

    document.getElementById("ma-search").addEventListener("input", (e) => {
      state.search = e.target.value.trim();
      state.page = 1;
      loadLogs();
    });

    document.getElementById("ma-add-btn").addEventListener("click", () => {
      Modal.open({
        title: ar ? "تسجيل إجراء إشرافي" : "New Moderation Action",
        bodyHtml: `
          <form id="ma-form">
            ${Forms.renderFields([
              { name: "action_type", label: ar ? "نوع الإجراء" : "Action Type", value: "warning", required: true },
              { name: "target_id", label: ar ? "معرّف الهدف" : "Target ID", required: true },
              { name: "reason", label: ar ? "السبب" : "Reason", type: "textarea", required: true },
            ])}
            <button class="btn" type="submit">${Components.escapeHtml(I18n.t("submit"))}</button>
          </form>
        `,
      });
      document.getElementById("ma-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const check = Forms.validate(e.target, { action_type: { required: true }, target_id: { required: true }, reason: { required: true } });
        if (!check.valid) return;
        const r = await ApiServices.moderator.createAction(check.values);
        if (r.success) {
          Modal.close();
          Toast.success(ar ? "تم تسجيل الإجراء الإشرافي" : "Action recorded");
          loadLogs();
        }
      });
    });

    await loadLogs();
  }, { requiresAuth: true, roles: ["moderator", "super_admin"] });
})();
