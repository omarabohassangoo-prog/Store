/**
 * public/js/pages/reset-password.js
 * صفحة إعادة تعيين كلمة المرور مع إمكانية إخفاء/إظهار حقول كلمة المرور حسب الطلب.
 */
(function () {
  Router.add("/reset-password", async (root) => {
    const ar = I18n.getLocale() === "ar";
    let showPassword = false;

    function renderPage() {
      root.innerHTML = PublicLayout.render({
        title: ar ? "إعادة تعيين كلمة المرور" : "Reset Password",
        content: `
          <div class="auth-wrap" style="min-height:50vh;padding:24px 0">
            <div style="width:100%;max-width:440px" class="auth-card">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
                <h1 style="margin:0">${ar ? "كلمة مرور جديدة" : "New Password"}</h1>
                <button type="button" id="toggle-pwd-display" class="btn btn-outline" style="padding:4px 8px;font-size:0.8rem">
                  ${showPassword ? (ar ? "إخفاء الرمز" : "Hide Password") : (ar ? "إظهار الرمز" : "Show Password")}
                </button>
              </div>
              <p class="subtitle">${ar ? "الرجاء إدخال كلمة المرور الجديدة لحسابك." : "Please enter your new password."}</p>
              
              <div id="reset-alert"></div>

              <form id="reset-form">
                <div class="form-group">
                  <label for="new-password">${ar ? "كلمة المرور الجديدة" : "New Password"}</label>
                  <input id="new-password" type="${showPassword ? "text" : "password"}" class="form-control" required minlength="8" autocomplete="new-password">
                </div>
                <div class="form-group">
                  <label for="confirm-password">${ar ? "تأكيد كلمة المرور" : "Confirm Password"}</label>
                  <input id="confirm-password" type="${showPassword ? "text" : "password"}" class="form-control" required minlength="8" autocomplete="new-password">
                </div>
                <button type="submit" class="btn" style="width:100%" id="reset-btn">${ar ? "حفظ كلمة المرور" : "Save Password"}</button>
              </form>

              <div class="footer-links" style="margin-top:16px">
                <a href="#/login">${ar ? "العودة لتسجيل الدخول" : "Back to Login"}</a>
              </div>
            </div>
          </div>
        `,
      });

      document.getElementById("toggle-pwd-display").addEventListener("click", () => {
        showPassword = !showPassword;
        renderPage();
      });

      const form = document.getElementById("reset-form");
      if (form) {
        form.addEventListener("submit", async (e) => {
          e.preventDefault();
          const p1 = document.getElementById("new-password").value;
          const p2 = document.getElementById("confirm-password").value;
          const alertEl = document.getElementById("reset-alert");
          alertEl.innerHTML = "";

          if (p1 !== p2) {
            alertEl.innerHTML = Components.alert("error", ar ? "كلمات المرور غير متطابقة" : "Passwords do not match");
            return;
          }

          const btn = document.getElementById("reset-btn");
          btn.disabled = true;
          btn.textContent = ar ? "جاري الحفظ..." : "Saving...";
          
          const res = await ApiClient.patch("/profile/password", { new_password: p1 }, { skipAuthRedirect: true });
          btn.disabled = false;
          btn.textContent = ar ? "حفظ كلمة المرور" : "Save Password";

          if (res && res.success) {
            alertEl.innerHTML = Components.alert("success", ar ? "تم تحديث كلمة المرور بنجاح. جاري التحويل..." : "Password updated successfully. Redirecting...");
            setTimeout(() => Router.navigate("/login", true), 1500);
          } else {
            alertEl.innerHTML = Components.alert("error", (res && res.error && res.error.message) || (ar ? "فشل التحديث" : "Update failed"));
          }
        });
      }
    }

    renderPage();
  });
})();
