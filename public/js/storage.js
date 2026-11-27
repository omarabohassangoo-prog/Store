/**
 * public/js/storage.js
 * إدارة التخزين المحلي والكوكيز والبصمة.
 */
(function () {
  const NS = "souqalkul:";

  function setItem(key, value) {
    try { localStorage.setItem(NS + key, JSON.stringify(value)); } catch (e) { /* ignore */ }
  }
  function getItem(key, fallback) {
    try {
      const raw = localStorage.getItem(NS + key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }
  function removeItem(key) {
    try { localStorage.removeItem(NS + key); } catch (e) { /* ignore */ }
  }

  function setCookie(name, value, days) {
    const d = new Date();
    d.setTime(d.getTime() + (days || 7) * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${encodeURIComponent(value)};expires=${d.toUTCString()};path=/;SameSite=Lax`;
  }
  function getCookie(name) {
    const m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
    return m ? decodeURIComponent(m[1]) : null;
  }
  function removeCookie(name) {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/`;
  }

  function getOrCreateFingerprint() {
    const key = "fingerprint";
    let fp = getItem(key, null);
    if (!fp) {
      const parts = [
        navigator.userAgent,
        navigator.language,
        screen.width + "x" + screen.height,
        screen.colorDepth,
        new Date().getTimezoneOffset(),
        navigator.hardwareConcurrency || 0,
      ];
      fp = simpleHash(parts.join("|"));
      setItem(key, fp);
      setCookie(window.__APP_ENV__.fingerprintCookieName, fp, 365);
    }
    return fp;
  }

  function simpleHash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) - h) + str.charCodeAt(i);
      h |= 0;
    }
    return "fp_" + Math.abs(h).toString(36) + "_" + str.length.toString(36);
  }

  function generateIdempotencyKey() {
    return "idem_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10);
  }

  window.Storage = {
    setItem, getItem, removeItem,
    setCookie, getCookie, removeCookie,
    getOrCreateFingerprint, generateIdempotencyKey,
  };
})();
