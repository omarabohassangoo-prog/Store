/**
 * public/js/pages/vendor/payouts.js
 * صفحة إعدادات متجر التاجر وطلبات وسجل المدفوعات.
 */
(function () {
  Router.add("/vendor/payouts", async (root) => {
    if (!Guards.requireRole(root, ["vendor", "super_admin"])) return;
    const ar = I18n.getLocale() === "ar";
    const state = { page: 1, limit: 10 };

    root.innerHTML = Components.layout({
      title: I18n.t("nav_v_payouts"),
      content: `<div id="vpay-root">${Components.escapeHtml(I18n.t("loading"))}</div>`,
    });

    const storeRes = await ApiServices.vendor.getStore();
    const store = (storeRes.success && storeRes.data) || {};

    document.getElementById("vpay-root").innerHTML = `
      <div class="grid-2">
        <div class="card">
          <h3 class="card-title">${ar ? "بيانات المتجر" : "Store Settings"}</h3>
          <form id="vst-form">
            ${Forms.renderFields([
              { name: "name", label: ar ? "اسم المتجر" : "Store Name", value: store.name || "", required: true },
              { name: "description", label: ar ? "وصف المتجر" : "Description", value: store.description || "" },
            ])}
            <button class="btn" type="submit">${Components.escapeHtml(I18n.t("save"))}</button>
          </form>
        </div>
        <div class="card">
          <h3 class="card-title">${ar ? "طلب سحب أرباح" : "Request Payout"}</h3>
          <form id="vp-req-form">
            ${Forms.renderFields([
              { name: "amount", label: ar ? "المبلغ (SAR)" : "Amount (SAR)", type: "number", required: true, placeholder: "250" },
              { name: "iban", label: "IBAN", placeholder: "SA0000000000000000000000" },
            ])}
            <button class="btn" type="submit">${ar ? "إرسال طلب السحب" : "Request Payout"}</button>
          </form>
        </div>
      </div>
      <div class="card mt-2">
        <h3 class="card-title">${ar ? "سجل المدفوعات" : "Payout History"}</h3>
        <div id="vpay-table-wrap">${Components.escapeHtml(I18n.t("loading"))}</div>
        <div id="vpay-pagination"></div>
      </div>
    `;

    async function loadPayouts() {
      const tableWrap = document.getElementById("vpay-table-wrap");
      const pagWrap = document.getElementById("vpay-pagination");
      const res = await ApiServices.vendor.getPayouts({ page: state.page, limit: state.limit });
      if (!res.success) {
        tableWrap.innerHTML = Components.alert("error", (res.error && res.error.message) || "Failed");
        return;
      }
      const items = (res.data && res.data.items) || [];
      DataTable.mount(tableWrap, {
        rows: items,
        columns: [
          { key: "id", label: "ID" },
          { key: "amount", label: ar ? "المبلغ" : "Amount", render: (p) => `${Components.escapeHtml(p.amount ?? 0)} ${Components.escapeHtml(p.currency || "SAR")}` },
          { key: "status", label: I18n.t("status"), render: (p) => Components.statusBadge(p.status || "pending") },
          { key: "created_at", label: I18n.t("created_at") },
        ],
      });
      const meta = (res.meta && res.meta.pagination) || { page: state.page, limit: state.limit, total: res.data && res.data.total };
      Pagination.mount(pagWrap, meta, (p) => { state.page = p; loadPayouts(); });
    }

    document.getElementById("vst-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const check = Forms.validate(e.target, { name: { required: true } });
      if (!check.valid) return;
      const r = await ApiServices.vendor.updateStore({ ...check.values, status: "active" });
      if (r.success) Toast.success(ar ? "تم تحديث بيانات المتجر" : "Store updated");
    });

    document.getElementById("vp-req-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const check = Forms.validate(e.target, { amount: { required: true, min: 10 } });
      if (!check.valid) return;
      const r = await ApiServices.vendor.requestPayout({ ...check.values, currency: "SAR" });
      if (r.success) {
        Toast.success(ar ? "تم إرسال طلب السحب" : "Payout requested");
        e.target.reset();
        loadPayouts();
      } else {
        Toast.error((r.error && r.error.message) || "Failed");
      }
    });

    await loadPayouts();
  }, { requiresAuth: true, roles: ["vendor", "super_admin"] });
})();
