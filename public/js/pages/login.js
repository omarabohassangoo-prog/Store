/**
 * public/js/pages/login.js
 */
(function () {
  Router.add("/login", async (root) => {
    if (Auth.isAuthenticated()) return Router.navigate("/dashboard", true);

    const statusRes = await ApiClient.get("/auth/bootstrap-status", null, { skipAuthRedirect: true });
    const needsAdminSetup = Boolean(statusRes && statusRes.success && statusRes.data && statusRes.data.needs_admin_setup);
    const envPassConfigured = Boolean(statusRes && statusRes.success && statusRes.data && statusRes.data.env_passcode_configured);
    let setupVisible = true;
    let showPassword = false;

    function renderLogin() {
      const ar = I18n.getLocale() === "ar";
      root.innerHTML = PublicLayout.render({
        title: I18n.t("login"),
        content: `
          <div class="auth-wrap" style="min-height:50vh;padding:12px 0">
            <div class="${needsAdminSetup && setupVisible ? "auth-grid" : ""}" style="${needsAdminSetup && setupVisible ? "" : "width:100%;max-width:440px"}">
              <div class="auth-card">
                <h1>${Components.escapeHtml(I18n.t("app_name"))}</h1>
                <p class="subtitle">${Components.escapeHtml(I18n.t("login"))}</p>
                <div id="login-alert"></div>
                <form id="login-form">
                  <div class="form-group">
                    <label for="email">${Components.escapeHtml(I18n.t("email"))}</label>
                    <input id="email" type="email" class="form-control" required autocomplete="email">
                  </div>
                  <div class="form-group">
                    <div style="display:flex;justify-content:space-between;align-items:center">
                      <label for="password">${Components.escapeHtml(I18n.t("password"))}</label>
                      <button type="button" id="toggle-login-pwd" class="btn btn-outline" style="padding:2px 6px;font-size:0.7rem">
                        ${showPassword ? (ar ? "إخفاء" : "Hide") : (ar ? "إظهار" : "Show")}
                      </button>
                    </div>
                    <input id="password" type="${showPassword ? "text" : "password"}" class="form-control" required autocomplete="current-password">
                  </div>
                  <button type="submit" class="btn" style="width:100%" id="login-btn">${Components.escapeHtml(I18n.t("login"))}</button>
                </form>
                <div class="footer-links" style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-top:12px">
                  <a href="#/register">${Components.escapeHtml(I18n.t("register"))}</a>
                  <a href="#/forgot-password">${ar ? "نسيت كلمة المرور؟" : "Forgot Password?"}</a>
                  <a href="#/verify">${ar ? "التحقق OTP" : "OTP Verify"}</a>
                </div>
              </div>

              ${needsAdminSetup ? `
                <div class="auth-card" style="border-color:var(--primary)">
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                    <h2 style="font-size:1.1rem;margin:0;color:var(--primary)">🛡️ ${Components.escapeHtml(I18n.t("admin_setup_title"))}</h2>
                    <button type="button" id="toggle-setup-card" class="btn btn-outline" style="padding:2px 6px;font-size:0.75rem">
                      ${setupVisible ? (ar ? "إخفاء" : "Hide") : (ar ? "إظهار" : "Show")}
                    </button>
                  </div>
                  <div id="setup-card-body" style="display:${setupVisible ? "block" : "none"}">
                    <p class="subtitle" style="text-align:start;margin-bottom:14px">${Components.escapeHtml(I18n.t("admin_setup_desc"))}</p>
                    <div id="setup-alert"></div>
                    <form id="setup-admin-form">
                      <div class="form-group">
                        <label for="sa-name">${Components.escapeHtml(I18n.t("full_name"))}</label>
                        <input id="sa-name" type="text" class="form-control" required>
                      </div>
                      <div class="form-group">
                        <label for="sa-email">${Components.escapeHtml(I18n.t("email"))}</label>
                        <input id="sa-email" type="email" class="form-control" required>
                      </div>
                      <div class="form-group">
                        <label for="sa-password">${Components.escapeHtml(I18n.t("password"))} (8+)</label>
                        <input id="sa-password" type="password" class="form-control" required minlength="8">
                      </div>
                      ${envPassConfigured ? `
                        <div class="form-group">
                          <label for="sa-passcode">${Components.escapeHtml(I18n.t("setup_passcode"))}</label>
                          <input id="sa-passcode" type="password" class="form-control" required>
                        </div>
                      ` : ""}
                      <button type="submit" class="btn btn-outline" style="width:100%" id="setup-btn">${Components.escapeHtml(I18n.t("setup_btn"))}</button>
                    </form>
                  </div>
                </div>
              ` : ""}
            </div>
          </div>
        `,
      });

      const togglePwdBtn = document.getElementById("toggle-login-pwd");
      if (togglePwdBtn) {
        togglePwdBtn.addEventListener("click", () => {
          showPassword = !showPassword;
          renderLogin();
        });
      }

      const toggleSetupBtn = document.getElementById("toggle-setup-card");
      if (toggleSetupBtn) {
        toggleSetupBtn.addEventListener("click", () => {
          setupVisible = !setupVisible;
          renderLogin();
        });
      }

      document.getElementById("login-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const btn = document.getElementById("login-btn");
        const alertEl = document.getElementById("login-alert");
        btn.disabled = true;
        btn.textContent = I18n.t("loading");
        alertEl.innerHTML = "";
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;
        const res = await Auth.login(email, password);
        btn.disabled = false;
        btn.textContent = I18n.t("login");
        if (!res.success) {
          alertEl.innerHTML = Components.alert("error", (res.error && res.error.message) || I18n.t("invalid_credentials"));
          return;
        }
        Router.navigate("/dashboard", true);
      });

      const setupForm = document.getElementById("setup-admin-form");
      if (setupForm) {
        setupForm.addEventListener("submit", async (e) => {
          e.preventDefault();
          const btn = document.getElementById("setup-btn");
          const alertEl = document.getElementById("setup-alert");
          btn.disabled = true;
          btn.textContent = I18n.t("loading");
          alertEl.innerHTML = "";
          const payload = {
            full_name: document.getElementById("sa-name").value.trim(),
            email: document.getElementById("sa-email").value.trim(),
            password: document.getElementById("sa-password").value,
          };
          const passEl = document.getElementById("sa-passcode");
          if (passEl) payload.setup_passcode = passEl.value;
          const res = await Auth.bootstrapAdmin(payload);
          btn.disabled = false;
          btn.textContent = I18n.t("setup_btn");
          if (!res.success) {
            alertEl.innerHTML = Components.alert("error", (res.error && res.error.message) || "Setup failed");
            return;
          }
          Router.navigate("/dashboard", true);
        });
      }
    }

    renderLogin();
  });
})();
