/**
 * public/js/pages/public/verify.js
 * صفحة التحقق عبر رمز OTP / 2FA العامة.
 */
(function () {
  Router.add("/verify", async (root) => {
    const ar = I18n.getLocale() === "ar";
    root.innerHTML = PublicLayout.render({
      title: I18n.t("pub_verify"),
      content: `
        <div class="grid-2" style="max-width:860px;margin:0 auto">
          <div class="card">
            <h2 class="card-title">${ar ? "1. إرسال رمز التحقق (OTP)" : "1. Send Verification Code"}</h2>
            <form id="otp-send-form">
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
                  ],
                },
                { name: "target", label: ar ? "البريد الإلكتروني أو الهاتف" : "Email or Phone", required: true },
              ])}
              <button class="btn" type="submit">${ar ? "إرسال الرمز" : "Send OTP"}</button>
            </form>
            <div id="otp-send-alert" class="mt-1"></div>
          </div>

          <div class="card">
            <h2 class="card-title">${ar ? "2. تأكيد الرمز" : "2. Verify Code"}</h2>
            <form id="otp-verify-form">
              ${Forms.renderFields([
                { name: "code", label: ar ? "رمز التحقق (6 أرقام)" : "6-Digit Code", required: true, placeholder: "123456" },
              ])}
              <button class="btn btn-outline" type="submit">${ar ? "تحقق الآن" : "Verify Code"}</button>
            </form>
            <div id="otp-verify-alert" class="mt-1"></div>
          </div>
        </div>
      `,
    });

    document.getElementById("otp-send-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const check = Forms.validate(e.target, { target: { required: true } });
      if (!check.valid) return;
      const r = await ApiServices.auth.sendOtp({ ...check.values, purpose: "verify_contact" });
      const alertEl = document.getElementById("otp-send-alert");
      if (r.success) {
        alertEl.innerHTML = Components.alert("success", ar ? "تم إرسال رمز التحقق بنجاح" : "OTP dispatched");
      } else {
        alertEl.innerHTML = Components.alert("error", (r.error && r.error.message) || "Failed");
      }
    });

    document.getElementById("otp-verify-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const check = Forms.validate(e.target, { code: { required: true, minLength: 4 } });
      if (!check.valid) return;
      const r = await ApiServices.auth.verify2fa({ code: check.values.code });
      const alertEl = document.getElementById("otp-verify-alert");
      if (r.success) {
        alertEl.innerHTML = Components.alert("success", ar ? "تم التحقق من الرمز بنجاح" : "Code verified");
      } else {
        alertEl.innerHTML = Components.alert("error", (r.error && r.error.message) || "Invalid code");
      }
    });
  });
})();
