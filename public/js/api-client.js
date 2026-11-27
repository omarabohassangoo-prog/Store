/**
 * public/js/api-client.js
 * عميل API موحد يتصل بـ UnifiedJsonRouter مع الجلسة والبصمة و Idempotency.
 */
(function () {
  function buildUrl(path, query) {
    const base = window.__APP_ENV__.apiBaseUrl || window.location.origin;
    const prefix = window.__APP_ENV__.apiPrefix || "/api/v1";
    const url = new URL(base + prefix + path);
    if (query) {
      Object.entries(query).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
      });
    }
    return url.toString();
  }

  function buildHeaders(extra) {
    const headers = {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "Accept-Language": I18n.getLocale(),
      "X-Requested-With": "XMLHttpRequest",
      "x-fingerprint": Storage.getOrCreateFingerprint(),
      ...extra,
    };
    const token = window.Auth && Auth.getToken ? Auth.getToken() : null;
    if (token) {
      headers["Authorization"] = "Bearer " + token;
    }
    return headers;
  }

  async function request(method, path, options) {
    options = options || {};
    const url = buildUrl(path, options.query);
    const headers = buildHeaders(options.headers);
    if (options.idempotent) {
      headers["x-idempotency-key"] = Storage.generateIdempotencyKey();
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), window.__APP_ENV__.requestTimeoutMs || 15000);

    let res, json;
    try {
      res = await fetch(url, {
        method,
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        credentials: "include",
        signal: controller.signal,
      });
      json = await res.json().catch(() => ({}));
    } catch (err) {
      clearTimeout(timeout);
      if (err.name === "AbortError") {
        return { success: false, data: null, error: { code: "TIMEOUT", message: "Request timed out" } };
      }
      return { success: false, data: null, error: { code: "NETWORK_ERROR", message: err.message } };
    }
    clearTimeout(timeout);

    if (!options.skipAuthRedirect && json && json.success === false && json.error) {
      if (json.error.code === "UNAUTHORIZED_SESSION") {
        Auth.clearSession();
        const cur = Router.getCurrentPath();
        if (cur !== "/login" && cur !== "/register") {
          Router.navigate("/login");
        }
      }
    }
    return json;
  }

  window.ApiClient = {
    get: (path, query, opts) => request("GET", path, { query, ...(opts || {}) }),
    post: (path, body, opts) => request("POST", path, { body, ...(opts || {}) }),
    patch: (path, body, opts) => request("PATCH", path, { body, ...(opts || {}) }),
    put: (path, body, opts) => request("PUT", path, { body, ...(opts || {}) }),
    del: (path, opts) => request("DELETE", path, { ...(opts || {}) }),
  };
})();
