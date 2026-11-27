/**
 * public/js/table.js
 * مكون الجداول التفاعلية القابلة للفرز وإعادة الاستخدام.
 */
(function () {
  function escape(val) {
    if (window.Components && Components.escapeHtml) return Components.escapeHtml(val);
    return String(val == null ? "" : val)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function render(opts) {
    opts = opts || {};
    const columns = opts.columns || [];
    const rows = Array.isArray(opts.rows) ? opts.rows : [];
    const emptyText = opts.emptyText || (window.I18n ? I18n.t("no_data") : "No data");
    const sortBy = opts.sortBy || null;
    const sortDir = opts.sortDir || "desc";

    if (rows.length === 0) {
      return `<p class="empty-state">${escape(emptyText)}</p>`;
    }

    const headHtml = columns.map((col) => {
      if (col.sortable) {
        const indicator = sortBy === col.key ? (sortDir === "asc" ? " ▲" : " ▼") : " ⇅";
        return `<th><button type="button" class="btn btn-ghost btn-sm" data-sort-key="${escape(col.key)}" style="border:none;padding:2px 4px;font-weight:700;color:var(--fg-muted)">${escape(col.label)}${indicator}</button></th>`;
      }
      return `<th>${escape(col.label)}</th>`;
    }).join("");

    const bodyHtml = rows.map((row) => {
      const cells = columns.map((col) => {
        const content = typeof col.render === "function" ? col.render(row) : escape(row[col.key] ?? "—");
        return `<td>${content}</td>`;
      }).join("");
      return `<tr>${cells}</tr>`;
    }).join("");

    return `
      <div class="table-wrap">
        <table>
          <thead><tr>${headHtml}</tr></thead>
          <tbody>${bodyHtml}</tbody>
        </table>
      </div>
    `;
  }

  function mount(containerEl, opts) {
    if (!containerEl) return;
    containerEl.innerHTML = render(opts);
    if (typeof opts.onSort === "function") {
      containerEl.querySelectorAll("[data-sort-key]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const key = btn.getAttribute("data-sort-key");
          const nextDir = opts.sortBy === key && opts.sortDir === "asc" ? "desc" : "asc";
          opts.onSort(key, nextDir);
        });
      });
    }
  }

  window.DataTable = { render, mount };
})();
