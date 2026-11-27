/**
 * public/js/pages/public/track.js
 * صفحة تتبع الشحنات العامة برقم التتبع.
 */
(function () {
  Router.add("/track", async (root) => {
    const ar = I18n.getLocale() === "ar";
    root.innerHTML = PublicLayout.render({
      title: I18n.t("pub_track"),
      content: `
        <div class="card" style="max-width:680px;margin:0 auto">
          <p style="color:var(--fg-muted);margin-bottom:14px">
            ${ar ? "أدخل رقم تتبع الشحنة للاطلاع على حالتها الحالية ومسار التوصيل (مثال: TRK-SQ-88412)." : "Enter your shipment tracking number to check its delivery status (e.g., TRK-SQ-88412)."}
          </p>
          <form id="pub-track-form" style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-start">
            <div style="flex:1;min-width:220px">
              <input class="form-control" name="tracking" id="pub-trk-input" placeholder="TRK-SQ-88412" required>
            </div>
            <button class="btn" type="submit">🔍 ${ar ? "تتبع الآن" : "Track Now"}</button>
          </form>
          <div id="pub-trk-result" class="mt-2"></div>
        </div>
      `,
    });

    document.getElementById("pub-track-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const check = Forms.validate(e.target, { tracking: { required: true } });
      if (!check.valid) return;
      const resultEl = document.getElementById("pub-trk-result");
      resultEl.innerHTML = `<p>${Components.escapeHtml(I18n.t("loading"))}</p>`;

      const r = await ApiServices.publicCatalog.trackShipment(check.values.tracking);
      if (!r.success || !r.data) {
        resultEl.innerHTML = Components.alert("error", (r.error && r.error.message) || "Not found");
        return;
      }
      const d = r.data;
      resultEl.innerHTML = `
        <div class="card" style="padding:16px">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
            <div>
              <strong>${Components.escapeHtml(d.tracking_number)}</strong>
              <div style="font-size:0.85rem;color:var(--fg-muted)">${ar ? "شركة الشحن:" : "Carrier:"} ${Components.escapeHtml(d.carrier)}</div>
            </div>
            ${Components.statusBadge(d.status)}
          </div>
          <div class="mt-2" style="display:grid;gap:8px">
            ${(d.events || []).map((ev) => `
              <div class="alert alert-info" style="margin-bottom:0">
                ${Components.escapeHtml(ev.status)} — ${Components.escapeHtml(ev.carrier)} (${Components.escapeHtml(ev.timestamp || "")})
              </div>
            `).join("")}
          </div>
        </div>
      `;
    });
  });
})();
