/**
 * public/js/pages/forgot-password.js
 * صفحة استعادة كلمة المرور مع إمكانية إخفاء/إظهار تفاصيل الإرسال حسب الطلب.
 */
(function () {
  Router.add("/forgot-password", async (root) => {
    const ar = I18n.getLocale() === "ar";
    let showDetails = true;

    function renderPage() {
      root.innerHTML = PublicLayout.render({
        title: ar ? "استعادة كلمة المرور" : "Forgot Password",
        content: `
          <div class="auth-wrap" style="min-height:50vh;padding:24px 0">
            <div style="width:100%;max-width:440px" class="auth-card">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
                <h1 style="margin:0">${ar ? "استعادة كلمة المرور" : "Password Recovery"}</h1>
                <button type="button" id="toggle-details-btn" class="btn btn-outline" style="padding:4px 8px;font-size:0.8rem">
                  ${showDetails ? (ar ? "إخفاء التفاصيل" : "Hide Details") : (ar ? "إظهار التفاصيل" : "Show Details")}
                </button>
              </div>
              <p class="subtitle">${ar ? "أدخل بريدك الإلكتروني لتلقي تعليمات إعادة التعيين." : "Enter your email to receive recovery instructions."}</p>
              
              <div id="forgot-alert"></div>

              <div id="forgot-content-wrap" style="display:${showDetails ? "block" : "none"}">
                <form id="forgot-form">
                  <div class="form-group">
                    <label for="recovery-email">${ar ? "البريد الإلكتروني" : "Email Address"}</label>
                    <input id="recovery-email" type="email" class="form-control" required autocomplete="email" placeholder="name@example.com">
                  </div>
                  <button type="submit" class="btn" style="width:100%" id="recovery-btn">${ar ? "إرسال رابط الاستعادة" : "Send Reset Link"}</button>
                </form>
              </div>

              <div class="footer-links" style="margin-top:16px">
                <a href="#/login">${ar ? "العودة لتسجيل الدخول" : "Back to Login"}</a>
              </div>
            </div>
          </div>
        `,
      });

      document.getElementById("toggle-details-btn").addEventListener("click", () => {
        showDetails = !showDetails;
        renderPage();
      });

      const form = document.getElementById("forgot-form");
      if (form) {
        form.addEventListener("submit", async (e) => {
          e.preventDefault();
          const btn = document.getElementById("recovery-btn");
          const alertEl = document.getElementById("forgot-alert");
          btn.disabled = true;
          btn.textContent = ar ? "جاري الإرسال..." : "Sending...";
          alertEl.innerHTML = "";

          const email = document.getElementById("recovery-email").value.trim();
          // Simulate or call api if available
          await new Promise(r => setTimeout(r, 800));
          btn.disabled = false;
          btn.textContent = ar ? "إرسال رابط الاستعادة" : "Send Reset Link";
          alertEl.innerHTML = Components.alert("success", ar ? "إذا كان البريد مسجلاً، تم إرسال تعليمات الاستعادة بنجاح." : "If registered, recovery instructions have been sent.");
        });
      }
    }

    renderPage();
  });
})();
