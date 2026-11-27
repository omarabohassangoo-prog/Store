/**
 * public/js/pages/moderator/reports.js
 * صفحة معالجة البلاغات لمشرف المحتوى.
 */
(function () {
  Router.add("/moderator/reports", async (root) => {
    if (!Guards.requireRole(root, ["moderator", "super_admin"])) return;
    const ar = I18n.getLocale() === "ar";
    const state = { page: 1, limit: 10, search: "", status: "" };

    root.innerHTML = Components.layout({
      title: I18n.t("nav_m_reports"),
      content: `
        <div class="toolbar">
          <div class="toolbar-group">
            <input class="form-control" id="mr-search" style="width:220px" placeholder="${Components.escapeHtml(I18n.t("search"))}">
            <select class="form-control" id="mr-status" style="width:auto">
              <option value="">${ar ? "كل الحالات" : "All Statuses"}</option>
              <option value="pending">pending</option>
              <option value="resolved">resolved</option>
              <option value="dismissed">dismissed</option>
              <option value="escalated">escalated</option>
            </select>
          </div>
        </div>
        <div class="card">
          <div id="mr-table-wrap">${Components.escapeHtml(I18n.t("loading"))}</div>
          <div id="mr-pagination"></div>
        </div>
      `,
    });

    async function loadReports() {
      const tableWrap = document.getElementById("mr-table-wrap");
      const pagWrap = document.getElementById("mr-pagination");
      const res = await ApiServices.moderator.listReports({
        page: state.page,
        limit: state.limit,
        search: state.search || undefined,
        status: state.status || undefined,
      });
      if (!res.success) {
        tableWrap.innerHTML = Components.alert("error", (res.error && res.error.message) || "Failed");
        return;
      }
      const items = (res.data && res.data.items) || [];
      DataTable.mount(tableWrap, {
        rows: items,
        columns: [
          { key: "id", label: "ID" },
          { key: "reason", label: ar ? "السبب / العنوان" : "Reason / Title", render: (r) => Components.escapeHtml(r.reason || r.title || "—") },
          { key: "status", label: I18n.t("status"), render: (r) => Components.statusBadge(r.status || "pending") },
          { key: "note", label: ar ? "ملاحظة" : "Note" },
          {
            key: "actions",
            label: I18n.t("actions"),
            render: (r) => `
              <div style="display:flex;gap:6px;flex-wrap:wrap">
                <button class="btn btn-success btn-sm" onclick="window.__modResolveReport('${Components.escapeHtml(r.id)}','resolved')">${ar ? "حل" : "Resolve"}</button>
                <button class="btn btn-outline btn-sm" onclick="window.__modResolveReport('${Components.escapeHtml(r.id)}','dismissed')">${ar ? "رفض" : "Dismiss"}</button>
                <button class="btn btn-danger btn-sm" onclick="window.__modResolveReport('${Components.escapeHtml(r.id)}','escalated')">${ar ? "تصعيد" : "Escalate"}</button>
              </div>
            `,
          },
        ],
      });
      const meta = (res.meta && res.meta.pagination) || { page: state.page, limit: state.limit, total: res.data && res.data.total };
      Pagination.mount(pagWrap, meta, (p) => { state.page = p; loadReports(); });
    }

    document.getElementById("mr-search").addEventListener("input", (e) => {
      state.search = e.target.value.trim();
      state.page = 1;
      loadReports();
    });
    document.getElementById("mr-status").addEventListener("change", (e) => {
      state.status = e.target.value;
      state.page = 1;
      loadReports();
    });

    window.__modResolveReport = (id, status) => {
      Modal.open({
        size: "sm",
        title: (ar ? "معالجة البلاغ: " : "Resolve Report: ") + status,
        bodyHtml: `
          <form id="mr-res-form">
            ${Forms.renderFields([{ name: "note", label: ar ? "ملاحظة المشرف" : "Moderator Note", type: "textarea" }])}
            <button class="btn" type="submit">${Components.escapeHtml(I18n.t("submit"))}</button>
          </form>
        `,
      });
      document.getElementById("mr-res-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const v = Forms.serialize(e.target);
        const r = await ApiServices.moderator.resolveReport(id, status, v.note || "");
        if (r.success) {
          Modal.close();
          Toast.success(ar ? "تمت معالجة البلاغ" : "Report updated");
          loadReports();
        }
      });
    };

    await loadReports();
  }, { requiresAuth: true, roles: ["moderator", "super_admin"] });
})();
