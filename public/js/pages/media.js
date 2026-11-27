/**
 * public/js/pages/media.js
 * صفحة مكتبة الوسائط والملفات المشتركة.
 */
(function () {
  Router.add("/media", async (root) => {
    if (!Guards.requireAuth(root)) return;
    const ar = I18n.getLocale() === "ar";
    const state = { page: 1, limit: 12, search: "", sort_by: "created_at", sort_dir: "desc" };

    root.innerHTML = Components.layout({
      title: I18n.t("nav_media"),
      content: `
        <div class="toolbar">
          <div class="toolbar-group">
            <input class="form-control" id="med-search" style="width:220px" placeholder="${Components.escapeHtml(I18n.t("search"))}">
          </div>
          <button class="btn btn-sm" id="med-add-btn">📤 ${ar ? "رفع / تسجيل ملف وسائط" : "Upload Media"}</button>
        </div>
        <div class="card">
          <div id="med-table-wrap">${Components.escapeHtml(I18n.t("loading"))}</div>
          <div id="med-pagination"></div>
        </div>
      `,
    });

    async function loadMedia() {
      const tableWrap = document.getElementById("med-table-wrap");
      const pagWrap = document.getElementById("med-pagination");
      const res = await ApiServices.media.list({
        page: state.page,
        limit: state.limit,
        search: state.search || undefined,
        sort_by: state.sort_by,
        sort_dir: state.sort_dir,
      });
      if (!res.success) {
        tableWrap.innerHTML = Components.alert("error", (res.error && res.error.message) || "Failed to load media");
        pagWrap.innerHTML = "";
        return;
      }
      const items = (res.data && res.data.items) || [];
      DataTable.mount(tableWrap, {
        rows: items,
        sortBy: state.sort_by,
        sortDir: state.sort_dir,
        onSort: (k, d) => { state.sort_by = k; state.sort_dir = d; loadMedia(); },
        columns: [
          { key: "id", label: "ID", sortable: true },
          { key: "filename", label: ar ? "اسم الملف" : "Filename", sortable: true },
          { key: "mime_type", label: "MIME", render: (m) => Components.badge(m.mime_type || "file", "info") },
          { key: "size_bytes", label: ar ? "الحجم" : "Size", render: (m) => m.size_bytes ? `${Math.round(Number(m.size_bytes) / 1024)} KB` : "—" },
          {
            key: "url",
            label: "URL",
            render: (m) => m.url ? `<a href="${Components.escapeHtml(m.url)}" target="_blank" rel="noopener noreferrer">${Components.escapeHtml(m.url)}</a>` : "—",
          },
          { key: "created_at", label: I18n.t("created_at"), sortable: true },
        ],
      });
      const meta = (res.meta && res.meta.pagination) || { page: state.page, limit: state.limit, total: res.data && res.data.total };
      Pagination.mount(pagWrap, meta, (p) => { state.page = p; loadMedia(); });
    }

    document.getElementById("med-search").addEventListener("input", (e) => {
      state.search = e.target.value.trim();
      state.page = 1;
      loadMedia();
    });

    document.getElementById("med-add-btn").addEventListener("click", () => {
      Modal.open({
        title: ar ? "رفع / تسجيل وسائط" : "Register Media Asset",
        bodyHtml: `
          <form id="med-form">
            ${Forms.renderFields([
              { name: "filename", label: ar ? "اسم الملف" : "Filename", required: true, placeholder: "banner.png" },
              {
                name: "mime_type",
                label: "MIME Type",
                type: "select",
                value: "image/png",
                options: [
                  { value: "image/png", label: "image/png" },
                  { value: "image/jpeg", label: "image/jpeg" },
                  { value: "image/webp", label: "image/webp" },
                  { value: "application/pdf", label: "application/pdf" },
                ],
              },
              { name: "url", label: ar ? "الرابط" : "Asset URL", required: true, placeholder: "/assets/banner.png" },
              { name: "size_bytes", label: ar ? "الحجم بالبايت" : "Size (bytes)", type: "number", value: 24576 },
            ])}
            <button class="btn" type="submit">${Components.escapeHtml(I18n.t("submit"))}</button>
          </form>
        `,
      });
      document.getElementById("med-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const check = Forms.validate(e.target, { filename: { required: true }, url: { required: true } });
        if (!check.valid) return;
        const r = await ApiServices.media.upload(check.values);
        if (r.success) {
          Modal.close();
          Toast.success(ar ? "تم تسجيل الملف في المكتبة" : "Media uploaded");
          loadMedia();
        } else {
          Toast.error((r.error && r.error.message) || "Failed");
        }
      });
    });

    await loadMedia();
  }, { requiresAuth: true });
})();
