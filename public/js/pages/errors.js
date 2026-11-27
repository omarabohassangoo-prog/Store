/**
 * public/js/pages/errors.js
 */
(function () {
  function render(root, code) {
    const messages = {
      403: I18n.t("error_403"),
      404: I18n.t("error_404"),
    };
    const msg = messages[code] || "Error";
    root.innerHTML = `
      <div class="auth-wrap">
        <div class="auth-card text-center">
          <h1 style="font-size:4rem;color:var(--primary)">${code}</h1>
          <p style="color:var(--fg-muted);margin:16px 0">${Components.escapeHtml(msg)}</p>
          <a href="#/dashboard" class="btn">${I18n.t("back_home")}</a>
        </div>
      </div>
    `;
  }
  window.Errors = { render };
})();
