/**
 * public/js/pages/vendor/shipments.js
 * صفحة شحنات التاجر.
 */
(function () {
  Router.add("/vendor/shipments", async (root) => {
    if (!Guards.requireRole(root, ["vendor", "super_admin"])) return;
    const ar = I18n.getLocale() === "ar";
    const state = { page: 1, limit: 10, search: "", sort_by: "created_at", sort_dir: "desc" };

    root.innerHTML = Components.layout({
      title: I18n.t("nav_v_shipments"),
      content: `
        <div class="toolbar">
          <div class="toolbar-group">
            <input class="form-control" id="vs-search" style="width:220px" placeholder="${Components.escapeHtml(I18n.t("search"))}">
          </div>
          <button class="btn btn-sm" id="vs-add-btn">➕ ${ar ? "إنشاء شحنة" : "Create Shipment"}</button>
        </div>
        <div class="card">
          <div id="vs-table-wrap">${Components.escapeHtml(I18n.t("loading"))}</div>
          <div id="vs-pagination"></div>
        </div>
      `,
    });

    async function loadShipments() {
      const tableWrap = document.getElementById("vs-table-wrap");
      const pagWrap = document.getElementById("vs-pagination");
      const res = await ApiServices.vendor.listShipments({
        page: state.page,
        limit: state.limit,
        search: state.search || undefined,
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
        onSort: (k, d) => { state.sort_by = k; state.sort_dir = d; loadShipments(); },
        columns: [
          { key: "id", label: "ID", sortable: true },
          { key: "order_id", label: ar ? "رقم الطلب" : "Order ID", sortable: true },
          { key: "tracking_number", label: ar ? "رقم التتبع" : "Tracking #" },
          { key: "carrier", label: ar ? "شركة الشحن" : "Carrier", render: (s) => Components.escapeHtml(s.carrier || "SouqExpress") },
          { key: "status", label: I18n.t("status"), render: (s) => Components.statusBadge(s.status || "created") },
        ],
      });
      const meta = (res.meta && res.meta.pagination) || { page: state.page, limit: state.limit, total: res.data && res.data.total };
      Pagination.mount(pagWrap, meta, (p) => { state.page = p; loadShipments(); });
    }

    document.getElementById("vs-search").addEventListener("input", (e) => {
      state.search = e.target.value.trim();
      state.page = 1;
      loadShipments();
    });

    document.getElementById("vs-add-btn").addEventListener("click", () => {
      Modal.open({
        title: ar ? "إنشاء شحنة جديدة" : "Create Shipment",
        bodyHtml: `
          <form id="vsh-form">
            ${Forms.renderFields([
              { name: "order_id", label: "Order ID", required: true },
              { name: "tracking_number", label: ar ? "رقم التتبع" : "Tracking Number", required: true },
              { name: "carrier", label: ar ? "شركة الشحن" : "Carrier", value: "SMSA Express", required: true },
            ])}
            <button class="btn" type="submit">${Components.escapeHtml(I18n.t("create"))}</button>
          </form>
        `,
      });
      document.getElementById("vsh-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const check = Forms.validate(e.target, { order_id: { required: true }, tracking_number: { required: true } });
        if (!check.valid) return;
        const r = await ApiServices.vendor.createShipment({ ...check.values, status: "created" });
        if (r.success) {
          Modal.close();
          Toast.success(ar ? "تم إنشاء الشحنة" : "Shipment created");
          loadShipments();
        } else {
          Toast.error((r.error && r.error.message) || "Failed");
        }
      });
    });

    await loadShipments();
  }, { requiresAuth: true, roles: ["vendor", "super_admin"] });
})();
