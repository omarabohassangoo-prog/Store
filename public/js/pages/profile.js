/**
 * public/js/pages/profile.js
 */
(function () {
  Router.add("/profile", async (root) => {
    const content = `
      <div id="prof-loading">${Components.escapeHtml(I18n.t("loading"))}</div>
      <div id="prof-content" class="hidden"></div>
    `;
    root.innerHTML = Components.layout({ title: I18n.t("profile"), content });

    const [res, sessRes] = await Promise.all([
      Auth.fetchProfile(),
      ApiClient.get("/profile/sessions"),
    ]);
    const contentEl = document.getElementById("prof-content");
    const loadingEl = document.getElementById("prof-loading");
    loadingEl.classList.add("hidden");
    contentEl.classList.remove("hidden");

    if (!res.success) {
      contentEl.innerHTML = Components.alert("error", (res.error && res.error.message) || "Failed to load profile");
      return;
    }
    const p = res.data || {};
    const sessions = (sessRes.success && sessRes.data && sessRes.data.items) || [];
    const ar = I18n.getLocale() === "ar";

    contentEl.innerHTML = `
      <div class="grid-2">
        <div class="card">
          <h2 class="card-title">${Components.escapeHtml(I18n.t("profile"))}</h2>
          <div class="form-group">
            <label>${Components.escapeHtml(I18n.t("full_name"))}</label>
            <input class="form-control" id="p-name" value="${Components.escapeHtml(p.full_name || "")}">
          </div>
          <div class="form-group">
            <label>${Components.escapeHtml(I18n.t("email"))}</label>
            <input class="form-control" id="p-email" value="${Components.escapeHtml(p.email || "")}" disabled>
          </div>
          <div class="form-group">
            <label>${Components.escapeHtml(I18n.t("phone"))}</label>
            <input class="form-control" id="p-phone" value="${Components.escapeHtml(p.phone || "")}">
          </div>
          <button class="btn" id="save-profile">${Components.escapeHtml(I18n.t("save"))}</button>
          <div id="prof-alert" class="mt-1"></div>
        </div>

        <div class="card">
          <h2 class="card-title">${ar ? "تغيير كلمة المرور" : "Change Password"}</h2>
          <form id="pw-form">
            <div class="form-group">
              <label>${ar ? "كلمة المرور الجديدة (8+)" : "New Password (8+)"}</label>
              <input class="form-control" id="pw-new" type="password" minlength="8" required>
            </div>
            <button class="btn btn-outline" type="submit" id="pw-btn">${ar ? "تحديث كلمة المرور" : "Update Password"}</button>
            <div id="pw-alert" class="mt-1"></div>
          </form>
        </div>
      </div>

      <div class="card mt-2">
        <h2 class="card-title">${ar ? "الجلسات النشطة" : "Active Sessions"}</h2>
        ${sessions.length === 0 ? `<p class="empty-state">${Components.escapeHtml(I18n.t("no_data"))}</p>` : `
          <div class="table-wrap"><table>
            <thead><tr><th>ID</th><th>Fingerprint</th><th>Expires</th><th>${Components.escapeHtml(I18n.t("actions"))}</th></tr></thead>
            <tbody>
              ${sessions.map((s) => `
                <tr>
                  <td>${Components.escapeHtml(s.id)}</td>
                  <td>${Components.escapeHtml(s.fingerprint || "—")}</td>
                  <td>${Components.escapeHtml(s.expires_at || "—")}</td>
                  <td><button class="btn btn-danger btn-sm" onclick="window.__revokeSession('${Components.escapeHtml(s.id)}')">${ar ? "إلغاء" : "Revoke"}</button></td>
                </tr>
              `).join("")}
            </tbody>
          </table></div>
        `}
      </div>
    `;

    document.getElementById("save-profile").addEventListener("click", async () => {
      const alertEl = document.getElementById("prof-alert");
      const btn = document.getElementById("save-profile");
      btn.disabled = true;
      const body = {
        full_name: document.getElementById("p-name").value.trim(),
        phone: document.getElementById("p-phone").value.trim(),
      };
      const r = await ApiClient.patch("/profile", body);
      btn.disabled = false;
      if (!r.success) {
        alertEl.innerHTML = Components.alert("error", (r.error && r.error.message) || "Save failed");
        return;
      }
      alertEl.innerHTML = Components.alert("success", ar ? "✓ تم الحفظ" : "✓ Saved");
    });

    document.getElementById("pw-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const alertEl = document.getElementById("pw-alert");
      const btn = document.getElementById("pw-btn");
      btn.disabled = true;
      const r = await ApiClient.patch("/profile/password", { new_password: document.getElementById("pw-new").value });
      btn.disabled = false;
      if (!r.success) {
        alertEl.innerHTML = Components.alert("error", (r.error && r.error.message) || "Error");
        return;
      }
      document.getElementById("pw-new").value = "";
      alertEl.innerHTML = Components.alert("success", ar ? "✓ تم تحديث كلمة المرور" : "✓ Password updated");
    });

    window.__revokeSession = async (id) => {
      const r = await ApiClient.del("/profile/sessions/" + encodeURIComponent(id));
      if (r.success) {
        Components.toast(ar ? "تم إلغاء الجلسة" : "Session revoked", "success");
        Router.resolve();
      }
    };
  }, { requiresAuth: true });
})();
