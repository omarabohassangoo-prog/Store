(function () {
  const routes = [];
  let currentPath = null;

  function add(pattern, handler, options) {
    const idx = routes.findIndex((r) => r.pattern === pattern);
    const entry = { pattern, handler, options: options || {} };
    if (idx >= 0) routes[idx] = entry;
    else routes.push(entry);
  }

  function match(path) {
    for (const r of routes) {
      if (r.pattern === path) return r;
      if (r.pattern.endsWith("/*")) {
        const prefix = r.pattern.slice(0, -2);
        if (path === prefix || path.startsWith(prefix + "/")) return r;
      }
      if (r.pattern.includes(":")) {
        const rParts = r.pattern.split("/");
        const pParts = path.split("/");
        if (rParts.length !== pParts.length) continue;
        const params = {};
        let ok = true;
        for (let i = 0; i < rParts.length; i++) {
          if (rParts[i].startsWith(":")) params[rParts[i].slice(1)] = decodeURIComponent(pParts[i]);
          else if (rParts[i] !== pParts[i]) { ok = false; break; }
        }
        if (ok) return { ...r, params };
      }
    }
    return null;
  }

  function navigate(path, replace) {
    if (replace) location.hash = "#" + path;
    else location.hash = path;
  }

  async function resolve() {
    const hash = location.hash.slice(1) || "/";
    const matched = match(hash);
    const root = document.getElementById("app");
    if (!root) return;

    if (!matched) return Errors.render(root, 404);
    const opts = matched.options;
    if (window.Guards && Guards.checkRoute) {
      if (!Guards.checkRoute(root, opts)) return;
    } else {
      if (opts.requiresAuth && !Auth.isAuthenticated()) return navigate("/login", true);
      if (opts.roles && opts.roles.length > 0 && !opts.roles.includes(Auth.getRole())) return Errors.render(root, 403);
    }

    currentPath = hash;
    try {
      await matched.handler(root, matched.params || {});
    } catch (err) {
      console.error("Route error:", err);
      const card = document.createElement("div");
      card.className = "card";
      const heading = document.createElement("h2");
      heading.textContent = "خطأ في العرض";
      const message = document.createElement("p");
      message.textContent = err instanceof Error ? err.message : String(err || "");
      card.append(heading, message);
      root.replaceChildren(card);
    }
  }

  function getCurrentPath() { return currentPath; }
  function start() {
    window.addEventListener("hashchange", resolve);
    resolve();
  }
  window.Router = { add, navigate, resolve, start, getCurrentPath };
})();
