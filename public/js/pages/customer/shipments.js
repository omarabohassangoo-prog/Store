/**
 * public/js/pages/customer/shipments.js
 * صفحة تتبع الشحنات للعميل.
 */
(function () {
  Router.add("/customer/shipments", async (root) => {
    if (!Guards.requireRole(root, ["customer", "super_admin"])) return;
    const ar = I18n.getLocale() === "ar";
    const state = { page: 1, limit: 10, search: "" };

    root.innerHTML = Components.layout({
      title: I18n.t("nav_c_shipments"),
      content: `
        <div class="toolbar">
          <input class="form-control" id="cs-search" style="width:220px" placeholder="${Components.escapeHtml(I18n.t("search"))}">
        </div>
        <div class="card">
          <div id="cs-table-wrap">${Components.escapeHtml(I18n.t("loading"))}</div>
          <div id="cs-pagination"></div>
        </div>
      `,
    });

    async function loadShipments() {
      const tableWrap = document.getElementById("cs-table-wrap");
      const pagWrap = document.getElementById("cs-pagination");
      const res = await ApiServices.customer.listShipments({ page: state.page, limit: state.limit, search: state.search || undefined });
      if (!res.success) {
        tableWrap.innerHTML = Components.alert("error", (res.error && res.error.message) || "Failed");
        return;
      }
      const items = (res.data && res.data.items) || [];
      DataTable.mount(tableWrap, {
        rows: items,
        columns: [
          { key: "id", label: "ID" },
          { key: "tracking_number", label: ar ? "رقم التتبع" : "Tracking #", render: (s) => Components.escapeHtml(s.tracking_number || "—") },
          { key: "carrier", label: ar ? "شركة الشحن" : "Carrier", render: (s) => Components.escapeHtml(s.carrier || "SouqExpress") },
          { key: "status", label: I18n.t("status"), render: (s) => Components.statusBadge(s.status) },
          {
            key: "actions",
            label: I18n.t("actions"),
            render: (s) => `<button class="btn btn-outline btn-sm" onclick="window.__trackCustShp('${Components.escapeHtml(s.id)}')">📍 ${ar ? "تتبع" : "Track"}</button>`,
          },
        ],
      });
      const meta = (res.meta && res.meta.pagination) || { page: state.page, limit: state.limit, total: res.data && res.data.total };
      Pagination.mount(pagWrap, meta, (p) => { state.page = p; loadShipments(); });
    }

    document.getElementById("cs-search").addEventListener("input", (e) => {
      state.search = e.target.value.trim();
      state.page = 1;
      loadShipments();
    });

    window.__trackCustShp = async (id) => {
      const r = await ApiServices.customer.trackShipment(id);
      if (r.success && r.data) {
        const events = r.data.tracking_events || [];
        Modal.open({
          title: (ar ? "تتبع الشحنة " : "Track Shipment ") + id,
          bodyHtml: events.length === 0
            ? `<p class="empty-state">${Components.escapeHtml(I18n.t("no_data"))}</p>`
            : events.map((ev) => `<div class="alert alert-info">${Components.escapeHtml(ev.status)} — ${Components.escapeHtml(ev.carrier || "")} (${Components.escapeHtml(ev.timestamp || "")})</div>`).join(""),
        });
      }
    };

    await loadShipments();
  }, { requiresAuth: true, roles: ["customer", "super_admin"] });
})();
