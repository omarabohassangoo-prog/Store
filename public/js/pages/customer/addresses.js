/**
 * public/js/pages/customer/addresses.js
 * صفحة إدارة عناوين التوصيل للعميل.
 */
(function () {
  Router.add("/customer/addresses", async (root) => {
    if (!Guards.requireRole(root, ["customer", "super_admin"])) return;
    const ar = I18n.getLocale() === "ar";
    const state = { page: 1, limit: 10 };

    root.innerHTML = Components.layout({
      title: I18n.t("nav_c_addresses"),
      content: `
        <div class="toolbar">
          <button class="btn btn-sm" id="ca-add">➕ ${ar ? "إضافة عنوان جديد" : "Add Address"}</button>
        </div>
        <div class="card">
          <div id="ca-table-wrap">${Components.escapeHtml(I18n.t("loading"))}</div>
          <div id="ca-pagination"></div>
        </div>
      `,
    });

    async function loadAddresses() {
      const tableWrap = document.getElementById("ca-table-wrap");
      const pagWrap = document.getElementById("ca-pagination");
      const res = await ApiServices.customer.listAddresses({ page: state.page, limit: state.limit });
      if (!res.success) {
        tableWrap.innerHTML = Components.alert("error", (res.error && res.error.message) || "Failed");
        return;
      }
      const items = (res.data && res.data.items) || [];
      window.__custAddresses = items;
      DataTable.mount(tableWrap, {
        rows: items,
        columns: [
          { key: "id", label: "ID" },
          { key: "label", label: ar ? "التسمية" : "Label", render: (a) => Components.escapeHtml(a.label || (ar ? "المنزل" : "Home")) },
          { key: "city", label: ar ? "المدينة" : "City" },
          { key: "line1", label: ar ? "العنوان التفصيلي" : "Address" },
          {
            key: "actions",
            label: I18n.t("actions"),
            render: (a) => `
              <div style="display:flex;gap:6px">
                <button class="btn btn-outline btn-sm" onclick="window.__editCustAddr('${Components.escapeHtml(a.id)}')">${Components.escapeHtml(I18n.t("edit"))}</button>
                <button class="btn btn-danger btn-sm" onclick="window.__delCustAddr('${Components.escapeHtml(a.id)}')">${Components.escapeHtml(I18n.t("delete"))}</button>
              </div>
            `,
          },
        ],
      });
      const meta = (res.meta && res.meta.pagination) || { page: state.page, limit: state.limit, total: res.data && res.data.total };
      Pagination.mount(pagWrap, meta, (p) => { state.page = p; loadAddresses(); });
    }

    document.getElementById("ca-add").addEventListener("click", () => {
      Modal.open({
        title: ar ? "إضافة عنوان جديد" : "New Address",
        bodyHtml: `
          <form id="ca-form">
            ${Forms.renderFields([
              { name: "label", label: ar ? "التسمية (مثال: المنزل)" : "Label (e.g. Home)", value: ar ? "المنزل" : "Home" },
              { name: "city", label: ar ? "المدينة" : "City", required: true },
              { name: "line1", label: ar ? "العنوان التفصيلي" : "Street Address", required: true },
            ])}
            <button class="btn" type="submit">${Components.escapeHtml(I18n.t("save"))}</button>
          </form>
        `,
      });
      document.getElementById("ca-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const check = Forms.validate(e.target, { city: { required: true }, line1: { required: true } });
        if (!check.valid) return;
        const r = await ApiServices.customer.createAddress(check.values);
        if (r.success) {
          Modal.close();
          Toast.success(ar ? "تمت إضافة العنوان" : "Address added");
          loadAddresses();
        }
      });
    });

    window.__editCustAddr = (id) => {
      const a = (window.__custAddresses || []).find((x) => x.id === id);
      if (!a) return;
      Modal.open({
        title: ar ? "تعديل العنوان" : "Edit Address",
        bodyHtml: `
          <form id="ca-edit-form">
            ${Forms.renderFields([
              { name: "label", label: ar ? "التسمية" : "Label", value: a.label || "" },
              { name: "city", label: ar ? "المدينة" : "City", value: a.city || "", required: true },
              { name: "line1", label: ar ? "العنوان التفصيلي" : "Street Address", value: a.line1 || "", required: true },
            ])}
            <button class="btn" type="submit">${Components.escapeHtml(I18n.t("save"))}</button>
          </form>
        `,
      });
      document.getElementById("ca-edit-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const check = Forms.validate(e.target, { city: { required: true }, line1: { required: true } });
        if (!check.valid) return;
        const r = await ApiServices.customer.updateAddress(id, check.values);
        if (r.success) {
          Modal.close();
          Toast.success(ar ? "تم تحديث العنوان" : "Address updated");
          loadAddresses();
        }
      });
    };

    window.__delCustAddr = async (id) => {
      const ok = await Modal.confirm({ danger: true, message: ar ? "هل تريد حذف هذا العنوان؟" : "Delete this address?" });
      if (!ok) return;
      const r = await ApiServices.customer.deleteAddress(id);
      if (r.success) {
        Toast.success(ar ? "تم حذف العنوان" : "Address deleted");
        loadAddresses();
      }
    };

    await loadAddresses();
  }, { requiresAuth: true, roles: ["customer", "super_admin"] });
})();
