/**
 * public/js/pages/public/layout.js
 * التخطيط العام الموحد (Header / Navbar / Footer) لجميع الصفحات العامة.
 */
(function () {
  function render(opts) {
    const ar = I18n.getLocale() === "ar";
    const cur = Router.getCurrentPath() || "/";
    const isAuth = Auth.isAuthenticated();
    const navItems = [
      { path: "/", label: I18n.t("pub_home") },
      { path: "/shop", label: I18n.t("pub_shop") },
      { path: "/stores", label: I18n.t("pub_stores") },
      { path: "/blog", label: I18n.t("pub_blog") },
      { path: "/track", label: I18n.t("pub_track") },
      { path: "/about", label: I18n.t("pub_about") },
      { path: "/contact", label: I18n.t("pub_contact") },
    ];
    const themeIcon = Theme.getTheme() === "light" ? "☀️" : Theme.getTheme() === "dark" ? "🌙" : "✨";

    return `
      <div class="pub-shell">
        <header class="pub-header">
          <div class="pub-header-inner">
            <a href="#/" class="pub-brand">🛒 ${Components.escapeHtml(I18n.t("app_name"))}</a>
            <nav class="pub-nav">
              ${navItems.map((item) => `
                <a class="pub-nav-link ${cur === item.path || (item.path === "/" && cur === "/home") ? "active" : ""}" href="#${item.path}">
                  ${Components.escapeHtml(item.label)}
                </a>
              `).join("")}
            </nav>
            <div class="pub-actions">
              <button class="theme-toggle" onclick="Theme.cycleTheme();Router.resolve()">${themeIcon}</button>
              <button class="theme-toggle" onclick="I18n.setLocale(I18n.getLocale()==='ar'?'en':'ar');Router.resolve()">${ar ? "EN" : "AR"}</button>
              ${isAuth
                ? `<a href="#/dashboard" class="btn btn-sm">📊 ${Components.escapeHtml(I18n.t("dashboard"))}</a>`
                : `<a href="#/login" class="btn btn-outline btn-sm">${Components.escapeHtml(I18n.t("login"))}</a>
                   <a href="#/register" class="btn btn-sm">${Components.escapeHtml(I18n.t("register"))}</a>`
              }
            </div>
          </div>
        </header>

        <main class="pub-container">
          ${opts.title ? `<h1 style="font-size:1.6rem;margin-bottom:18px">${Components.escapeHtml(opts.title)}</h1>` : ""}
          ${opts.content || ""}
        </main>

        <footer class="pub-footer">
          <div class="pub-footer-inner">
            <div>© ${new Date().getFullYear()} ${Components.escapeHtml(I18n.t("app_name"))}</div>
            <div class="pub-footer-links">
              <a href="#/about">${Components.escapeHtml(I18n.t("pub_about"))}</a>
              <a href="#/contact">${Components.escapeHtml(I18n.t("pub_contact"))}</a>
              <a href="#/faq">${Components.escapeHtml(I18n.t("pub_faq"))}</a>
              <a href="#/privacy">${Components.escapeHtml(I18n.t("pub_privacy"))}</a>
              <a href="#/terms">${Components.escapeHtml(I18n.t("pub_terms"))}</a>
              <a href="#/verify">${Components.escapeHtml(I18n.t("pub_verify"))}</a>
            </div>
          </div>
        </footer>
      </div>
      <div id="modal-root"></div>
      <div id="toast-root" class="toast-container"></div>
    `;
  }

  window.PublicLayout = { render };
})();
