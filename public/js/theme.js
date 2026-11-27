/**
 * public/js/theme.js
 * إدارة الثيمات (light/dark/brand).
 */
(function () {
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    Storage.setItem("theme", theme);
  }
  function getTheme() {
    return Storage.getItem("theme", window.__APP_ENV__.defaultTheme) || "light";
  }
  function cycleTheme() {
    const order = ["light", "dark", "brand"];
    const cur = getTheme();
    const idx = order.indexOf(cur);
    applyTheme(order[(idx + 1) % order.length]);
  }
  function applyStoredTheme() {
    applyTheme(getTheme());
  }

  window.Theme = { applyTheme, getTheme, cycleTheme, applyStoredTheme };
})();
