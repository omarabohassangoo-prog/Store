/**
 * public/js/pages/staff/inventory.js
 * صفحة إدارة المخزون والتسوية لموظفي العمليات.
 */
(function () {
  Router.add("/staff/inventory", async (root) => {
    if (!Guards.requireRole(root, ["staff", "super_admin"])) return;
    const ar = I18n.getLocale() === "ar";
    const state = { page: 1, limit: 10, search: "" };

    root.innerHTML = Components.layout({
      title: I18n.t("nav_s_inventory"),
      content: `
        <div class="toolbar">
          <input class="form-control" id="si-search" style="width:220px" placeholder="${Components.escapeHtml(I18n.t("search"))}">
        </div>
        <div class="card">
          <div id="si-table-wrap">${Components.escapeHtml(I18n.t("loading"))}</div>
          <div id="si-pagination"></div>
        </div>
      `,
    });

    async function loadInventory() {
      const tableWrap = document.getElementById("si-table-wrap");
      const pagWrap = document.getElementById("si-pagination");
      const res = await ApiServices.staff.listInventory({ page: state.page, limit: state.limit, search: state.search || undefined });
      if (!res.success) {
        tableWrap.innerHTML = Components.alert("error", (res.error && res.error.message) || "Failed");
        return;
      }
      const items = (res.data && res.data.items) || [];
      DataTable.mount(tableWrap, {
        rows: items,
        columns: [
          { key: "id", label: "ID" },
          { key: "sku", label: "SKU" },
          { key: "title", label: ar ? "المنتج" : "Product", render: (inv) => Components.escapeHtml(inv.title || inv.product_id || "") },
          { key: "stock", label: ar ? "الكمية" : "Stock", render: (inv) => Components.escapeHtml(inv.stock ?? 0) },
          { key: "last_delta", label: ar ? "آخر تسوية" : "Last Delta", render: (inv) => Components.escapeHtml(inv.last_delta ?? 0) },
          {
            key: "actions",
            label: I18n.t("actions"),
            render: (inv) => `<button class="btn btn-outline btn-sm" onclick="window.__adjStaffInv('${Components.escapeHtml(inv.id)}')">± ${ar ? "تسوية" : "Adjust"}</button>`,
          },
        ],
      });
      const meta = (res.meta && res.meta.pagination) || { page: state.page, limit: state.limit, total: res.data && res.data.total };
      Pagination.mount(pagWrap, meta, (p) => { state.page = p; loadInventory(); });
    }

    document.getElementById("si-search").addEventListener("input", (e) => {
      state.search = e.target.value.trim();
      state.page = 1;
      loadInventory();
    });

    window.__adjStaffInv = (id) => {
      Modal.open({
        size: "sm",
        title: ar ? "تسوية المخزون" : "Adjust Inventory",
        bodyHtml: `
          <form id="ai-form">
            ${Forms.renderFields([
              { name: "delta", label: ar ? "التغيير (+/-)" : "Delta (+/-)", type: "number", required: true },
              { name: "reason", label: ar ? "السبب" : "Reason", required: true },
            ])}
            <button class="btn" type="submit">${Components.escapeHtml(I18n.t("save"))}</button>
          </form>
        `,
      });
      document.getElementById("ai-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const check = Forms.validate(e.target, { delta: { required: true }, reason: { required: true } });
        if (!check.valid) return;
        const r = await ApiServices.staff.adjustInventory(id, Number(check.values.delta), check.values.reason);
        if (r.success) {
          Modal.close();
          Toast.success(ar ? "تمت تسوية المخزون" : "Inventory adjusted");
          loadInventory();
        }
      });
    };

    await loadInventory();
  }, { requiresAuth: true, roles: ["staff", "super_admin"] });
})();
