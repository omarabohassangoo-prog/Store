/**
 * public/js/pages/admin/orders.js
 * صفحة إدارة جميع الطلبات لمدير النظام.
 */
(function () {
  Router.add("/admin/orders", async (root) => {
    if (!Guards.requireRole(root, ["super_admin"])) return;
    const ar = I18n.getLocale() === "ar";
    const state = { page: 1, limit: 10, search: "", status: "", sort_by: "created_at", sort_dir: "desc" };

    root.innerHTML = Components.layout({
      title: I18n.t("nav_orders"),
      content: `
        <div class="toolbar">
          <div class="toolbar-group">
            <input class="form-control" id="ao-search" style="width:220px" placeholder="${Components.escapeHtml(I18n.t("search"))}">
            <select class="form-control" id="ao-status" style="width:auto">
              <option value="">${ar ? "كل الحالات" : "All Statuses"}</option>
              ${["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"].map((s) => `<option value="${s}">${s}</option>`).join("")}
            </select>
          </div>
          <a href="#/admin/products" class="btn btn-outline btn-sm">🛍️ ${Components.escapeHtml(I18n.t("nav_products"))}</a>
        </div>
        <div class="card">
          <div id="ao-table-wrap">${Components.escapeHtml(I18n.t("loading"))}</div>
          <div id="ao-pagination"></div>
        </div>
      `,
    });

    async function loadOrders() {
      const tableWrap = document.getElementById("ao-table-wrap");
      const pagWrap = document.getElementById("ao-pagination");
      const res = await ApiServices.admin.listOrders({
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
      DataTable.mount(tableWrap, {
        rows: items,
        sortBy: state.sort_by,
        sortDir: state.sort_dir,
        onSort: (k, d) => { state.sort_by = k; state.sort_dir = d; loadOrders(); },
        columns: [
          { key: "id", label: "ID", sortable: true },
          { key: "order_number", label: ar ? "رقم الطلب" : "Order #", sortable: true, render: (o) => Components.escapeHtml(o.order_number || o.id) },
          { key: "user_id", label: ar ? "العميل" : "Customer" },
          { key: "total_amount", label: ar ? "الإجمالي" : "Total", sortable: true, render: (o) => `${Components.escapeHtml(o.total_amount ?? o.total ?? 0)} ${Components.escapeHtml(o.currency || "SAR")}` },
          { key: "status", label: I18n.t("status"), render: (o) => Components.statusBadge(o.status) },
          {
            key: "actions",
            label: I18n.t("actions"),
            render: (o) => `
              <select class="form-control" style="padding:4px 8px;width:auto;display:inline-block" onchange="window.__adminSetOrderStatus('${Components.escapeHtml(o.id)}', this.value)">
                ${["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"].map((st) => `<option value="${st}" ${o.status === st ? "selected" : ""}>${st}</option>`).join("")}
              </select>
            `,
          },
        ],
      });
      const meta = (res.meta && res.meta.pagination) || { page: state.page, limit: state.limit, total: res.data && res.data.total };
      Pagination.mount(pagWrap, meta, (p) => { state.page = p; loadOrders(); });
    }

    document.getElementById("ao-search").addEventListener("input", (e) => {
      state.search = e.target.value.trim();
      state.page = 1;
      loadOrders();
    });
    document.getElementById("ao-status").addEventListener("change", (e) => {
      state.status = e.target.value;
      state.page = 1;
      loadOrders();
    });

    window.__adminSetOrderStatus = async (id, status) => {
      const r = await ApiServices.admin.updateOrderStatus(id, status);
      if (r.success) {
        Toast.success(ar ? "تم تحديث حالة الطلب" : "Order updated");
        loadOrders();
      } else {
        Toast.error((r.error && r.error.message) || "Failed");
      }
    };

    await loadOrders();
  }, { requiresAuth: true, roles: ["super_admin"] });
})();
