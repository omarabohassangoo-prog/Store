/**
 * public/js/pages/vendor/orders.js
 * صفحة طلبات المتجر للتاجر.
 */
(function () {
  Router.add("/vendor/orders", async (root) => {
    if (!Guards.requireRole(root, ["vendor", "super_admin"])) return;
    const ar = I18n.getLocale() === "ar";
    const state = { page: 1, limit: 10, search: "", status: "", sort_by: "created_at", sort_dir: "desc" };

    root.innerHTML = Components.layout({
      title: I18n.t("nav_v_orders"),
      content: `
        <div class="toolbar">
          <div class="toolbar-group">
            <input class="form-control" id="vo-search" style="width:220px" placeholder="${Components.escapeHtml(I18n.t("search"))}">
            <select class="form-control" id="vo-status" style="width:auto">
              <option value="">${ar ? "كل الحالات" : "All Statuses"}</option>
              ${["pending", "confirmed", "processing", "shipped", "delivered"].map((s) => `<option value="${s}">${s}</option>`).join("")}
            </select>
          </div>
        </div>
        <div class="card">
          <div id="vo-table-wrap">${Components.escapeHtml(I18n.t("loading"))}</div>
          <div id="vo-pagination"></div>
        </div>
      `,
    });

    async function loadOrders() {
      const tableWrap = document.getElementById("vo-table-wrap");
      const pagWrap = document.getElementById("vo-pagination");
      const res = await ApiServices.vendor.listOrders({
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
          { key: "total_amount", label: ar ? "الإجمالي" : "Total", render: (o) => `${Components.escapeHtml(o.total_amount ?? o.total ?? 0)} ${Components.escapeHtml(o.currency || "SAR")}` },
          { key: "status", label: I18n.t("status"), render: (o) => Components.statusBadge(o.status) },
          {
            key: "actions",
            label: I18n.t("actions"),
            render: (o) => `
              <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
                <select class="form-control" style="padding:4px 8px;width:auto" onchange="window.__vendorOrderStatus('${Components.escapeHtml(o.id)}', this.value)">
                  ${["pending", "confirmed", "processing", "shipped", "delivered"].map((s) => `<option value="${s}" ${o.status === s ? "selected" : ""}>${s}</option>`).join("")}
                </select>
                <button class="btn btn-outline btn-sm" onclick="window.__vendorInvoice('${Components.escapeHtml(o.id)}')">🧾 ${ar ? "الفاتورة" : "Invoice"}</button>
              </div>
            `,
          },
        ],
      });
      const meta = (res.meta && res.meta.pagination) || { page: state.page, limit: state.limit, total: res.data && res.data.total };
      Pagination.mount(pagWrap, meta, (p) => { state.page = p; loadOrders(); });
    }

    document.getElementById("vo-search").addEventListener("input", (e) => {
      state.search = e.target.value.trim();
      state.page = 1;
      loadOrders();
    });
    document.getElementById("vo-status").addEventListener("change", (e) => {
      state.status = e.target.value;
      state.page = 1;
      loadOrders();
    });

    window.__vendorOrderStatus = async (id, status) => {
      const r = await ApiServices.vendor.updateOrderStatus(id, status);
      if (r.success) {
        Toast.success(ar ? "تم تحديث حالة الطلب" : "Order status updated");
        loadOrders();
      } else {
        Toast.error((r.error && r.error.message) || "Failed");
      }
    };
    window.__vendorInvoice = async (id) => {
      const r = await ApiServices.vendor.getOrderInvoice(id);
      if (r.success && r.data) Modal.printable((ar ? "فاتورة #" : "Invoice #") + id, r.data.printable_html);
    };

    await loadOrders();
  }, { requiresAuth: true, roles: ["vendor", "super_admin"] });
})();
