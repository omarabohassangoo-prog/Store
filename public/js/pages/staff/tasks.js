/**
 * public/js/pages/staff/tasks.js
 * صفحة مهام موظف العمليات.
 */
(function () {
  Router.add("/staff/tasks", async (root) => {
    if (!Guards.requireRole(root, ["staff", "super_admin"])) return;
    const ar = I18n.getLocale() === "ar";
    const state = { page: 1, limit: 10, search: "", status: "" };

    root.innerHTML = Components.layout({
      title: I18n.t("nav_s_tasks"),
      content: `
        <div class="toolbar">
          <div class="toolbar-group">
            <input class="form-control" id="stsk-search" style="width:220px" placeholder="${Components.escapeHtml(I18n.t("search"))}">
            <select class="form-control" id="stsk-status" style="width:auto">
              <option value="">${ar ? "كل الحالات" : "All Statuses"}</option>
              ${["pending", "in_progress", "completed", "blocked"].map((s) => `<option value="${s}">${s}</option>`).join("")}
            </select>
          </div>
        </div>
        <div class="card">
          <div id="stsk-table-wrap">${Components.escapeHtml(I18n.t("loading"))}</div>
          <div id="stsk-pagination"></div>
        </div>
      `,
    });

    async function loadTasks() {
      const tableWrap = document.getElementById("stsk-table-wrap");
      const pagWrap = document.getElementById("stsk-pagination");
      const res = await ApiServices.staff.listTasks({
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
          { key: "title", label: ar ? "المهمة" : "Task" },
          { key: "priority", label: ar ? "الأولوية" : "Priority", render: (t) => Components.badge(t.priority || "normal", t.priority === "high" ? "danger" : "info") },
          { key: "status", label: I18n.t("status"), render: (t) => Components.statusBadge(t.status) },
          {
            key: "actions",
            label: I18n.t("actions"),
            render: (t) => `
              <select class="form-control" style="padding:4px 8px;width:auto;display:inline-block" onchange="window.__staffTask('${Components.escapeHtml(t.id)}', this.value)">
                ${["pending", "in_progress", "completed", "blocked"].map((st) => `<option value="${st}" ${t.status === st ? "selected" : ""}>${st}</option>`).join("")}
              </select>
            `,
          },
        ],
      });
      const meta = (res.meta && res.meta.pagination) || { page: state.page, limit: state.limit, total: res.data && res.data.total };
      Pagination.mount(pagWrap, meta, (p) => { state.page = p; loadTasks(); });
    }

    document.getElementById("stsk-search").addEventListener("input", (e) => {
      state.search = e.target.value.trim();
      state.page = 1;
      loadTasks();
    });
    document.getElementById("stsk-status").addEventListener("change", (e) => {
      state.status = e.target.value;
      state.page = 1;
      loadTasks();
    });

    window.__staffTask = async (id, status) => {
      const r = await ApiServices.staff.updateTaskStatus(id, status);
      if (r.success) {
        Toast.success(ar ? "تم تحديث المهمة" : "Task updated");
        loadTasks();
      }
    };

    await loadTasks();
  }, { requiresAuth: true, roles: ["staff", "super_admin"] });
})();
