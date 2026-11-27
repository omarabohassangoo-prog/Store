/**
 * public/js/pages/admin/reports.js
 * صفحة التقارير القابلة للطباعة والقوالب وبث الإشعارات لمدير النظام.
 */
(function () {
  Router.add("/admin/reports", async (root) => {
    if (!Guards.requireRole(root, ["super_admin"])) return;
    const ar = I18n.getLocale() === "ar";
    const state = { page: 1, limit: 10, search: "", sort_by: "created_at", sort_dir: "desc" };

    root.innerHTML = Components.layout({
      title: I18n.t("nav_reports"),
      content: `
        <div class="tabs" id="ar-tabs">
          <button class="tab-btn active" data-tab="reports">${ar ? "التقارير" : "Reports"}</button>
          <button class="tab-btn" data-tab="templates">${ar ? "قوالب الفواتير والتقارير" : "Invoice & Report Templates"}</button>
          <button class="tab-btn" data-tab="dispatch">${ar ? "بث الإشعارات" : "Broadcast Dispatch"}</button>
        </div>

        <div id="ar-panel-reports">
          <div class="toolbar">
            <div class="toolbar-group">
              <input class="form-control" id="ar-search" style="width:220px" placeholder="${Components.escapeHtml(I18n.t("search"))}">
            </div>
            <button class="btn btn-sm" id="ar-gen-btn">➕ ${ar ? "إنشاء تقرير قابل للطباعة" : "Generate Printable Report"}</button>
          </div>
          <div class="card">
            <div id="ar-table-wrap">${Components.escapeHtml(I18n.t("loading"))}</div>
            <div id="ar-pagination"></div>
          </div>
        </div>

        <div id="ar-panel-templates" class="hidden">
          <div class="grid-2">
            <div class="card">
              <h3 class="card-title">${ar ? "قالب الفاتورة" : "Invoice Template"}</h3>
              <form id="inv-tpl-form">
                ${Forms.renderFields([
                  { name: "name", label: ar ? "اسم القالب" : "Template Name", value: "Default Invoice", required: true },
                  { name: "header_text", label: ar ? "ترويسة الفاتورة" : "Header Text", value: "سوق الكل — Souq Al-Kul" },
                  { name: "footer_text", label: ar ? "تذييل الفاتورة" : "Footer Text", value: "شكراً لتعاملكم معنا" },
                ])}
                <button class="btn" type="submit">${Components.escapeHtml(I18n.t("save"))}</button>
              </form>
              <div id="inv-tpl-list" class="mt-2"></div>
            </div>
            <div class="card">
              <h3 class="card-title">${ar ? "قالب التقرير" : "Report Template"}</h3>
              <form id="rpt-tpl-form">
                ${Forms.renderFields([
                  { name: "name", label: ar ? "اسم القالب" : "Template Name", value: "Monthly Summary", required: true },
                  { name: "report_type", label: ar ? "نوع التقرير" : "Report Type", value: "platform_summary" },
                  { name: "format", label: ar ? "التنسيق" : "Format", type: "select", value: "html", options: [{ value: "html", label: "HTML" }, { value: "json", label: "JSON" }] },
                ])}
                <button class="btn" type="submit">${Components.escapeHtml(I18n.t("save"))}</button>
              </form>
              <div id="rpt-tpl-list" class="mt-2"></div>
            </div>
          </div>
        </div>

        <div id="ar-panel-dispatch" class="hidden">
          <div class="card">
            <h3 class="card-title">${ar ? "إرسال إشعار جماعي / مباشر" : "Dispatch Notification"}</h3>
            <form id="ar-disp-form">
              ${Forms.renderFields([
                {
                  name: "channel",
                  label: ar ? "القناة" : "Channel",
                  type: "select",
                  value: "all",
                  options: [
                    { value: "all", label: "All Channels" },
                    { value: "email", label: "Email" },
                    { value: "sms", label: "SMS" },
                    { value: "whatsapp", label: "WhatsApp" },
                  ],
                },
                { name: "email", label: I18n.t("email"), type: "email", placeholder: "user@souqalkul.local" },
                { name: "phone", label: I18n.t("phone"), placeholder: "+966500000000" },
                { name: "subject", label: ar ? "الموضوع" : "Subject", required: true },
                { name: "body", label: ar ? "الرسالة" : "Message", type: "textarea", required: true },
              ])}
              <button class="btn" type="submit">📤 ${ar ? "إرسال الآن" : "Dispatch Now"}</button>
            </form>
          </div>
        </div>
      `,
    });

    document.querySelectorAll("#ar-tabs .tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("#ar-tabs .tab-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        const tab = btn.dataset.tab;
        ["reports", "templates", "dispatch"].forEach((p) => {
          document.getElementById("ar-panel-" + p).classList.toggle("hidden", p !== tab);
        });
      });
    });

    async function loadReports() {
      const tableWrap = document.getElementById("ar-table-wrap");
      const pagWrap = document.getElementById("ar-pagination");
      const res = await ApiServices.admin.listReports({
        page: state.page,
        limit: state.limit,
        search: state.search || undefined,
        sort_by: state.sort_by,
        sort_dir: state.sort_dir,
      });
      if (!res.success) {
        tableWrap.innerHTML = Components.alert("error", (res.error && res.error.message) || "Failed");
        pagWrap.innerHTML = "";
        return;
      }
      const items = (res.data && res.data.items) || [];
      window.__adminReports = items;
      DataTable.mount(tableWrap, {
        rows: items,
        sortBy: state.sort_by,
        sortDir: state.sort_dir,
        onSort: (k, d) => { state.sort_by = k; state.sort_dir = d; loadReports(); },
        columns: [
          { key: "id", label: "ID", sortable: true },
          { key: "title", label: ar ? "العنوان" : "Title", sortable: true },
          { key: "report_type", label: ar ? "النوع" : "Type" },
          { key: "format", label: ar ? "التنسيق" : "Format", render: (r) => Components.badge(r.format || "html", "info") },
          { key: "created_at", label: I18n.t("created_at"), sortable: true },
          {
            key: "actions",
            label: I18n.t("actions"),
            render: (r) => `<button class="btn btn-outline btn-sm" onclick="window.__viewAdminReport('${Components.escapeHtml(r.id)}')">🖨️ ${Components.escapeHtml(I18n.t("print"))}</button>`,
          },
        ],
      });
      const meta = (res.meta && res.meta.pagination) || { page: state.page, limit: state.limit, total: res.data && res.data.total };
      Pagination.mount(pagWrap, meta, (p) => { state.page = p; loadReports(); });
    }

    async function loadTemplates() {
      const [invRes, rptRes] = await Promise.all([
        ApiServices.admin.getInvoiceTemplates(),
        ApiServices.admin.getReportTemplates(),
      ]);
      const invList = (invRes.success && Array.isArray(invRes.data) ? invRes.data : []) || [];
      const rptList = (rptRes.success && Array.isArray(rptRes.data) ? rptRes.data : []) || [];
      document.getElementById("inv-tpl-list").innerHTML = invList.length
        ? `<div style="display:grid;gap:6px">${invList.map((t) => `<div class="alert alert-info">${Components.escapeHtml(t.name || t.id)} — ${Components.escapeHtml(t.header_text || "")}</div>`).join("")}</div>`
        : "";
      document.getElementById("rpt-tpl-list").innerHTML = rptList.length
        ? `<div style="display:grid;gap:6px">${rptList.map((t) => `<div class="alert alert-info">${Components.escapeHtml(t.name || t.id)} (${Components.escapeHtml(t.format || "html")})</div>`).join("")}</div>`
        : "";
    }

    window.__viewAdminReport = (id) => {
      const item = (window.__adminReports || []).find((x) => x.id === id);
      if (item) Modal.printable(item.title || "Report", item.printable_html || "<p>Report</p>");
    };

    document.getElementById("ar-search").addEventListener("input", (e) => {
      state.search = e.target.value.trim();
      state.page = 1;
      loadReports();
    });

    document.getElementById("ar-gen-btn").addEventListener("click", async () => {
      const r = await ApiServices.admin.generateReport({
        title: ar ? "تقرير أداء المنصة الفوري" : "Platform Performance Report",
        report_type: "platform_summary",
        format: "html",
        printable: true,
      });
      if (r.success) {
        Toast.success(ar ? "تم إنشاء التقرير" : "Report generated");
        loadReports();
      }
    });

    document.getElementById("inv-tpl-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const check = Forms.validate(e.target, { name: { required: true } });
      if (!check.valid) return;
      const r = await ApiServices.admin.saveInvoiceTemplate(check.values);
      if (r.success) {
        Toast.success(ar ? "تم حفظ قالب الفاتورة" : "Invoice template saved");
        loadTemplates();
      }
    });

    document.getElementById("rpt-tpl-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const check = Forms.validate(e.target, { name: { required: true } });
      if (!check.valid) return;
      const r = await ApiServices.admin.saveReportTemplate(check.values);
      if (r.success) {
        Toast.success(ar ? "تم حفظ قالب التقرير" : "Report template saved");
        loadTemplates();
      }
    });

    document.getElementById("ar-disp-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const check = Forms.validate(e.target, { subject: { required: true }, body: { required: true } });
      if (!check.valid) return;
      const r = await ApiServices.admin.dispatchNotification(check.values);
      if (r.success) {
        Toast.success(ar ? "تم بث الإشعار بنجاح" : "Notification dispatched");
        e.target.reset();
      } else {
        Toast.error((r.error && r.error.message) || "Failed");
      }
    });

    await Promise.all([loadReports(), loadTemplates()]);
  }, { requiresAuth: true, roles: ["super_admin"] });
})();
