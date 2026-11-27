/**
 * public/js/auth.js
 * إدارة الجلسة والمستخدم الحالي في الذاكرة مع استعادة الجلسة عبر الكوكي الآمن.
 */
(function () {
  let memorySession = null;

  function getSession() {
    return memorySession;
  }

  function getToken() {
    return memorySession ? memorySession.session_id || null : null;
  }

  function setSession(session) {
    memorySession = session || null;
  }

  function clearSession() {
    memorySession = null;
    Storage.removeItem("session");
  }

  function isAuthenticated() {
    return Boolean(memorySession && memorySession.user_id && memorySession.user_type);
  }

  function getRole() {
    return memorySession ? memorySession.user_type : null;
  }

  async function restoreSession() {
    try {
      const res = await ApiClient.get("/profile", null, { skipAuthRedirect: true });
      if (res && res.success && res.data) {
        setSession({
          user_id: res.data.id || res.data.user_id,
          user_type: res.data.user_type,
          full_name: res.data.full_name,
          email: res.data.email,
          session_id: (res.meta && res.meta.security && res.meta.security.session_id) || null,
        });
        return true;
      }
    } catch (e) {
      /* ignore */
    }
    clearSession();
    return false;
  }

  async function login(email, password) {
    const res = await ApiClient.post("/auth/login", { email, password }, { skipAuthRedirect: true });
    if (!res.success) return res;
    setSession({
      user_id: res.data.user_id || (res.data.user && res.data.user.user_id),
      user_type: res.data.user_type || (res.data.user && res.data.user.user_type),
      full_name: res.data.user && res.data.user.full_name,
      email: res.data.user && res.data.user.email,
      session_id: res.data.session_id,
      redirect_url: res.data.redirect_url,
    });
    return res;
  }

  async function bootstrapAdmin(payload) {
    const res = await ApiClient.post("/auth/bootstrap-admin", payload, { skipAuthRedirect: true });
    if (!res.success) return res;
    setSession({
      user_id: res.data.user_id || (res.data.user && res.data.user.user_id),
      user_type: res.data.user_type || "super_admin",
      full_name: res.data.user && res.data.user.full_name,
      email: res.data.user && res.data.user.email,
      session_id: res.data.session_id,
      redirect_url: res.data.redirect_url,
    });
    return res;
  }

  async function register(payload) {
    return ApiClient.post("/auth/register", payload, { skipAuthRedirect: true });
  }

  async function logout() {
    try {
      await ApiClient.post("/auth/logout", {}, { skipAuthRedirect: true });
    } catch (e) {
      /* ignore */
    }
    clearSession();
    Router.navigate("/login");
  }

  async function fetchProfile() {
    return ApiClient.get("/profile");
  }

  window.Auth = {
    getSession,
    getToken,
    setSession,
    clearSession,
    isAuthenticated,
    getRole,
    restoreSession,
    login,
    bootstrapAdmin,
    register,
    logout,
    fetchProfile,
  };
})();
