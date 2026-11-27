/**
 * public/js/pages/tickets.js
 * صفحة تذاكر الدعم الفني المشتركة.
 */
(function () {
  Router.add("/tickets", async (root) => {
    if (!Guards.requireAuth(root)) return;
    const ar = I18n.getLocale() === "ar";
    const state = { page: 1, limit: 10, search: "", status: "", sort_by: "created_at", sort_dir: "desc" };

    root.innerHTML = Components.layout({
      title: I18n.t("tickets"),
      content: `
        <div class="toolbar">
          <div class="toolbar-group">
            <input class="form-control" id="tkt-search" style="width:220px" placeholder="${Components.escapeHtml(I18n.t("search"))}">
            <select class="form-control" id="tkt-status" style="width:auto">
              <option value="">${ar ? "كل الحالات" : "All Statuses"}</option>
              <option value="open">open</option>
              <option value="in_progress">in_progress</option>
              <option value="resolved">resolved</option>
              <option value="closed">closed</option>
            </select>
          </div>
          <button class="btn btn-sm" id="tkt-new-btn">🎫 ${ar ? "فتح تذكرة دعم" : "Open Support Ticket"}</button>
        </div>
        <div class="card">
          <div id="tkt-table-wrap">${Components.escapeHtml(I18n.t("loading"))}</div>
          <div id="tkt-pagination"></div>
        </div>
      `,
    });

    async function loadTickets() {
      const tableWrap = document.getElementById("tkt-table-wrap");
      const pagWrap = document.getElementById("tkt-pagination");
      const res = await ApiServices.support.listTickets({
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
      window.__supportTickets = items;

      DataTable.mount(tableWrap, {
        rows: items,
        sortBy: state.sort_by,
        sortDir: state.sort_dir,
        onSort: (k, d) => { state.sort_by = k; state.sort_dir = d; loadTickets(); },
        columns: [
          { key: "id", label: "ID", sortable: true },
          { key: "subject", label: ar ? "الموضوع" : "Subject", sortable: true },
          {
            key: "priority",
            label: ar ? "الأولوية" : "Priority",
            render: (t) => Components.badge(t.priority || "normal", t.priority === "high" ? "danger" : "info"),
          },
          { key: "status", label: I18n.t("status"), render: (t) => Components.statusBadge(t.status || "open") },
          { key: "created_at", label: I18n.t("created_at"), sortable: true },
          {
            key: "actions",
            label: I18n.t("actions"),
            render: (t) => `<button class="btn btn-outline btn-sm" onclick="window.__viewTicket('${Components.escapeHtml(t.id)}')">${ar ? "عرض" : "View"}</button>`,
          },
        ],
      });

      const meta = (res.meta && res.meta.pagination) || { page: state.page, limit: state.limit, total: res.data && res.data.total };
      Pagination.mount(pagWrap, meta, (p) => { state.page = p; loadTickets(); });
    }

    window.__viewTicket = (id) => {
      const t = (window.__supportTickets || []).find((x) => x.id === id);
      if (!t) return;
      Modal.open({
        title: t.subject || id,
        bodyHtml: `
          <div style="display:grid;gap:10px">
            <div><strong>ID:</strong> ${Components.escapeHtml(t.id)}</div>
            <div><strong>${Components.escapeHtml(I18n.t("status"))}:</strong> ${Components.statusBadge(t.status || "open")}</div>
            <div><strong>${ar ? "الأولوية:" : "Priority:"}</strong> ${Components.escapeHtml(t.priority || "normal")}</div>
            <div class="card" style="padding:12px">${Components.escapeHtml(t.message || "—")}</div>
          </div>
        `,
      });
    };

    document.getElementById("tkt-search").addEventListener("input", (e) => {
      state.search = e.target.value.trim();
      state.page = 1;
      loadTickets();
    });
    document.getElementById("tkt-status").addEventListener("change", (e) => {
      state.status = e.target.value;
      state.page = 1;
      loadTickets();
    });

    document.getElementById("tkt-new-btn").addEventListener("click", () => {
      Modal.open({
        title: ar ? "فتح تذكرة دعم جديدة" : "New Support Ticket",
        bodyHtml: `
          <form id="tkt-form">
            ${Forms.renderFields([
              { name: "subject", label: ar ? "الموضوع" : "Subject", required: true },
              {
                name: "priority",
                label: ar ? "الأولوية" : "Priority",
                type: "select",
                value: "normal",
                options: [
                  { value: "normal", label: ar ? "عادية" : "Normal" },
                  { value: "high", label: ar ? "عالية" : "High" },
                ],
              },
              { name: "message", label: ar ? "التفاصيل" : "Details", type: "textarea", required: true },
            ])}
            <button class="btn" type="submit">${Components.escapeHtml(I18n.t("submit"))}</button>
          </form>
        `,
      });
      document.getElementById("tkt-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const check = Forms.validate(e.target, { subject: { required: true }, message: { required: true } });
        if (!check.valid) return;
        const r = await ApiServices.support.createTicket(check.values);
        if (r.success) {
          Modal.close();
          Toast.success(ar ? "تم فتح التذكرة بنجاح" : "Ticket created");
          loadTickets();
        } else {
          Toast.error((r.error && r.error.message) || "Failed");
        }
      });
    });

    await loadTickets();
  }, { requiresAuth: true });
})();
