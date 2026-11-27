/**
 * public/js/pages/public/contact.js
 * صفحة تواصل معنا العامة لإرسال الاستفسارات.
 */
(function () {
  Router.add("/contact", async (root) => {
    const ar = I18n.getLocale() === "ar";
    root.innerHTML = PublicLayout.render({
      title: I18n.t("pub_contact"),
      content: `
        <div class="grid-2">
          <div class="card">
            <h2 class="card-title">${ar ? "أرسل لنا رسالة" : "Send Us a Message"}</h2>
            <div id="pub-contact-alert"></div>
            <form id="pub-contact-form">
              ${Forms.renderFields([
                { name: "name", label: I18n.t("full_name"), required: true },
                { name: "email", label: I18n.t("email"), type: "email", required: true },
                { name: "subject", label: ar ? "الموضوع" : "Subject", required: true },
                { name: "message", label: ar ? "الرسالة" : "Message", type: "textarea", required: true },
              ])}
              <button class="btn" type="submit" id="pub-contact-btn">✉️ ${Components.escapeHtml(I18n.t("submit"))}</button>
            </form>
          </div>
          <div class="card">
            <h2 class="card-title">${ar ? "معلومات التواصل والدعم" : "Support Channels"}</h2>
            <p style="color:var(--fg-muted);line-height:1.8;margin-bottom:14px">
              ${ar
                ? "يسعد فريق خدمة العملاء والعمليات في سوق الكل بالإجابة عن جميع استفسارات العملاء والتجار على مدار الساعة."
                : "Our Souq Al-Kul customer care and vendor operations team is ready to assist with orders, store onboarding, and partnerships."}
            </p>
            <div style="display:grid;gap:10px">
              <div class="alert alert-info" style="margin-bottom:0">📧 support@souqalkul.local</div>
              <div class="alert alert-info" style="margin-bottom:0">🏢 ${ar ? "الرياض — المملكة العربية السعودية" : "Riyadh — Saudi Arabia"}</div>
              <a href="#/track" class="btn btn-outline btn-sm">🚚 ${Components.escapeHtml(I18n.t("pub_track"))}</a>
            </div>
          </div>
        </div>
      `,
    });

    document.getElementById("pub-contact-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const check = Forms.validate(e.target, {
        name: { required: true },
        email: { required: true, email: true },
        subject: { required: true },
        message: { required: true, minLength: 5 },
      });
      if (!check.valid) return;
      const btn = document.getElementById("pub-contact-btn");
      const alertEl = document.getElementById("pub-contact-alert");
      btn.disabled = true;
      const r = await ApiServices.publicCatalog.submitContact(check.values);
      btn.disabled = false;
      if (!r.success) {
        alertEl.innerHTML = Components.alert("error", (r.error && r.error.message) || "Failed to send");
        return;
      }
      e.target.reset();
      alertEl.innerHTML = Components.alert(
        "success",
        (ar ? "تم استلام رسالتك بنجاح! رقم المرجع: " : "Message received! Reference ID: ") + (r.data && r.data.reference_id)
      );
      Toast.success(ar ? "تم إرسال الرسالة" : "Message submitted");
    });
  });
})();
