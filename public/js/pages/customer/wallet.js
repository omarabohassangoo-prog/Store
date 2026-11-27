/**
 * public/js/pages/customer/wallet.js
 * صفحة المحفظة الإلكترونية وسجل المعاملات للعميل.
 */
(function () {
  Router.add("/customer/wallet", async (root) => {
    if (!Guards.requireRole(root, ["customer", "super_admin"])) return;
    const ar = I18n.getLocale() === "ar";

    root.innerHTML = Components.layout({
      title: I18n.t("nav_c_wallet"),
      content: `<div id="cwl-root">${Components.escapeHtml(I18n.t("loading"))}</div>`,
    });

    async function loadWallet() {
      const res = await ApiServices.customer.getWallet();
      const w = (res.success && res.data) || { balance: 0, currency: "SAR", transactions: [] };
      const rootEl = document.getElementById("cwl-root");
      rootEl.innerHTML = `
        <div class="grid-2">
          <div class="stat-card">
            <div class="stat-value">${Components.escapeHtml(w.balance ?? 0)} ${Components.escapeHtml(w.currency || "SAR")}</div>
            <div class="stat-label">${ar ? "الرصيد الحالي" : "Current Balance"}</div>
          </div>
          <div class="card">
            <h3 class="card-title">${ar ? "شحن المحفظة" : "Top Up Wallet"}</h3>
            <form id="cwl-form" style="display:flex;gap:8px;align-items:flex-start">
              <div style="flex:1">
                <input class="form-control" name="amount" id="cwl-amt" type="number" min="1" placeholder="100" required>
              </div>
              <button class="btn" type="submit">${ar ? "شحن" : "Top Up"}</button>
            </form>
          </div>
        </div>
        <div class="card mt-2">
          <h3 class="card-title">${ar ? "سجل المعاملات" : "Transactions"}</h3>
          <div id="cwl-table-wrap"></div>
        </div>
      `;

      DataTable.mount(document.getElementById("cwl-table-wrap"), {
        rows: w.transactions || [],
        columns: [
          { key: "id", label: "ID" },
          { key: "type", label: ar ? "النوع" : "Type", render: (tx) => Components.badge(tx.type || "topup", "info") },
          { key: "amount", label: ar ? "المبلغ" : "Amount", render: (tx) => `${Components.escapeHtml(tx.amount ?? 0)} SAR` },
          { key: "created_at", label: I18n.t("created_at") },
        ],
      });

      document.getElementById("cwl-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const check = Forms.validate(e.target, { amount: { required: true, min: 1 } });
        if (!check.valid) return;
        const r = await ApiServices.customer.topupWallet(Number(check.values.amount));
        if (r.success) {
          Toast.success(ar ? "تم شحن المحفظة بنجاح" : "Wallet topped up");
          loadWallet();
        } else {
          Toast.error((r.error && r.error.message) || "Failed");
        }
      });
    }

    await loadWallet();
  }, { requiresAuth: true, roles: ["customer", "super_admin"] });
})();
