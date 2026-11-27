/**
 * public/js/pages/public/blog.js
 * صفحة المدونة العامة وقراءة المقالات.
 */
(function () {
  Router.add("/blog", async (root) => {
    const ar = I18n.getLocale() === "ar";
    const state = { page: 1, limit: 9, search: "" };

    root.innerHTML = PublicLayout.render({
      title: I18n.t("pub_blog"),
      content: `
        <div class="toolbar">
          <input class="form-control" id="pub-blog-search" style="width:240px" placeholder="${Components.escapeHtml(I18n.t("search"))}">
        </div>
        <div id="pub-blog-list">${Components.escapeHtml(I18n.t("loading"))}</div>
        <div id="pub-blog-pagination" class="mt-2"></div>
      `,
    });

    async function loadPosts() {
      const listEl = document.getElementById("pub-blog-list");
      const pagEl = document.getElementById("pub-blog-pagination");
      const res = await ApiServices.publicCatalog.listPosts({
        page: state.page,
        limit: state.limit,
        search: state.search || undefined,
      });
      if (!res.success) {
        listEl.innerHTML = Components.alert("error", (res.error && res.error.message) || "Failed");
        return;
      }
      const items = (res.data && res.data.items) || [];
      if (items.length === 0) {
        listEl.innerHTML = `<div class="card"><p class="empty-state">${Components.escapeHtml(I18n.t("no_data"))}</p></div>`;
        pagEl.innerHTML = "";
        return;
      }
      listEl.innerHTML = `
        <div class="grid-3">
          ${items.map((post) => {
            const title = (post.title_i18n && (post.title_i18n[I18n.getLocale()] || post.title_i18n.ar || post.title_i18n.en)) || post.slug;
            const body = (post.body_i18n && (post.body_i18n[I18n.getLocale()] || post.body_i18n.ar || post.body_i18n.en)) || "";
            return `
              <article class="card" style="margin-top:0;display:flex;flex-direction:column;gap:10px">
                <h3 style="font-size:1.08rem">${Components.escapeHtml(title)}</h3>
                <p style="font-size:0.9rem;color:var(--fg-muted)">${Components.escapeHtml(String(body).slice(0, 150))}</p>
                <div style="font-size:0.78rem;color:var(--fg-muted)">${Components.escapeHtml((post.created_at || "").slice(0, 10))}</div>
                <a href="#/blog/${encodeURIComponent(post.slug || post.id)}" class="btn btn-outline btn-sm" style="margin-top:auto">
                  ${ar ? "قراءة المقال" : "Read Article"}
                </a>
              </article>
            `;
          }).join("")}
        </div>
      `;
      const meta = (res.meta && res.meta.pagination) || { page: state.page, limit: state.limit, total: res.data && res.data.total };
      Pagination.mount(pagEl, meta, (p) => { state.page = p; loadPosts(); });
    }

    document.getElementById("pub-blog-search").addEventListener("input", (e) => {
      state.search = e.target.value.trim();
      state.page = 1;
      loadPosts();
    });

    await loadPosts();
  });

  Router.add("/blog/:slug", async (root, params) => {
    const ar = I18n.getLocale() === "ar";
    root.innerHTML = PublicLayout.render({
      content: `<div id="pub-art-root">${Components.escapeHtml(I18n.t("loading"))}</div>`,
    });
    const res = await ApiServices.publicCatalog.getPost(params.slug);
    const el = document.getElementById("pub-art-root");
    if (!res.success || !res.data) {
      el.innerHTML = Components.alert("error", (res.error && res.error.message) || I18n.t("error_404")) +
        `<a href="#/blog" class="btn btn-outline">${ar ? "العودة للمدونة" : "Back to Blog"}</a>`;
      return;
    }
    const post = res.data;
    const title = (post.title_i18n && (post.title_i18n[I18n.getLocale()] || post.title_i18n.ar || post.title_i18n.en)) || post.slug;
    const body = (post.body_i18n && (post.body_i18n[I18n.getLocale()] || post.body_i18n.ar || post.body_i18n.en)) || "";
    el.innerHTML = `
      <div class="mb-2"><a href="#/blog" class="btn btn-ghost btn-sm">← ${ar ? "العودة للمدونة" : "Back to Blog"}</a></div>
      <article class="card">
        <h1 style="font-size:1.7rem;margin-bottom:8px">${Components.escapeHtml(title)}</h1>
        <div style="font-size:0.84rem;color:var(--fg-muted);margin-bottom:18px">${Components.escapeHtml((post.created_at || "").slice(0, 10))}</div>
        <div style="line-height:1.8;white-space:pre-wrap">${Components.escapeHtml(body)}</div>
      </article>
    `;
  });
})();
