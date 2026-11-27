/**
 * public/js/pagination.js
 * مكون الترقيم (Pagination) المتوافق مع PaginationMeta من UnifiedJsonRouter.
 */
(function () {
  function render(meta) {
    const m = meta || {};
    const page = Number(m.page || 1);
    const total = typeof m.total === "number" ? m.total : null;
    const totalPages = Number(m.total_pages || 1);
    const hasPrev = Boolean(m.has_prev ?? page > 1);
    const hasNext = Boolean(m.has_next ?? page < totalPages);
    const ar = window.I18n && I18n.getLocale() === "ar";

    if (total === 0) return "";

    const infoText = total !== null
      ? (ar ? `صفحة ${page} من ${totalPages} (الإجمالي: ${total})` : `Page ${page} of ${totalPages} (${total} total)`)
      : (ar ? `صفحة ${page}` : `Page ${page}`);

    return `
      <div class="toolbar mt-2" style="margin-bottom:0">
        <span style="font-size:0.85rem;color:var(--fg-muted)">${infoText}</span>
        <div class="toolbar-group">
          <button type="button" class="btn btn-outline btn-sm" data-page-target="${page - 1}" ${hasPrev ? "" : "disabled"}>
            ${ar ? "السابق" : "Previous"}
          </button>
          <button type="button" class="btn btn-outline btn-sm" data-page-target="${page + 1}" ${hasNext ? "" : "disabled"}>
            ${ar ? "التالي" : "Next"}
          </button>
        </div>
      </div>
    `;
  }

  function mount(containerEl, meta, onPageChange) {
    if (!containerEl) return;
    containerEl.innerHTML = render(meta);
    if (typeof onPageChange === "function") {
      containerEl.querySelectorAll("[data-page-target]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const target = Number(btn.getAttribute("data-page-target"));
          if (Number.isFinite(target) && target >= 1) onPageChange(target);
        });
      });
    }
  }

  window.Pagination = { render, mount };
})();
