/**
 * public/js/pages/vendor/reports.js
 * صفحة تقارير مبيعات التاجر.
 */
(function () {
  Router.add("/vendor/reports", async (root) => {
    if (!Guards.requireRole(root, ["vendor", "super_admin"])) return;
    const ar = I18n.getLocale() === "ar";
    const state = { page: 1, limit: 10 };

    root.innerHTML = Components.layout({
      title: I18n.t("nav_reports"),
      content: `
        <div class="toolbar">
          <button class="btn btn-sm" id="vrp-gen">➕ ${ar ? "توليد تقرير مبيعات" : "Generate Sales Report"}</button>
        </div>
        <div class="card">
          <div id="vrp-table-wrap">${Components.escapeHtml(I18n.t("loading"))}</div>
          <div id="vrp-pagination"></div>
        </div>
      `,
    });

    async function loadReports() {
      const tableWrap = document.getElementById("vrp-table-wrap");
      const pagWrap = document.getElementById("vrp-pagination");
      const res = await ApiServices.vendor.listReports({ page: state.page, limit: state.limit });
      if (!res.success) {
        tableWrap.innerHTML = Components.alert("error", (res.error && res.error.message) || "Failed");
        return;
      }
      const items = (res.data && res.data.items) || [];
      window.__vendorReports = items;
      DataTable.mount(tableWrap, {
        rows: items,
        columns: [
          { key: "id", label: "ID" },
          { key: "title", label: ar ? "العنوان" : "Title", render: (r) => Components.escapeHtml(r.title || "Vendor Report") },
          { key: "report_type", label: ar ? "النوع" : "Type" },
          { key: "created_at", label: I18n.t("created_at") },
          {
            key: "actions",
            label: I18n.t("actions"),
            render: (r) => `<button class="btn btn-outline btn-sm" onclick="window.__viewVendorReport('${Components.escapeHtml(r.id)}')">🖨️ ${Components.escapeHtml(I18n.t("print"))}</button>`,
          },
        ],
      });
      const meta = (res.meta && res.meta.pagination) || { page: state.page, limit: state.limit, total: res.data && res.data.total };
      Pagination.mount(pagWrap, meta, (p) => { state.page = p; loadReports(); });
    }

    window.__viewVendorReport = (id) => {
      const item = (window.__vendorReports || []).find((x) => x.id === id);
      if (item) Modal.printable(item.title || "Report", item.printable_html || "<p>Vendor Report</p>");
    };

    document.getElementById("vrp-gen").addEventListener("click", async () => {
      const r = await ApiServices.vendor.generateReport({ title: ar ? "تقرير مبيعات المتجر" : "Vendor Sales Report", report_type: "sales" });
      if (r.success) {
        Toast.success(ar ? "تم توليد التقرير" : "Report generated");
        loadReports();
      }
    });

    await loadReports();
  }, { requiresAuth: true, roles: ["vendor", "super_admin"] });
})();
