/**
 * public/js/pages/admin/users.js
 * صفحة إدارة المستخدمين والأدوار لمدير النظام.
 */
(function () {
  Router.add("/admin/users", async (root) => {
    if (!Guards.requireRole(root, ["super_admin"])) return;
    const ar = I18n.getLocale() === "ar";
    const state = { page: 1, limit: 10, search: "", user_type: "", status: "", sort_by: "created_at", sort_dir: "desc" };

    root.innerHTML = Components.layout({
      title: I18n.t("nav_users"),
      content: `
        <div class="toolbar">
          <div class="toolbar-group">
            <input class="form-control" id="au-search" style="width:220px" placeholder="${Components.escapeHtml(I18n.t("search"))}">
            <select class="form-control" id="au-role-filter" style="width:auto">
              <option value="">${ar ? "كل الأدوار" : "All Roles"}</option>
              <option value="super_admin">${Components.escapeHtml(I18n.t("role_super_admin"))}</option>
              <option value="moderator">${Components.escapeHtml(I18n.t("role_moderator"))}</option>
              <option value="staff">${Components.escapeHtml(I18n.t("role_staff"))}</option>
              <option value="vendor">${Components.escapeHtml(I18n.t("role_vendor"))}</option>
              <option value="customer">${Components.escapeHtml(I18n.t("role_customer"))}</option>
            </select>
            <select class="form-control" id="au-status-filter" style="width:auto">
              <option value="">${ar ? "كل الحالات" : "All Statuses"}</option>
              <option value="active">${ar ? "نشط" : "Active"}</option>
              <option value="suspended">${ar ? "موقوف" : "Suspended"}</option>
            </select>
          </div>
          <button class="btn btn-sm" id="au-add-btn">➕ ${ar ? "إضافة مستخدم" : "Create User"}</button>
        </div>
        <div class="card">
          <div id="au-table-wrap">${Components.escapeHtml(I18n.t("loading"))}</div>
          <div id="au-pagination"></div>
        </div>
        <div class="card mt-2">
          <h3 class="card-title">${ar ? "سياسات الأدوار" : "Role Policies"}</h3>
          <div id="au-roles-wrap">${Components.escapeHtml(I18n.t("loading"))}</div>
        </div>
      `,
    });

    async function loadUsers() {
      const tableWrap = document.getElementById("au-table-wrap");
      const pagWrap = document.getElementById("au-pagination");
      const res = await ApiServices.admin.listUsers({
        page: state.page,
        limit: state.limit,
        search: state.search || undefined,
        user_type: state.user_type || undefined,
        status: state.status || undefined,
        sort_by: state.sort_by,
        sort_dir: state.sort_dir,
      });

      if (!res.success) {
        tableWrap.innerHTML = Components.alert("error", (res.error && res.error.message) || "Failed to load users");
        pagWrap.innerHTML = "";
        return;
      }

      const items = (res.data && res.data.items) || [];
      window.__adminUsersList = items;

      DataTable.mount(tableWrap, {
        rows: items,
        sortBy: state.sort_by,
        sortDir: state.sort_dir,
        onSort: (key, dir) => {
          state.sort_by = key;
          state.sort_dir = dir;
          loadUsers();
        },
        columns: [
          { key: "id", label: "ID", sortable: true },
          { key: "full_name", label: I18n.t("full_name"), sortable: true },
          { key: "email", label: I18n.t("email"), sortable: true },
          {
            key: "user_type",
            label: ar ? "الدور" : "Role",
            sortable: true,
            render: (u) => Components.badge(I18n.t("role_" + (u.user_type || "customer")), "info"),
          },
          {
            key: "status",
            label: I18n.t("status"),
            sortable: true,
            render: (u) => Components.statusBadge(u.status || "active"),
          },
          {
            key: "actions",
            label: I18n.t("actions"),
            render: (u) => `
              <div style="display:flex;gap:6px;flex-wrap:wrap">
                <button class="btn btn-outline btn-sm" onclick="window.__editAdminUser('${Components.escapeHtml(u.id)}')">${Components.escapeHtml(I18n.t("edit"))}</button>
                <button class="btn ${u.status === "suspended" ? "btn-success" : "btn-danger"} btn-sm" onclick="window.__toggleAdminUser('${Components.escapeHtml(u.id)}','${u.status === "suspended" ? "active" : "suspended"}')">
                  ${u.status === "suspended" ? (ar ? "تفعيل" : "Activate") : (ar ? "إيقاف" : "Suspend")}
                </button>
              </div>
            `,
          },
        ],
      });

      const meta = (res.meta && res.meta.pagination) || { page: state.page, limit: state.limit, total: res.data && res.data.total };
      Pagination.mount(pagWrap, meta, (nextPage) => {
        state.page = nextPage;
        loadUsers();
      });
    }

    async function loadRoles() {
      const rolesWrap = document.getElementById("au-roles-wrap");
      const res = await ApiServices.admin.listRoles();
      const roles = (res.success && Array.isArray(res.data) ? res.data : []) || [];
      DataTable.mount(rolesWrap, {
        rows: roles,
        columns: [
          { key: "role_key", label: ar ? "المفتاح" : "Role", render: (r) => Components.badge(r.role_key, "info") },
          { key: "redirect_url", label: "Redirect" },
          { key: "permissions", label: ar ? "الصلاحيات" : "Permissions", render: (r) => Components.escapeHtml((r.permissions || []).join(", ")) },
          { key: "active", label: I18n.t("status"), render: (r) => Components.statusBadge(r.active ? "active" : "suspended") },
        ],
      });
    }

    document.getElementById("au-search").addEventListener("input", (e) => {
      state.search = e.target.value.trim();
      state.page = 1;
      loadUsers();
    });
    document.getElementById("au-role-filter").addEventListener("change", (e) => {
      state.user_type = e.target.value;
      state.page = 1;
      loadUsers();
    });
    document.getElementById("au-status-filter").addEventListener("change", (e) => {
      state.status = e.target.value;
      state.page = 1;
      loadUsers();
    });

    document.getElementById("au-add-btn").addEventListener("click", () => {
      Modal.open({
        title: ar ? "إنشاء مستخدم جديد" : "Create User",
        bodyHtml: `
          <form id="au-create-form">
            ${Forms.renderFields([
              { name: "full_name", label: I18n.t("full_name"), required: true },
              { name: "email", label: I18n.t("email"), type: "email", required: true },
              { name: "phone", label: I18n.t("phone"), type: "tel" },
              { name: "password", label: I18n.t("password") + " (8+)", type: "password", required: true },
              {
                name: "user_type",
                label: ar ? "الدور" : "Role",
                type: "select",
                value: "customer",
                options: [
                  { value: "customer", label: I18n.t("role_customer") },
                  { value: "vendor", label: I18n.t("role_vendor") },
                  { value: "staff", label: I18n.t("role_staff") },
                  { value: "moderator", label: I18n.t("role_moderator") },
                  { value: "super_admin", label: I18n.t("role_super_admin") },
                ],
              },
            ])}
            <button class="btn" type="submit">${Components.escapeHtml(I18n.t("create"))}</button>
          </form>
        `,
      });
      document.getElementById("au-create-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const check = Forms.validate(e.target, {
          full_name: { required: true },
          email: { required: true, email: true },
          password: { required: true, minLength: 8 },
        });
        if (!check.valid) return;
        const r = await ApiServices.admin.createUser(check.values);
        if (r.success) {
          Modal.close();
          Toast.success(ar ? "تم إنشاء المستخدم بنجاح" : "User created");
          loadUsers();
        } else {
          Toast.error((r.error && r.error.message) || "Failed");
        }
      });
    });

    window.__editAdminUser = (id) => {
      const user = (window.__adminUsersList || []).find((u) => u.id === id);
      if (!user) return;
      Modal.open({
        title: (ar ? "تعديل المستخدم: " : "Edit User: ") + (user.full_name || user.email),
        bodyHtml: `
          <form id="au-edit-form">
            ${Forms.renderFields([
              { name: "full_name", label: I18n.t("full_name"), value: user.full_name || "", required: true },
              { name: "phone", label: I18n.t("phone"), value: user.phone || "" },
              {
                name: "user_type",
                label: ar ? "الدور" : "Role",
                type: "select",
                value: user.user_type || "customer",
                options: [
                  { value: "customer", label: I18n.t("role_customer") },
                  { value: "vendor", label: I18n.t("role_vendor") },
                  { value: "staff", label: I18n.t("role_staff") },
                  { value: "moderator", label: I18n.t("role_moderator") },
                  { value: "super_admin", label: I18n.t("role_super_admin") },
                ],
              },
              {
                name: "status",
                label: I18n.t("status"),
                type: "select",
                value: user.status || "active",
                options: [
                  { value: "active", label: ar ? "نشط" : "Active" },
                  { value: "suspended", label: ar ? "موقوف" : "Suspended" },
                ],
              },
            ])}
            <button class="btn" type="submit">${Components.escapeHtml(I18n.t("save"))}</button>
          </form>
        `,
      });
      document.getElementById("au-edit-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const check = Forms.validate(e.target, { full_name: { required: true } });
        if (!check.valid) return;
        const r = await ApiServices.admin.updateUser(id, check.values);
        if (r.success) {
          Modal.close();
          Toast.success(ar ? "تم تحديث بيانات المستخدم" : "User updated");
          loadUsers();
        } else {
          Toast.error((r.error && r.error.message) || "Update failed");
        }
      });
    };

    window.__toggleAdminUser = async (id, nextStatus) => {
      const ok = await Modal.confirm({
        danger: nextStatus === "suspended",
        message: nextStatus === "suspended"
          ? (ar ? "هل تريد إيقاف هذا المستخدم؟" : "Suspend this user account?")
          : (ar ? "هل تريد تفعيل هذا المستخدم؟" : "Activate this user account?"),
      });
      if (!ok) return;
      const r = await ApiServices.admin.updateUser(id, { status: nextStatus });
      if (r.success) {
        Toast.success(ar ? "تم تحديث الحالة" : "Status updated");
        loadUsers();
      } else {
        Toast.error((r.error && r.error.message) || "Failed");
      }
    };

    await Promise.all([loadUsers(), loadRoles()]);
  }, { requiresAuth: true, roles: ["super_admin"] });
})();
