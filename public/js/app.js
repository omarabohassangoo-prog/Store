/**
 * public/js/app.js
 * نقطة الدخول — تُهيّئ كل الأنظمة وتستعيد الجلسة النشطة.
 */
(function () {
  async function bootstrap() {
    I18n.applyStoredLocale();
    Theme.applyStoredTheme();
    Storage.getOrCreateFingerprint();

    await Auth.restoreSession();
    Router.start();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrap);
  } else {
    bootstrap();
  }
})();
