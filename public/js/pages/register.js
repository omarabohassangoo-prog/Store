/**
 * public/js/pages/register.js
 */
(function () {
  Router.add("/register", async (root) => {
    if (Auth.isAuthenticated()) return Router.navigate("/dashboard", true);
    let showPassword = false;
    const ar = I18n.getLocale() === "ar";

    function renderRegister() {
      root.innerHTML = PublicLayout.render({
        title: I18n.t("register"),
        content: `
          <div class="auth-wrap" style="min-height:50vh;padding:12px 0">
            <div class="auth-card">
              <h1>${Components.escapeHtml(I18n.t("app_name"))}</h1>
              <p class="subtitle">${Components.escapeHtml(I18n.t("register"))}</p>
              <div id="reg-alert"></div>
              <form id="reg-form">
                <div class="form-group">
                  <label for="full_name">${Components.escapeHtml(I18n.t("full_name"))}</label>
                  <input id="full_name" type="text" class="form-control" required>
                </div>
                <div class="form-group">
                  <label for="email">${Components.escapeHtml(I18n.t("email"))}</label>
                  <input id="email" type="email" class="form-control" required>
                </div>
                <div class="form-group">
                  <label for="phone">${Components.escapeHtml(I18n.t("phone"))}</label>
                  <input id="phone" type="tel" class="form-control">
                </div>
                <div class="form-group">
                  <label for="user_type">${Components.escapeHtml(I18n.t("account_type"))}</label>
                  <select id="user_type" class="form-control">
                    <option value="customer">${Components.escapeHtml(I18n.t("role_customer"))}</option>
                    <option value="vendor">${Components.escapeHtml(I18n.t("role_vendor"))}</option>
                  </select>
                </div>
                <div class="form-group">
                  <div style="display:flex;justify-content:space-between;align-items:center">
                    <label for="password">${Components.escapeHtml(I18n.t("password"))} (8+)</label>
                    <button type="button" id="toggle-reg-pwd" class="btn btn-outline" style="padding:2px 6px;font-size:0.7rem">
                      ${showPassword ? (ar ? "إخفاء" : "Hide") : (ar ? "إظهار" : "Show")}
                    </button>
                  </div>
                  <input id="password" type="${showPassword ? "text" : "password"}" class="form-control" required minlength="8">
                </div>
                <button type="submit" class="btn" style="width:100%" id="reg-btn">${Components.escapeHtml(I18n.t("submit"))}</button>
              </form>
              <div class="footer-links" style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-top:12px">
                <a href="#/login">${Components.escapeHtml(I18n.t("have_account"))} ${Components.escapeHtml(I18n.t("login"))}</a>
                <a href="#/verify">${ar ? "التحقق OTP" : "OTP Verify"}</a>
              </div>
            </div>
          </div>
        `,
      });

      const togglePwdBtn = document.getElementById("toggle-reg-pwd");
      if (togglePwdBtn) {
        togglePwdBtn.addEventListener("click", () => {
          showPassword = !showPassword;
          renderRegister();
        });
      }

      document.getElementById("reg-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const btn = document.getElementById("reg-btn");
        const alertEl = document.getElementById("reg-alert");
        btn.disabled = true;
        btn.textContent = I18n.t("loading");
        alertEl.innerHTML = "";
        const payload = {
          full_name: document.getElementById("full_name").value.trim(),
          email: document.getElementById("email").value.trim(),
          phone: document.getElementById("phone").value.trim() || undefined,
          password: document.getElementById("password").value,
          user_type: document.getElementById("user_type").value,
          preferred_locale: I18n.getLocale(),
        };
        const res = await Auth.register(payload);
        btn.disabled = false;
        btn.textContent = I18n.t("submit");
        if (!res.success) {
          alertEl.innerHTML = Components.alert("error", (res.error && res.error.message) || "Registration failed");
          return;
        }
        Components.toast(ar ? "تم إنشاء الحساب بنجاح، يمكنك تسجيل الدخول الآن" : "Account created! Please sign in.", "success");
        Router.navigate("/login", true);
      });
    }

    renderRegister();
  });
})();
