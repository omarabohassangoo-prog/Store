/**
 * public/js/pages/dashboard.js
 * لوحة التحكم الرئيسية لجميع الأدوار.
 */
(function () {
  const STATS_BY_ROLE = {
    super_admin: [
      { key: "total_users", label: "stats_users" },
      { key: "total_orders", label: "stats_orders" },
      { key: "total_products", label: "stats_products" },
      { key: "total_revenue", label: "stats_revenue" },
    ],
    vendor: [
      { key: "total_products", label: "stats_products" },
      { key: "total_orders", label: "stats_orders" },
    ],
    moderator: [
      { key: "pending_reports", label: "stats_reports" },
      { key: "posts_count", label: "stats_posts" },
      { key: "reviews_count", label: "stats_reviews" },
    ],
    staff: [
      { key: "orders_count", label: "stats_orders" },
      { key: "shipments_count", label: "stats_shipments" },
      { key: "tasks_count", label: "stats_tasks" },
    ],
    customer: [
      { key: "orders_count", label: "stats_orders" },
    ],
  };

  Router.add("/dashboard", async (root) => {
    const role = Auth.getRole() || "customer";
    const session = Auth.getSession() || {};
    const content = `
      <div id="dash-loading">${Components.escapeHtml(I18n.t("loading"))}</div>
      <div id="dash-content" class="hidden"></div>
    `;
    root.innerHTML = Components.layout({ title: I18n.t("dashboard"), content });

    const path = role === "super_admin" ? "/admin/stats" : `/${role}/stats`;
    const res = await ApiClient.get(path);
    const contentEl = document.getElementById("dash-content");
    const loadingEl = document.getElementById("dash-loading");
    loadingEl.classList.add("hidden");
    contentEl.classList.remove("hidden");

    if (!res.success) {
      contentEl.innerHTML = Components.alert("error", (res.error && res.error.message) || "Failed to load stats");
      return;
    }

    const stats = res.data || {};
    const cards = (STATS_BY_ROLE[role] || []).map((s) =>
      Components.statsCard(stats[s.key] ?? 0, I18n.t(s.label))
    ).join("");

    const menus = Components.getNavByRole(role).primary.filter((m) => m.path !== "/dashboard");

    contentEl.innerHTML = `
      <div class="card">
        <h2 class="card-title">
          <span>${Components.escapeHtml(I18n.t("welcome"))} ${Components.escapeHtml(session.full_name || "")}</span>
          ${Components.badge(I18n.t("role_" + role), "info")}
        </h2>
        <p style="color:var(--fg-muted);font-size:0.9rem">
          ${Components.escapeHtml(I18n.t("app_name"))} · ${Components.escapeHtml(new Date().toLocaleDateString(I18n.getLocale()))}
        </p>
      </div>
      <div class="stats-grid mt-2">${cards}</div>
      <div class="card">
        <h3 class="card-title">${Components.escapeHtml(I18n.getLocale() === "ar" ? "الوصول السريع لأدوات الدور" : "Quick Workspace Actions")}</h3>
        <div class="grid-3">
          ${menus.map((m) => `
            <a href="#${m.path}" class="card" style="display:flex;align-items:center;gap:10px;padding:14px;text-decoration:none;color:var(--fg)">
              <span style="font-size:1.3rem">${m.icon}</span>
              <span style="font-weight:600">${Components.escapeHtml(m.label)}</span>
            </a>
          `).join("")}
        </div>
      </div>
    `;
  }, { requiresAuth: true });
})();
