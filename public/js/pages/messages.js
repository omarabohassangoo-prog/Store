/**
 * public/js/pages/messages.js
 * صفحة الرسائل الداخلية المشتركة لجميع المستخدمين.
 */
(function () {
  Router.add("/messages", async (root) => {
    if (!Guards.requireAuth(root)) return;
    const ar = I18n.getLocale() === "ar";
    const state = { page: 1, limit: 10, search: "", sort_by: "created_at", sort_dir: "desc" };

    root.innerHTML = Components.layout({
      title: I18n.t("messages"),
      content: `
        <div class="toolbar">
          <div class="toolbar-group">
            <input class="form-control" id="msg-search" style="width:220px" placeholder="${Components.escapeHtml(I18n.t("search"))}">
          </div>
          <button class="btn btn-sm" id="msg-new-btn">✉️ ${ar ? "رسالة جديدة" : "New Message"}</button>
        </div>
        <div class="card">
          <div id="msg-table-wrap">${Components.escapeHtml(I18n.t("loading"))}</div>
          <div id="msg-pagination"></div>
        </div>
      `,
    });

    async function loadMessages() {
      const tableWrap = document.getElementById("msg-table-wrap");
      const pagWrap = document.getElementById("msg-pagination");
      const res = await ApiServices.messages.list({
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
      const items = (res.data && res.data.items) || [];
      DataTable.mount(tableWrap, {
        rows: items,
        sortBy: state.sort_by,
        sortDir: state.sort_dir,
        onSort: (k, d) => { state.sort_by = k; state.sort_dir = d; loadMessages(); },
        columns: [
          { key: "id", label: "ID", sortable: true },
          { key: "user_id", label: ar ? "المرسل" : "Sender", sortable: true },
          { key: "recipient_id", label: ar ? "المستلم" : "Recipient", sortable: true },
          { key: "subject", label: ar ? "الموضوع" : "Subject" },
          { key: "body", label: ar ? "المحتوى" : "Message" },
          { key: "created_at", label: I18n.t("created_at"), sortable: true },
        ],
      });
      const meta = (res.meta && res.meta.pagination) || { page: state.page, limit: state.limit, total: res.data && res.data.total };
      Pagination.mount(pagWrap, meta, (p) => { state.page = p; loadMessages(); });
    }

    document.getElementById("msg-search").addEventListener("input", (e) => {
      state.search = e.target.value.trim();
      state.page = 1;
      loadMessages();
    });

    document.getElementById("msg-new-btn").addEventListener("click", () => {
      Modal.open({
        title: ar ? "إرسال رسالة جديدة" : "Send Message",
        bodyHtml: `
          <form id="msg-form">
            ${Forms.renderFields([
              { name: "recipient_id", label: ar ? "معرّف المستلم" : "Recipient ID", required: true, placeholder: "usr_..." },
              { name: "subject", label: ar ? "الموضوع" : "Subject" },
              { name: "body", label: ar ? "نص الرسالة" : "Message Body", type: "textarea", required: true },
            ])}
            <button class="btn" type="submit">${Components.escapeHtml(I18n.t("submit"))}</button>
          </form>
        `,
      });
      document.getElementById("msg-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const check = Forms.validate(e.target, { recipient_id: { required: true }, body: { required: true } });
        if (!check.valid) return;
        const r = await ApiServices.messages.send(check.values);
        if (r.success) {
          Modal.close();
          Toast.success(ar ? "تم إرسال الرسالة" : "Message sent");
          loadMessages();
        } else {
          Toast.error((r.error && r.error.message) || "Failed");
        }
      });
    });

    await loadMessages();
  }, { requiresAuth: true });
})();
