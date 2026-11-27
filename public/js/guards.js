/**
 * public/js/guards.js
 * حراس المسارات والصلاحيات في الواجهة الأمامية.
 */
(function () {
  function requireAuth() {
    if (!Auth.isAuthenticated()) {
      Router.navigate("/login", true);
      return false;
    }
    return true;
  }

  function requireGuest() {
    if (Auth.isAuthenticated()) {
      Router.navigate("/dashboard", true);
      return false;
    }
    return true;
  }

  function canAccess(allowedRoles) {
    if (!allowedRoles || allowedRoles.length === 0) return true;
    const role = Auth.getRole();
    if (!role) return false;
    if (role === "super_admin") return true;
    return allowedRoles.includes(role);
  }

  function requireRole(root, allowedRoles) {
    if (!requireAuth()) return false;
    if (!canAccess(allowedRoles)) {
      if (window.Errors && Errors.render) Errors.render(root, 403);
      return false;
    }
    return true;
  }

  function checkRoute(root, options) {
    const opts = options || {};
    if (opts.guestOnly) return requireGuest();
    if (opts.requiresAuth && !requireAuth()) return false;
    if (opts.roles && opts.roles.length > 0) {
      return requireRole(root, opts.roles);
    }
    return true;
  }

  window.Guards = {
    requireAuth,
    requireGuest,
    canAccess,
    requireRole,
    checkRoute,
  };
})();
