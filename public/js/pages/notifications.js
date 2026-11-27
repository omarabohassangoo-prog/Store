/**
 * public/js/pages/notifications.js
 * صفحة الإشعارات مع التصفح والإرسال المتعدد القنوات.
 */
(function () {
  Router.add("/notifications", async (root) => {
    if (!Guards.requireAuth(root)) return;
    const ar = I18n.getLocale() === "ar";
    const state = { page: 1, limit: 10, search: "", sort_by: "created_at", sort_dir: "desc" };

    root.innerHTML = Components.layout({
      title: I18n.t("notifications"),
      content: `
        <div class="toolbar">
          <div class="toolbar-group">
            <input class="form-control" id="ntf-search" style="width:220px" placeholder="${Components.escapeHtml(I18n.t("search"))}">
            <button class="btn btn-sm" id="ntf-new-btn">➕ ${ar ? "إرسال إشعار" : "Send Notification"}</button>
            <button class="btn btn-outline btn-sm" id="ntf-readall-btn">✓ ${ar ? "تحديد الكل كمقروء" : "Mark All Read"}</button>
          </div>
        </div>
        <div class="card">
          <div id="ntf-table-wrap">${Components.escapeHtml(I18n.t("loading"))}</div>
          <div id="ntf-pagination"></div>
        </div>
      `,
    });

    async function loadNotifications() {
      const tableWrap = document.getElementById("ntf-table-wrap");
      const pagWrap = document.getElementById("ntf-pagination");
      const res = await ApiServices.notifications.list({
        page: state.page,
        limit: state.limit,
        search: state.search || undefined,
        sort_by: state.sort_by,
        sort_dir: state.sort_dir,
      });
      if (!res.success) {
        tableWrap.innerHTML = Components.alert("error", (res.error && res.error.message) || "Failed to load");
        pagWrap.innerHTML = "";
        return;
      }
      const items = (res.data && res.data.items) || res.data || [];
      DataTable.mount(tableWrap, {
        rows: Array.isArray(items) ? items : [],
        sortBy: state.sort_by,
        sortDir: state.sort_dir,
        onSort: (k, d) => { state.sort_by = k; state.sort_dir = d; loadNotifications(); },
        columns: [
          { key: "id", label: "ID", sortable: true },
          { key: "channel", label: ar ? "القناة" : "Channel", render: (n) => Components.badge(n.channel || "all", "info") },
          { key: "subject", label: ar ? "الموضوع" : "Subject" },
          { key: "body", label: ar ? "النص" : "Body" },
          {
            key: "read",
            label: ar ? "الحالة" : "Read",
            render: (n) => n.read ? Components.badge(ar ? "مقروء" : "Read", "success") : Components.badge(ar ? "جديد" : "Unread", "pending"),
          },
          {
            key: "actions",
            label: I18n.t("actions"),
            render: (n) => !n.read ? `<button class="btn btn-outline btn-sm" onclick="window.__markNtfRead('${Components.escapeHtml(n.id)}')">✓</button>` : "—",
          },
        ],
      });
      const meta = (res.meta && res.meta.pagination) || { page: state.page, limit: state.limit, total: res.data && res.data.total };
      Pagination.mount(pagWrap, meta, (p) => { state.page = p; loadNotifications(); });
    }

    document.getElementById("ntf-search").addEventListener("input", (e) => {
      state.search = e.target.value.trim();
      state.page = 1;
      loadNotifications();
    });

    document.getElementById("ntf-readall-btn").addEventListener("click", async () => {
      const r = await ApiServices.notifications.markAllRead();
      if (r.success) {
        Toast.success(ar ? "تم تحديد جميع الإشعارات كمقروءة" : "All marked as read");
        loadNotifications();
      }
    });

    document.getElementById("ntf-new-btn").addEventListener("click", () => {
      Modal.open({
        title: ar ? "إرسال إشعار جديد" : "Send Notification",
        bodyHtml: `
          <form id="ntf-send-form">
            ${Forms.renderFields([
              {
                name: "channel",
                label: ar ? "القناة" : "Channel",
                type: "select",
                value: "email",
                options: [
                  { value: "email", label: "Email" },
                  { value: "sms", label: "SMS" },
                  { value: "whatsapp", label: "WhatsApp" },
                  { value: "all", label: "All" },
                ],
              },
              { name: "target", label: ar ? "البريد الإلكتروني أو الهاتف" : "Target Email / Phone", placeholder: "user@example.com" },
              { name: "subject", label: ar ? "الموضوع" : "Subject" },
              { name: "body", label: ar ? "نص الرسالة" : "Message Body", type: "textarea", required: true },
            ])}
            <button class="btn" type="submit">${Components.escapeHtml(I18n.t("submit"))}</button>
          </form>
        `,
      });
      document.getElementById("ntf-send-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const check = Forms.validate(e.target, { body: { required: true } });
        if (!check.valid) return;
        const target = String(check.values.target || "").trim();
        const r = await ApiServices.notifications.send({
          channel: check.values.channel,
          email: target.includes("@") ? target : undefined,
          phone: !target.includes("@") && target ? target : undefined,
          subject: check.values.subject,
          body: check.values.body,
        });
        if (r.success) {
          Modal.close();
          Toast.success(ar ? "تم إرسال الإشعار" : "Notification sent");
          loadNotifications();
        } else {
          Toast.error((r.error && r.error.message) || "Failed");
        }
      });
    });

    window.__markNtfRead = async (id) => {
      const r = await ApiServices.notifications.markRead(id);
      if (r.success) loadNotifications();
    };

    await loadNotifications();
  }, { requiresAuth: true });
})();
