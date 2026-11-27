/**
 * public/js/pages/staff/orders.js
 * صفحة تنفيذ وتجهيز الطلبات لموظفي العمليات.
 */
(function () {
  Router.add("/staff/orders", async (root) => {
    if (!Guards.requireRole(root, ["staff", "super_admin"])) return;
    const ar = I18n.getLocale() === "ar";
    const state = { page: 1, limit: 10, search: "", status: "" };

    root.innerHTML = Components.layout({
      title: I18n.t("nav_s_orders"),
      content: `
        <div class="toolbar">
          <div class="toolbar-group">
            <input class="form-control" id="so-search" style="width:220px" placeholder="${Components.escapeHtml(I18n.t("search"))}">
            <select class="form-control" id="so-status" style="width:auto">
              <option value="">${ar ? "كل الحالات" : "All Statuses"}</option>
              ${["pending", "confirmed", "processing", "shipped", "delivered"].map((s) => `<option value="${s}">${s}</option>`).join("")}
            </select>
          </div>
        </div>
        <div class="card">
          <div id="so-table-wrap">${Components.escapeHtml(I18n.t("loading"))}</div>
          <div id="so-pagination"></div>
        </div>
      `,
    });

    async function loadOrders() {
      const tableWrap = document.getElementById("so-table-wrap");
      const pagWrap = document.getElementById("so-pagination");
      const res = await ApiServices.staff.listOrders({
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
          { key: "order_number", label: ar ? "رقم الطلب" : "Order #", render: (o) => Components.escapeHtml(o.order_number || o.id) },
          { key: "fulfillment_status", label: ar ? "حالة التنفيذ" : "Fulfillment", render: (o) => Components.statusBadge(o.fulfillment_status || o.status || "picking") },
          {
            key: "actions",
            label: I18n.t("actions"),
            render: (o) => `
              <select class="form-control" style="padding:4px 8px;width:auto;display:inline-block" onchange="window.__staffFulfill('${Components.escapeHtml(o.id)}', this.value)">
                ${["picking", "packed", "shipped", "delivered", "on_hold"].map((st) => `<option value="${st}" ${(o.fulfillment_status || "picking") === st ? "selected" : ""}>${st}</option>`).join("")}
              </select>
            `,
          },
        ],
      });
      const meta = (res.meta && res.meta.pagination) || { page: state.page, limit: state.limit, total: res.data && res.data.total };
      Pagination.mount(pagWrap, meta, (p) => { state.page = p; loadOrders(); });
    }

    document.getElementById("so-search").addEventListener("input", (e) => {
      state.search = e.target.value.trim();
      state.page = 1;
      loadOrders();
    });
    document.getElementById("so-status").addEventListener("change", (e) => {
      state.status = e.target.value;
      state.page = 1;
      loadOrders();
    });

    window.__staffFulfill = async (id, status) => {
      const r = await ApiServices.staff.updateFulfillment(id, status, "");
      if (r.success) {
        Toast.success(ar ? "تم تحديث حالة التنفيذ" : "Fulfillment updated");
        loadOrders();
      }
    };

    await loadOrders();
  }, { requiresAuth: true, roles: ["staff", "super_admin"] });
})();
