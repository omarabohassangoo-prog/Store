/**
 * public/js/pages/staff/shipments.js
 * صفحة إدارة الشحنات لموظفي العمليات.
 */
(function () {
  Router.add("/staff/shipments", async (root) => {
    if (!Guards.requireRole(root, ["staff", "super_admin"])) return;
    const ar = I18n.getLocale() === "ar";
    const state = { page: 1, limit: 10, search: "", status: "" };

    root.innerHTML = Components.layout({
      title: I18n.t("nav_s_shipments"),
      content: `
        <div class="toolbar">
          <div class="toolbar-group">
            <input class="form-control" id="ss-search" style="width:220px" placeholder="${Components.escapeHtml(I18n.t("search"))}">
            <select class="form-control" id="ss-status" style="width:auto">
              <option value="">${ar ? "كل الحالات" : "All Statuses"}</option>
              ${["created", "in_transit", "out_for_delivery", "delivered", "returned"].map((s) => `<option value="${s}">${s}</option>`).join("")}
            </select>
          </div>
          <button class="btn btn-sm" id="ss-add-btn">➕ ${ar ? "إنشاء شحنة" : "Create Shipment"}</button>
        </div>
        <div class="card">
          <div id="ss-table-wrap">${Components.escapeHtml(I18n.t("loading"))}</div>
          <div id="ss-pagination"></div>
        </div>
      `,
    });

    async function loadShipments() {
      const tableWrap = document.getElementById("ss-table-wrap");
      const pagWrap = document.getElementById("ss-pagination");
      const res = await ApiServices.staff.listShipments({
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
          { key: "order_id", label: "Order ID" },
          { key: "tracking_number", label: ar ? "رقم التتبع" : "Tracking #", render: (s) => Components.escapeHtml(s.tracking_number || "—") },
          { key: "status", label: I18n.t("status"), render: (s) => Components.statusBadge(s.status) },
          {
            key: "actions",
            label: I18n.t("actions"),
            render: (s) => `
              <select class="form-control" style="padding:4px 8px;width:auto;display:inline-block" onchange="window.__staffShipStatus('${Components.escapeHtml(s.id)}', this.value, '${Components.escapeHtml(s.tracking_number || "")}')">
                ${["created", "in_transit", "out_for_delivery", "delivered", "returned"].map((st) => `<option value="${st}" ${s.status === st ? "selected" : ""}>${st}</option>`).join("")}
              </select>
            `,
          },
        ],
      });
      const meta = (res.meta && res.meta.pagination) || { page: state.page, limit: state.limit, total: res.data && res.data.total };
      Pagination.mount(pagWrap, meta, (p) => { state.page = p; loadShipments(); });
    }

    document.getElementById("ss-search").addEventListener("input", (e) => {
      state.search = e.target.value.trim();
      state.page = 1;
      loadShipments();
    });
    document.getElementById("ss-status").addEventListener("change", (e) => {
      state.status = e.target.value;
      state.page = 1;
      loadShipments();
    });

    document.getElementById("ss-add-btn").addEventListener("click", () => {
      Modal.open({
        title: ar ? "إنشاء شحنة جديدة" : "Create Shipment",
        bodyHtml: `
          <form id="ss-form">
            ${Forms.renderFields([
              { name: "order_id", label: "Order ID", required: true },
              { name: "tracking_number", label: ar ? "رقم التتبع" : "Tracking Number", required: true },
              { name: "carrier", label: ar ? "شركة الشحن" : "Carrier", value: "SouqExpress", required: true },
            ])}
            <button class="btn" type="submit">${Components.escapeHtml(I18n.t("create"))}</button>
          </form>
        `,
      });
      document.getElementById("ss-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const check = Forms.validate(e.target, { order_id: { required: true }, tracking_number: { required: true } });
        if (!check.valid) return;
        const r = await ApiServices.staff.createShipment(check.values);
        if (r.success) {
          Modal.close();
          Toast.success(ar ? "تم إنشاء الشحنة" : "Shipment created");
          loadShipments();
        }
      });
    });

    window.__staffShipStatus = async (id, status, tracking_number) => {
      const r = await ApiServices.staff.updateShipmentStatus(id, { status, tracking_number });
      if (r.success) {
        Toast.success(ar ? "تم تحديث الشحنة" : "Shipment updated");
        loadShipments();
      }
    };

    await loadShipments();
  }, { requiresAuth: true, roles: ["staff", "super_admin"] });
})();
