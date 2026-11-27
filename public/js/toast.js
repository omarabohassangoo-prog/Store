/**
 * public/js/toast.js
 * نظام الإشعارات المنبثقة (Toasts).
 */
(function () {
  const ICONS = {
    success: "✓",
    error: "✕",
    warning: "⚠",
    info: "ℹ",
  };

  function getContainer() {
    let el = document.getElementById("toast-root");
    if (!el) {
      el = document.createElement("div");
      el.id = "toast-root";
      el.className = "toast-container";
      document.body.appendChild(el);
    }
    return el;
  }

  function show(message, type, durationMs) {
    const kind = type || "info";
    const container = getContainer();
    const el = document.createElement("div");
    el.className = "toast toast-" + kind;
    el.setAttribute("role", "status");
    el.style.display = "flex";
    el.style.alignItems = "center";
    el.style.justifyContent = "space-between";
    el.style.gap = "10px";

    const span = document.createElement("span");
    span.textContent = (ICONS[kind] ? ICONS[kind] + " " : "") + String(message || "");

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "btn btn-ghost btn-sm";
    closeBtn.style.padding = "2px 6px";
    closeBtn.textContent = "×";
    closeBtn.addEventListener("click", () => el.remove());

    el.appendChild(span);
    el.appendChild(closeBtn);
    container.appendChild(el);

    const ttl = typeof durationMs === "number" ? durationMs : 3500;
    if (ttl > 0) {
      setTimeout(() => {
        if (el.parentNode) el.remove();
      }, ttl);
    }
    return el;
  }

  window.Toast = {
    show,
    success: (msg, ms) => show(msg, "success", ms),
    error: (msg, ms) => show(msg, "error", ms),
    warning: (msg, ms) => show(msg, "warning", ms),
    info: (msg, ms) => show(msg, "info", ms),
  };
})();
