/**
 * public/js/components.js
 * مكونات واجهة المستخدم القابلة لإعادة الاستخدام.
 */
(function () {
  function escapeHtml(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function getNavByRole(role) {
    const common = [
      { path: "/dashboard", label: I18n.t("dashboard"), icon: "📊" },
    ];
    const roleMenus = {
      super_admin: [
        { path: "/admin/users", label: I18n.t("nav_users"), icon: "👥" },
        { path: "/admin/tenants", label: I18n.t("nav_tenants"), icon: "🏢" },
        { path: "/admin/orders", label: I18n.t("nav_orders"), icon: "📦" },
        { path: "/admin/products", label: I18n.t("nav_products"), icon: "🛍️" },
        { path: "/admin/reports", label: I18n.t("nav_reports"), icon: "📑" },
        { path: "/admin/integrations", label: I18n.t("nav_integrations"), icon: "🌐" },
        { path: "/admin/settings", label: I18n.t("nav_settings"), icon: "⚙️" },
        { path: "/admin/audit-logs", label: I18n.t("nav_audit"), icon: "🛡️" },
      ],
      vendor: [
        { path: "/vendor/products", label: I18n.t("nav_v_products"), icon: "🛍️" },
        { path: "/vendor/orders", label: I18n.t("nav_v_orders"), icon: "📦" },
        { path: "/vendor/shipments", label: I18n.t("nav_v_shipments"), icon: "🚚" },
        { path: "/vendor/payouts", label: I18n.t("nav_v_payouts"), icon: "💳" },
        { path: "/vendor/reviews", label: I18n.t("nav_v_reviews"), icon: "⭐" },
        { path: "/vendor/reports", label: I18n.t("nav_reports"), icon: "📑" },
      ],
      moderator: [
        { path: "/moderator/reports", label: I18n.t("nav_m_reports"), icon: "🚩" },
        { path: "/moderator/posts", label: I18n.t("nav_m_posts"), icon: "📝" },
        { path: "/moderator/reviews", label: I18n.t("nav_m_reviews"), icon: "⭐" },
        { path: "/moderator/tickets", label: I18n.t("nav_m_tickets"), icon: "🎫" },
        { path: "/moderator/activity-logs", label: I18n.t("nav_m_activity"), icon: "📜" },
      ],
      staff: [
        { path: "/staff/orders", label: I18n.t("nav_s_orders"), icon: "📦" },
        { path: "/staff/shipments", label: I18n.t("nav_s_shipments"), icon: "🚚" },
        { path: "/staff/inventory", label: I18n.t("nav_s_inventory"), icon: "🏬" },
        { path: "/staff/tickets", label: I18n.t("nav_s_tickets"), icon: "🎧" },
        { path: "/staff/tasks", label: I18n.t("nav_s_tasks"), icon: "✅" },
      ],
      customer: [
        { path: "/customer/orders", label: I18n.t("nav_c_orders"), icon: "🛍️" },
        { path: "/customer/shipments", label: I18n.t("nav_c_shipments"), icon: "🚚" },
        { path: "/customer/addresses", label: I18n.t("nav_c_addresses"), icon: "📍" },
        { path: "/customer/wishlist", label: I18n.t("nav_c_wishlist"), icon: "❤️" },
        { path: "/customer/wallet", label: I18n.t("nav_c_wallet"), icon: "👛" },
        { path: "/customer/reviews", label: I18n.t("nav_c_reviews"), icon: "⭐" },
      ],
    };

    const shared = [
      { path: "/", label: I18n.t("pub_storefront"), icon: "🌐" },
      { path: "/notifications", label: I18n.t("notifications"), icon: "🔔" },
      { path: "/messages", label: I18n.t("messages"), icon: "💬" },
      { path: "/tickets", label: I18n.t("tickets"), icon: "🎫" },
      { path: "/media", label: I18n.t("nav_media"), icon: "🖼️" },
      { path: "/profile", label: I18n.t("profile"), icon: "👤" },
    ];

    return { primary: [...common, ...(roleMenus[role] || [])], shared };
  }

  function layout(opts) {
    const role = Auth.getRole() || "customer";
    const session = Auth.getSession() || {};
    const roleLabel = I18n.t("role_" + role);
    const menus = getNavByRole(role);
    const cur = Router.getCurrentPath();

    return `
      <div class="app-shell">
        <aside class="sidebar" id="sidebar">
          <div class="sidebar-header">
            <h2>${escapeHtml(I18n.t("app_name"))}</h2>
            <div class="role">${escapeHtml(session.full_name || session.email || "")} · ${escapeHtml(roleLabel)}</div>
          </div>
          ${menus.primary.map((item) => `
            <a class="nav-item ${cur === item.path ? "active" : ""}" href="#${item.path}" onclick="document.getElementById('sidebar').classList.remove('open')">
              <span>${item.icon}</span><span>${escapeHtml(item.label)}</span>
            </a>
          `).join("")}
          <div class="sidebar-section">${escapeHtml(I18n.getLocale() === "ar" ? "حسابي والتواصل" : "Account & Comms")}</div>
          ${menus.shared.map((item) => `
            <a class="nav-item ${cur === item.path ? "active" : ""}" href="#${item.path}" onclick="document.getElementById('sidebar').classList.remove('open')">
              <span>${item.icon}</span><span>${escapeHtml(item.label)}</span>
            </a>
          `).join("")}
          <div style="margin-top:auto;padding:16px 20px;">
            <button class="btn btn-ghost" style="width:100%" onclick="Auth.logout()">
              🚪 ${escapeHtml(I18n.t("logout"))}
            </button>
          </div>
        </aside>
        <main class="main-content">
          <div class="topbar">
            <div style="display:flex;gap:12px;align-items:center">
              <button class="theme-toggle mobile-toggle" onclick="document.getElementById('sidebar').classList.toggle('open')">☰</button>
              <h1>${escapeHtml(opts.title || "")}</h1>
            </div>
            <div class="topbar-actions">
              <button class="theme-toggle" onclick="Theme.cycleTheme();this.textContent=Theme.getTheme()==='light'?'☀️':Theme.getTheme()==='dark'?'🌙':'✨'">${Theme.getTheme() === "light" ? "☀️" : Theme.getTheme() === "dark" ? "🌙" : "✨"}</button>
              <button class="theme-toggle" onclick="I18n.setLocale(I18n.getLocale()==='ar'?'en':'ar');Router.resolve()">${I18n.getLocale() === "ar" ? "EN" : "AR"}</button>
            </div>
          </div>
          <div id="page-content">${opts.content || ""}</div>
        </main>
      </div>
      <div id="modal-root"></div>
      <div id="toast-root" class="toast-container"></div>
    `;
  }

  function statsCard(value, label) {
    return `<div class="stat-card"><div class="stat-value">${escapeHtml(value)}</div><div class="stat-label">${escapeHtml(label)}</div></div>`;
  }

  function alert(type, message) {
    return `<div class="alert alert-${escapeHtml(type)}">${escapeHtml(message)}</div>`;
  }

  function badge(text, type) {
    return `<span class="badge badge-${escapeHtml(type || "pending")}">${escapeHtml(text)}</span>`;
  }

  function statusBadge(status) {
    const s = String(status || "").toLowerCase();
    const good = ["active", "ready", "delivered", "approved", "resolved", "completed", "published", "paid"];
    const bad = ["suspended", "cancelled", "rejected", "hidden", "blocked", "returned", "closed"];
    const info = ["shipped", "in_transit", "processing", "in_progress", "packed", "confirmed", "out_for_delivery"];
    const type = good.includes(s) ? "success" : bad.includes(s) ? "danger" : info.includes(s) ? "info" : "pending";
    return badge(s || "—", type);
  }

  function toast(message, type) {
    if (window.Toast && Toast.show) return Toast.show(message, type);
    let root = document.getElementById("toast-root");
    if (!root) {
      root = document.createElement("div");
      root.id = "toast-root";
      root.className = "toast-container";
      document.body.appendChild(root);
    }
    const el = document.createElement("div");
    el.className = "toast toast-" + (type || "success");
    el.textContent = message;
    root.appendChild(el);
    setTimeout(() => { el.remove(); }, 3500);
  }

  function openModal(opts) {
    if (window.Modal && Modal.open) return Modal.open(opts);
  }

  function closeModal() {
    if (window.Modal && Modal.close) return Modal.close();
  }

  function openPrintableModal(title, htmlContent) {
    if (window.Modal && Modal.printable) return Modal.printable(title, htmlContent);
  }

  window.Components = {
    layout,
    statsCard,
    alert,
    badge,
    statusBadge,
    toast,
    openModal,
    closeModal,
    openPrintableModal,
    escapeHtml,
    getNavByRole,
  };
})();
