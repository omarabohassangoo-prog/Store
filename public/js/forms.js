/**
 * public/js/forms.js
 * بناء النماذج والتحقق من المدخلات واستخراج القيم.
 */
(function () {
  function escape(val) {
    if (window.Components && Components.escapeHtml) return Components.escapeHtml(val);
    return String(val == null ? "" : val)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function serialize(formEl) {
    const data = {};
    if (!formEl) return data;
    const elements = formEl.querySelectorAll("input, select, textarea");
    elements.forEach((el) => {
      const name = el.name || el.id;
      if (!name || el.disabled) return;
      if (el.type === "checkbox") {
        data[name] = Boolean(el.checked);
      } else if (el.type === "number") {
        data[name] = el.value === "" ? null : Number(el.value);
      } else {
        data[name] = typeof el.value === "string" ? el.value.trim() : el.value;
      }
    });
    return data;
  }

  function clearErrors(formEl) {
    if (!formEl) return;
    formEl.querySelectorAll(".form-control.error").forEach((el) => el.classList.remove("error"));
    formEl.querySelectorAll(".field-error-msg").forEach((el) => el.remove());
  }

  function showFieldError(inputEl, message) {
    if (!inputEl) return;
    inputEl.classList.add("error");
    const msg = document.createElement("div");
    msg.className = "field-error-msg";
    msg.style.color = "var(--danger)";
    msg.style.fontSize = "0.78rem";
    msg.style.marginTop = "4px";
    msg.textContent = message;
    inputEl.insertAdjacentElement("afterend", msg);
  }

  function validate(formEl, rules) {
    clearErrors(formEl);
    const ar = window.I18n && I18n.getLocale() === "ar";
    const values = serialize(formEl);
    let valid = true;

    Object.entries(rules || {}).forEach(([field, rule]) => {
      const inputEl = formEl.querySelector(`[name="${field}"], #${field}`);
      const val = values[field];
      const str = val == null ? "" : String(val);

      if (rule.required && !str.trim()) {
        valid = false;
        showFieldError(inputEl, rule.message || (ar ? "هذا الحقل مطلوب" : "This field is required"));
        return;
      }
      if (rule.email && str && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)) {
        valid = false;
        showFieldError(inputEl, rule.message || (ar ? "البريد الإلكتروني غير صالح" : "Invalid email address"));
        return;
      }
      if (typeof rule.minLength === "number" && str.length < rule.minLength) {
        valid = false;
        showFieldError(
          inputEl,
          rule.message || (ar ? `يجب ألا يقل عن ${rule.minLength} أحرف` : `Must be at least ${rule.minLength} characters`)
        );
        return;
      }
      if (typeof rule.min === "number" && Number(val) < rule.min) {
        valid = false;
        showFieldError(inputEl, rule.message || (ar ? `القيمة يجب أن تكون ${rule.min} فأكثر` : `Must be at least ${rule.min}`));
      }
    });

    return { valid, values };
  }

  function renderFields(fields) {
    return (fields || []).map((f) => {
      const id = escape(f.id || f.name);
      const name = escape(f.name || f.id);
      const val = escape(f.value != null ? f.value : "");
      const req = f.required ? "required" : "";
      if (f.type === "select") {
        const opts = (f.options || []).map((o) =>
          `<option value="${escape(o.value)}" ${String(o.value) === String(f.value) ? "selected" : ""}>${escape(o.label)}</option>`
        ).join("");
        return `<div class="form-group"><label for="${id}">${escape(f.label)}</label><select class="form-control" id="${id}" name="${name}" ${req}>${opts}</select></div>`;
      }
      if (f.type === "textarea") {
        return `<div class="form-group"><label for="${id}">${escape(f.label)}</label><textarea class="form-control" id="${id}" name="${name}" ${req}>${val}</textarea></div>`;
      }
      return `<div class="form-group"><label for="${id}">${escape(f.label)}</label><input class="form-control" id="${id}" name="${name}" type="${escape(f.type || "text")}" value="${val}" placeholder="${escape(f.placeholder || "")}" ${req}></div>`;
    }).join("");
  }

  window.Forms = { serialize, clearErrors, showFieldError, validate, renderFields };
})();
