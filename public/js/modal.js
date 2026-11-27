/**
 * public/js/modal.js
 * نظام النوافذ المنبثقة وتأكيد العمليات والطباعة.
 */
(function () {
  let escBound = false;

  function ensureRoot() {
    let root = document.getElementById("modal-root");
    if (!root) {
      root = document.createElement("div");
      root.id = "modal-root";
      document.body.appendChild(root);
    }
    if (!escBound) {
      escBound = true;
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") close();
      });
    }
    return root;
  }

  function escape(val) {
    if (window.Components && Components.escapeHtml) return Components.escapeHtml(val);
    return String(val == null ? "" : val)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function open(opts) {
    opts = opts || {};
    const root = ensureRoot();
    const maxWidth = opts.size === "lg" ? "820px" : opts.size === "sm" ? "420px" : "620px";
    root.innerHTML = `
      <div class="modal-backdrop" id="modal-backdrop-el">
        <div class="modal-box" style="max-width:${maxWidth}">
          <div class="modal-header">
            <h3>${escape(opts.title || "")}</h3>
            <button type="button" class="btn btn-ghost btn-sm" id="modal-close-x">✕</button>
          </div>
          <div class="modal-body">${opts.bodyHtml || ""}</div>
          ${opts.footerHtml ? `<div class="modal-footer">${opts.footerHtml}</div>` : ""}
        </div>
      </div>
    `;
    const backdrop = document.getElementById("modal-backdrop-el");
    const closeX = document.getElementById("modal-close-x");
    if (backdrop) {
      backdrop.addEventListener("click", (e) => {
        if (e.target === backdrop && !opts.persistent) close();
      });
    }
    if (closeX) closeX.addEventListener("click", close);
    return root;
  }

  function close() {
    const root = document.getElementById("modal-root");
    if (root) root.innerHTML = "";
  }

  function confirm(opts) {
    opts = opts || {};
    const ar = window.I18n && I18n.getLocale() === "ar";
    return new Promise((resolve) => {
      open({
        size: "sm",
        title: opts.title || (ar ? "تأكيد العملية" : "Confirm Action"),
        bodyHtml: `<p style="color:var(--fg);line-height:1.6">${escape(opts.message || (ar ? "هل أنت متأكد من المتابعة؟" : "Are you sure you want to continue?"))}</p>`,
        footerHtml: `
          <button type="button" class="btn btn-ghost btn-sm" id="m-cancel-btn">${escape(opts.cancelText || (ar ? "إلغاء" : "Cancel"))}</button>
          <button type="button" class="btn ${opts.danger ? "btn-danger" : ""} btn-sm" id="m-confirm-btn">${escape(opts.confirmText || (ar ? "تأكيد" : "Confirm"))}</button>
        `,
      });
      const cancelBtn = document.getElementById("m-cancel-btn");
      const confirmBtn = document.getElementById("m-confirm-btn");
      if (cancelBtn) {
        cancelBtn.addEventListener("click", () => {
          close();
          resolve(false);
        });
      }
      if (confirmBtn) {
        confirmBtn.addEventListener("click", () => {
          close();
          resolve(true);
        });
      }
    });
  }

  function printable(title, htmlContent) {
    const ar = window.I18n && I18n.getLocale() === "ar";
    open({
      size: "lg",
      title: title || (ar ? "معاينة للطباعة" : "Print Preview"),
      bodyHtml: `<iframe id="print-frame" sandbox="allow-modals allow-same-origin" style="width:100%;height:400px;border:1px solid var(--border);border-radius:8px;background:#fff"></iframe>`,
      footerHtml: `
        <button type="button" class="btn btn-outline btn-sm" onclick="Modal.close()">${escape(ar ? "إغلاق" : "Close")}</button>
        <button type="button" class="btn btn-sm" id="m-print-btn">🖨️ ${escape(ar ? "طباعة" : "Print")}</button>
      `,
    });
    const frame = document.getElementById("print-frame");
    if (frame) frame.srcdoc = htmlContent || "<p>No printable content</p>";
    const pBtn = document.getElementById("m-print-btn");
    if (pBtn && frame) {
      pBtn.addEventListener("click", () => {
        if (frame.contentWindow) frame.contentWindow.print();
      });
    }
  }

  window.Modal = { open, close, confirm, printable };
})();
