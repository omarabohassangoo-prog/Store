/**
 * public/js/pages/admin/tenants.js
 * صفحة إدارة المستأجرين والمتاجر لمدير النظام.
 */
(function () {
  Router.add("/admin/tenants", async (root) => {
    if (!Guards.requireRole(root, ["super_admin"])) return;
    const ar = I18n.getLocale() === "ar";
    const state = { page: 1, limit: 10, search: "", status: "", sort_by: "created_at", sort_dir: "desc" };

    root.innerHTML = Components.layout({
      title: I18n.t("nav_tenants"),
      content: `
        <div class="toolbar">
          <div class="toolbar-group">
            <input class="form-control" id="at-search" style="width:220px" placeholder="${Components.escapeHtml(I18n.t("search"))}">
            <select class="form-control" id="at-status" style="width:auto">
              <option value="">${ar ? "كل الحالات" : "All Statuses"}</option>
              <option value="active">${ar ? "نشط" : "Active"}</option>
              <option value="suspended">${ar ? "موقوف" : "Suspended"}</option>
            </select>
          </div>
          <button class="btn btn-sm" id="at-add-btn">➕ ${ar ? "إضافة مستأجر" : "Add Tenant"}</button>
        </div>
        <div class="card">
          <div id="at-table-wrap">${Components.escapeHtml(I18n.t("loading"))}</div>
          <div id="at-pagination"></div>
        </div>
      `,
    });

    async function loadTenants() {
      const tableWrap = document.getElementById("at-table-wrap");
      const pagWrap = document.getElementById("at-pagination");
      const res = await ApiServices.admin.listTenants({
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
      window.__adminTenants = items;

      DataTable.mount(tableWrap, {
        rows: items,
        sortBy: state.sort_by,
        sortDir: state.sort_dir,
        onSort: (k, d) => { state.sort_by = k; state.sort_dir = d; loadTenants(); },
        columns: [
          { key: "id", label: "ID", sortable: true },
          { key: "name", label: ar ? "الاسم" : "Name", sortable: true },
          { key: "slug", label: "Slug", sortable: true },
          { key: "domain", label: "Domain", render: (t) => Components.escapeHtml(t.domain || "—") },
          { key: "status", label: I18n.t("status"), render: (t) => Components.statusBadge(t.status || "active") },
          {
            key: "actions",
            label: I18n.t("actions"),
            render: (t) => `
              <div style="display:flex;gap:6px;flex-wrap:wrap">
                <button class="btn btn-outline btn-sm" onclick="window.__editTenant('${Components.escapeHtml(t.id)}')">${Components.escapeHtml(I18n.t("edit"))}</button>
                <button class="btn ${t.status === "suspended" ? "btn-success" : "btn-danger"} btn-sm" onclick="window.__toggleTenant('${Components.escapeHtml(t.id)}','${t.status === "suspended" ? "active" : "suspended"}')">
                  ${t.status === "suspended" ? (ar ? "تفعيل" : "Activate") : (ar ? "إيقاف" : "Suspend")}
                </button>
              </div>
            `,
          },
        ],
      });
      const meta = (res.meta && res.meta.pagination) || { page: state.page, limit: state.limit, total: res.data && res.data.total };
      Pagination.mount(pagWrap, meta, (p) => { state.page = p; loadTenants(); });
    }

    document.getElementById("at-search").addEventListener("input", (e) => {
      state.search = e.target.value.trim();
      state.page = 1;
      loadTenants();
    });
    document.getElementById("at-status").addEventListener("change", (e) => {
      state.status = e.target.value;
      state.page = 1;
      loadTenants();
    });

    document.getElementById("at-add-btn").addEventListener("click", () => {
      Modal.open({
        title: ar ? "إضافة مستأجر جديد" : "New Tenant",
        bodyHtml: `
          <form id="at-form">
            ${Forms.renderFields([
              { name: "name", label: ar ? "الاسم" : "Name", required: true },
              { name: "slug", label: "Slug", required: true },
              { name: "domain", label: "Domain", placeholder: "store.souqalkul.local" },
            ])}
            <button class="btn" type="submit">${Components.escapeHtml(I18n.t("create"))}</button>
          </form>
        `,
      });
      document.getElementById("at-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const check = Forms.validate(e.target, { name: { required: true }, slug: { required: true } });
        if (!check.valid) return;
        const r = await ApiServices.admin.createTenant({ ...check.values, domain: check.values.domain || null, status: "active" });
        if (r.success) {
          Modal.close();
          Toast.success(ar ? "تمت إضافة المستأجر" : "Tenant created");
          loadTenants();
        } else {
          Toast.error((r.error && r.error.message) || "Failed");
        }
      });
    });

    window.__editTenant = (id) => {
      const t = (window.__adminTenants || []).find((x) => x.id === id);
      if (!t) return;
      Modal.open({
        title: (ar ? "تعديل المستأجر: " : "Edit Tenant: ") + (t.name || t.id),
        bodyHtml: `
          <form id="at-edit-form">
            ${Forms.renderFields([
              { name: "name", label: ar ? "الاسم" : "Name", value: t.name || "", required: true },
              { name: "slug", label: "Slug", value: t.slug || "", required: true },
              { name: "domain", label: "Domain", value: t.domain || "" },
            ])}
            <button class="btn" type="submit">${Components.escapeHtml(I18n.t("save"))}</button>
          </form>
        `,
      });
      document.getElementById("at-edit-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const check = Forms.validate(e.target, { name: { required: true }, slug: { required: true } });
        if (!check.valid) return;
        const r = await ApiServices.admin.updateTenant(id, { ...check.values, domain: check.values.domain || null });
        if (r.success) {
          Modal.close();
          Toast.success(ar ? "تم تحديث المستأجر" : "Tenant updated");
          loadTenants();
        } else {
          Toast.error((r.error && r.error.message) || "Failed");
        }
      });
    };

    window.__toggleTenant = async (id, nextStatus) => {
      const ok = await Modal.confirm({
        danger: nextStatus === "suspended",
        message: nextStatus === "suspended" ? (ar ? "هل تريد إيقاف هذا المستأجر؟" : "Suspend this tenant?") : (ar ? "تفعيل المستأجر؟" : "Activate this tenant?"),
      });
      if (!ok) return;
      const r = await ApiServices.admin.updateTenant(id, { status: nextStatus });
      if (r.success) {
        Toast.success(ar ? "تم تحديث الحالة" : "Status updated");
        loadTenants();
      }
    };

    await loadTenants();
  }, { requiresAuth: true, roles: ["super_admin"] });
})();
