/**
 * public/js/pages/staff/tickets.js
 * صفحة تذاكر العملاء لموظفي العمليات والدعم.
 */
(function () {
  Router.add("/staff/tickets", async (root) => {
    if (!Guards.requireRole(root, ["staff", "super_admin"])) return;
    const ar = I18n.getLocale() === "ar";
    const state = { page: 1, limit: 10, search: "", status: "" };

    root.innerHTML = Components.layout({
      title: I18n.t("nav_s_tickets"),
      content: `
        <div class="toolbar">
          <div class="toolbar-group">
            <input class="form-control" id="st-search" style="width:220px" placeholder="${Components.escapeHtml(I18n.t("search"))}">
            <select class="form-control" id="st-status" style="width:auto">
              <option value="">${ar ? "كل الحالات" : "All Statuses"}</option>
              <option value="open">open</option>
              <option value="pending_customer">pending_customer</option>
              <option value="resolved">resolved</option>
              <option value="closed">closed</option>
            </select>
          </div>
        </div>
        <div class="card">
          <div id="st-table-wrap">${Components.escapeHtml(I18n.t("loading"))}</div>
          <div id="st-pagination"></div>
        </div>
      `,
    });

    async function loadTickets() {
      const tableWrap = document.getElementById("st-table-wrap");
      const pagWrap = document.getElementById("st-pagination");
      const res = await ApiServices.staff.listTickets({
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
          { key: "subject", label: ar ? "الموضوع" : "Subject" },
          { key: "priority", label: ar ? "الأولوية" : "Priority", render: (t) => Components.badge(t.priority || "normal", t.priority === "high" ? "danger" : "info") },
          { key: "status", label: I18n.t("status"), render: (t) => Components.statusBadge(t.status || "open") },
          {
            key: "actions",
            label: I18n.t("actions"),
            render: (t) => `
              <div style="display:flex;gap:6px;flex-wrap:wrap">
                <button class="btn btn-outline btn-sm" onclick="window.__staffReplyTkt('${Components.escapeHtml(t.id)}')">${ar ? "رد" : "Reply"}</button>
                <button class="btn btn-success btn-sm" onclick="window.__staffCloseTkt('${Components.escapeHtml(t.id)}','resolved')">${ar ? "حل" : "Resolve"}</button>
              </div>
            `,
          },
        ],
      });
      const meta = (res.meta && res.meta.pagination) || { page: state.page, limit: state.limit, total: res.data && res.data.total };
      Pagination.mount(pagWrap, meta, (p) => { state.page = p; loadTickets(); });
    }

    document.getElementById("st-search").addEventListener("input", (e) => {
      state.search = e.target.value.trim();
      state.page = 1;
      loadTickets();
    });
    document.getElementById("st-status").addEventListener("change", (e) => {
      state.status = e.target.value;
      state.page = 1;
      loadTickets();
    });

    window.__staffReplyTkt = (id) => {
      Modal.open({
        title: ar ? "الرد على التذكرة" : "Reply to Ticket",
        bodyHtml: `
          <form id="sr-form">
            ${Forms.renderFields([{ name: "message", label: ar ? "نص الرد" : "Reply", type: "textarea", required: true }])}
            <button class="btn" type="submit">${Components.escapeHtml(I18n.t("submit"))}</button>
          </form>
        `,
      });
      document.getElementById("sr-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const check = Forms.validate(e.target, { message: { required: true } });
        if (!check.valid) return;
        const r = await ApiServices.staff.replyTicket(id, check.values.message);
        if (r.success) {
          Modal.close();
          Toast.success(ar ? "تم إرسال الرد" : "Reply sent");
        }
      });
    };

    window.__staffCloseTkt = async (id, status) => {
      const r = await ApiServices.staff.updateTicketStatus(id, status);
      if (r.success) {
        Toast.success(ar ? "تم إغلاق التذكرة كمحلولة" : "Ticket resolved");
        loadTickets();
      }
    };

    await loadTickets();
  }, { requiresAuth: true, roles: ["staff", "super_admin"] });
})();
