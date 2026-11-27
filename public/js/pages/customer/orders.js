/**
 * public/js/pages/customer/orders.js
 * صفحة طلبات العميل (Customer Orders).
 */
(function () {
  Router.add("/customer/orders", async (root) => {
    if (!Guards.requireRole(root, ["customer", "super_admin"])) return;
    const ar = I18n.getLocale() === "ar";
    const state = { page: 1, limit: 10, search: "", status: "", sort_by: "created_at", sort_dir: "desc" };

    root.innerHTML = Components.layout({
      title: I18n.t("nav_c_orders"),
      content: `
        <div class="toolbar">
          <div class="toolbar-group">
            <input class="form-control" id="co-search" style="width:220px" placeholder="${Components.escapeHtml(I18n.t("search"))}">
            <select class="form-control" id="co-status" style="width:auto">
              <option value="">${ar ? "كل الحالات" : "All Statuses"}</option>
              <option value="pending">pending</option>
              <option value="processing">processing</option>
              <option value="shipped">shipped</option>
              <option value="delivered">delivered</option>
              <option value="cancelled">cancelled</option>
            </select>
          </div>
        </div>
        <div class="card">
          <div id="co-table-wrap">${Components.escapeHtml(I18n.t("loading"))}</div>
          <div id="co-pagination"></div>
        </div>
      `,
    });

    async function loadOrders() {
      const tableWrap = document.getElementById("co-table-wrap");
      const pagWrap = document.getElementById("co-pagination");
      const res = await ApiServices.customer.listOrders({
        page: state.page,
        limit: state.limit,
        search: state.search || undefined,
        status: state.status || undefined,
        sort_by: state.sort_by,
        sort_dir: state.sort_dir,
      });

      if (!res.success) {
        tableWrap.innerHTML = Components.alert("error", (res.error && res.error.message) || "Failed to load orders");
        pagWrap.innerHTML = "";
        return;
      }

      const items = (res.data && res.data.items) || [];
      DataTable.mount(tableWrap, {
        rows: items,
        sortBy: state.sort_by,
        sortDir: state.sort_dir,
        onSort: (key, dir) => {
          state.sort_by = key;
          state.sort_dir = dir;
          loadOrders();
        },
        columns: [
          { key: "id", label: "ID", sortable: true },
          { key: "order_number", label: ar ? "رقم الطلب" : "Order #", sortable: true, render: (o) => Components.escapeHtml(o.order_number || o.id) },
          { key: "total_amount", label: ar ? "الإجمالي" : "Total", sortable: true, render: (o) => `${Components.escapeHtml(o.total_amount ?? 0)} ${Components.escapeHtml(o.currency || "SAR")}` },
          { key: "status", label: I18n.t("status"), sortable: true, render: (o) => Components.statusBadge(o.status) },
          {
            key: "actions",
            label: I18n.t("actions"),
            render: (o) => `
              <div style="display:flex;gap:6px;flex-wrap:wrap">
                <button class="btn btn-outline btn-sm" onclick="window.__viewCustOrder('${Components.escapeHtml(o.id)}')">${ar ? "تفاصيل" : "Details"}</button>
                <button class="btn btn-outline btn-sm" onclick="window.__custInvoice('${Components.escapeHtml(o.id)}')">🧾 ${ar ? "الفاتورة" : "Invoice"}</button>
                ${o.status !== "cancelled" && o.status !== "delivered" ? `<button class="btn btn-danger btn-sm" onclick="window.__custCancel('${Components.escapeHtml(o.id)}')">${ar ? "إلغاء" : "Cancel"}</button>` : ""}
              </div>
            `,
          },
        ],
      });

      const meta = (res.meta && res.meta.pagination) || { page: state.page, limit: state.limit, total: res.data && res.data.total };
      Pagination.mount(pagWrap, meta, (nextPage) => {
        state.page = nextPage;
        loadOrders();
      });
    }

    document.getElementById("co-search").addEventListener("input", (e) => {
      state.search = e.target.value.trim();
      state.page = 1;
      loadOrders();
    });
    document.getElementById("co-status").addEventListener("change", (e) => {
      state.status = e.target.value;
      state.page = 1;
      loadOrders();
    });

    window.__viewCustOrder = async (id) => {
      const r = await ApiServices.customer.getOrder(id);
      if (!r.success || !r.data) {
        Toast.error((r.error && r.error.message) || "Failed to load order");
        return;
      }
      const o = r.data;
      Modal.open({
        title: (ar ? "تفاصيل الطلب " : "Order Details ") + (o.order_number || o.id),
        bodyHtml: `
          <div style="display:grid;gap:8px">
            <div><strong>ID:</strong> ${Components.escapeHtml(o.id)}</div>
            <div><strong>${Components.escapeHtml(I18n.t("status"))}:</strong> ${Components.statusBadge(o.status)}</div>
            <div><strong>${ar ? "الإجمالي:" : "Total:"}</strong> ${Components.escapeHtml(o.total_amount ?? 0)} ${Components.escapeHtml(o.currency || "SAR")}</div>
            <div><strong>${Components.escapeHtml(I18n.t("created_at"))}:</strong> ${Components.escapeHtml(o.created_at || "—")}</div>
          </div>
        `,
      });
    };

    window.__custInvoice = async (id) => {
      const r = await ApiServices.customer.getOrderInvoice(id);
      if (r.success && r.data) {
        Modal.printable((ar ? "فاتورة رقم #" : "Invoice #") + id, r.data.printable_html);
      } else {
        Toast.error((r.error && r.error.message) || "Failed");
      }
    };

    window.__custCancel = async (id) => {
      const ok = await Modal.confirm({
        danger: true,
        message: ar ? "هل تريد إلغاء هذا الطلب؟" : "Cancel this order?",
      });
      if (!ok) return;
      const r = await ApiServices.customer.cancelOrder(id, "Customer requested cancellation");
      if (r.success) {
        Toast.success(ar ? "تم إلغاء الطلب" : "Order cancelled");
        loadOrders();
      } else {
        Toast.error((r.error && r.error.message) || "Failed");
      }
    };

    await loadOrders();
  }, { requiresAuth: true, roles: ["customer", "super_admin"] });
})();
