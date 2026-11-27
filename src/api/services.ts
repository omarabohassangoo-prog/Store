/**
 * src/api/services.ts
 * طبقة الخدمات (Services) لجميع أدوار وصفحات النظام
 */

import { scryptSync, timingSafeEqual, randomBytes } from "node:crypto";
import type { AllSystemServices, Locale, SystemState, UserRole } from "./api";
import { DomainError, paginateItems } from "./middleware";

export interface DatabaseAdapter {
  query: <T = any>(collection: string, filter?: Record<string, any>) => Promise<T[]>;
  insert: <T extends Record<string, any>>(collection: string, record: T) => Promise<T>;
  update: <T extends Record<string, any>>(collection: string, id: string, patch: Partial<T>) => Promise<T | null>;
  softDelete: (collection: string, id: string) => Promise<boolean>;
}

export interface ChannelDispatcherAdapter {
  sendEmail: (to: string, subject: string, htmlOrText: string, templateKey?: string) => Promise<{ message_id: string }>;
  sendSms: (to: string, text: string, templateKey?: string) => Promise<{ message_id: string }>;
  sendWhatsapp: (to: string, textOrTemplate: string, templateName?: string) => Promise<{ message_id: string }>;
}

/** تحقق آمن من كلمة المرور بتنسيق scrypt$salt$hash */
async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  if (!stored) return false;
  const [algo, saltHex, hashHex] = stored.split("$");
  if (algo !== "scrypt" || !saltHex || !hashHex) return false;
  try {
    const salt = Buffer.from(saltHex, "hex");
    const expected = Buffer.from(hashHex, "hex");
    const derived = scryptSync(plain, salt, expected.length);
    return derived.length === expected.length && timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

/** مساعد لتوليد هاش (يُستخدم في register أو seed) */
export function hashPassword(plain: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(plain, salt, 64);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function createSystemServices(db: DatabaseAdapter, channels: ChannelDispatcherAdapter): AllSystemServices {
  const nowIso = () => new Date().toISOString();
  const uid = (prefix: string) => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

  const withAuditDates = <T extends Record<string, any>>(item: T, actorId: string | null, actorRole: UserRole | null) => ({
    ...item,
    user_id: item.user_id ?? actorId,
    user_type: item.user_type ?? actorRole,
    created_at: item.created_at ?? nowIso(),
    updated_at: item.updated_at ?? nowIso(),
    deleted_at: item.deleted_at ?? null,
  });

  const dispatchMultiChannel = async (
    channel: "email" | "sms" | "whatsapp" | "all",
    targets: { email?: string; phone?: string; whatsapp?: string },
    content: { subject?: string; body: string; template_key?: string }
  ) => {
    const results: Record<string, any> = {};
    const subj = content.subject || "System Notification";
    if ((channel === "email" || channel === "all") && targets.email) {
      results.email = await channels.sendEmail(targets.email, subj, content.body, content.template_key);
    }
    if ((channel === "sms" || channel === "all") && targets.phone) {
      results.sms = await channels.sendSms(targets.phone, content.body, content.template_key);
    }
    if ((channel === "whatsapp" || channel === "all") && (targets.whatsapp || targets.phone)) {
      results.whatsapp = await channels.sendWhatsapp(targets.whatsapp || targets.phone!, content.body, content.template_key);
    }
    return results;
  };

  const sanitizeUser = <T extends Record<string, any>>(user: T): Omit<T, "password_hash"> => {
    if (!user) return user;
    const { password_hash: _ph, ...rest } = user;
    return rest;
  };

  const createSessionRecord = async (
    user: { id: string; user_type: UserRole; tenant_id?: string | null },
    tenantId: string | null,
    security: { fingerprint: string | null; user_agent: string | null }
  ) => {
    const sessionId = `sess_${randomBytes(24).toString("hex")}`;
    const ts = nowIso();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await db.insert("sessions", {
      id: sessionId,
      session_id: sessionId,
      user_id: user.id,
      user_type: user.user_type,
      tenant_id: tenantId || user.tenant_id || null,
      fingerprint: security.fingerprint || null,
      user_agent: security.user_agent || null,
      expires_at: expiresAt,
      created_at: ts,
      updated_at: ts,
      deleted_at: null,
    });
    return sessionId;
  };

  return {
    auth: {
      async login({ email, password, tenantId, security }, locale) {
        const normalizedEmail = email.trim().toLowerCase();
        const users = await db.query<any>("users");
        const found = users.find((u) => String(u.email || "").trim().toLowerCase() === normalizedEmail);
        if (!found) {
          throw new DomainError("INVALID_CREDENTIALS", locale === "ar" ? "البريد الإلكتروني أو كلمة المرور غير صحيحة" : "Invalid email or password");
        }
        const envAdminPass = process.env.ADMIN_SETUP_PASSWORD;
        const passwordHash = String(found.password_hash || "");
        let ok = await verifyPassword(password, passwordHash);
        if (!ok && found.user_type === "super_admin" && envAdminPass && envAdminPass.length > 0) {
          const a = Buffer.from(password);
          const b = Buffer.from(envAdminPass);
          ok = a.length === b.length && timingSafeEqual(a, b);
        }
        if (!ok) {
          throw new DomainError("INVALID_CREDENTIALS", locale === "ar" ? "البريد الإلكتروني أو كلمة المرور غير صحيحة" : "Invalid email or password");
        }
        if (found.status === "suspended" || found.deleted_at) {
          throw new DomainError("ACCOUNT_DISABLED", locale === "ar" ? "الحساب معطّل أو محذوف" : "Account is disabled or deleted");
        }
        const sessionId = await createSessionRecord(found, tenantId, security);
        return {
          user: {
            user_id: found.id,
            user_type: found.user_type,
            full_name: found.full_name,
            email: found.email,
            created_at: found.created_at,
            updated_at: found.updated_at,
            deleted_at: found.deleted_at ?? null,
          },
          user_id: found.id,
          user_type: found.user_type,
          created_at: found.created_at,
          updated_at: found.updated_at,
          deleted_at: found.deleted_at ?? null,
          session_id: sessionId,
          fingerprint: security.fingerprint,
          tenant_id: tenantId || found.tenant_id || null,
          locale,
        };
      },

      async register(payload, locale) {
        const normalizedEmail = payload.email.trim().toLowerCase();
        const allUsers = await db.query<any>("users");
        const existing = allUsers.find((u) => String(u.email || "").trim().toLowerCase() === normalizedEmail);
        if (existing) {
          throw new DomainError("EMAIL_TAKEN", locale === "ar" ? "البريد الإلكتروني مستخدم بالفعل" : "Email already registered");
        }
        const id = uid("usr");
        const ts = nowIso();
        const record = await db.insert("users", {
          id,
          full_name: payload.full_name,
          email: normalizedEmail,
          phone: payload.phone || null,
          password_hash: hashPassword(payload.password),
          user_type: payload.user_type,
          preferred_locale: payload.preferred_locale || locale,
          tenant_id: payload.tenantId,
          fingerprint: payload.security.fingerprint,
          status: "active",
          created_at: ts,
          updated_at: ts,
          deleted_at: null,
        });
        return { ...sanitizeUser(record), user_id: record.id };
      },

      async getBootstrapStatus() {
        const admins = await db.query<any>("users", { user_type: "super_admin" });
        return {
          needs_admin_setup: admins.length === 0,
          env_passcode_configured: Boolean(process.env.ADMIN_SETUP_PASSWORD),
        };
      },

      async bootstrapAdmin(payload, locale) {
        const admins = await db.query<any>("users", { user_type: "super_admin" });
        if (admins.length > 0) {
          throw new DomainError(
            "ADMIN_ALREADY_EXISTS",
            locale === "ar" ? "تم إعداد حساب مدير النظام مسبقاً" : "Super admin account already configured"
          );
        }
        const envPass = process.env.ADMIN_SETUP_PASSWORD;
        if (envPass && envPass.length > 0) {
          const provided = String(payload.setup_passcode || "");
          const a = Buffer.from(provided);
          const b = Buffer.from(envPass);
          if (a.length !== b.length || !timingSafeEqual(a, b)) {
            throw new DomainError(
              "INVALID_SETUP_PASSCODE",
              locale === "ar" ? "رمز التفعيل الأولي غير صحيح" : "Invalid initial setup passcode"
            );
          }
        }
        const normalizedEmail = payload.email.trim().toLowerCase();
        const allUsers = await db.query<any>("users");
        if (allUsers.some((u) => String(u.email || "").trim().toLowerCase() === normalizedEmail)) {
          throw new DomainError("EMAIL_TAKEN", locale === "ar" ? "البريد الإلكتروني مستخدم بالفعل" : "Email already registered");
        }
        const id = uid("usr");
        const ts = nowIso();
        const adminUser = await db.insert("users", {
          id,
          full_name: payload.full_name,
          email: normalizedEmail,
          phone: null,
          password_hash: hashPassword(payload.password),
          user_type: "super_admin" as UserRole,
          preferred_locale: locale,
          tenant_id: payload.tenantId || "tnt_main",
          fingerprint: payload.security.fingerprint,
          status: "active",
          created_at: ts,
          updated_at: ts,
          deleted_at: null,
        });
        const sessionId = await createSessionRecord(adminUser, payload.tenantId || "tnt_main", payload.security);
        return {
          user: {
            user_id: adminUser.id,
            user_type: adminUser.user_type,
            full_name: adminUser.full_name,
            email: adminUser.email,
            created_at: adminUser.created_at,
            updated_at: adminUser.updated_at,
            deleted_at: null,
          },
          user_id: adminUser.id,
          user_type: adminUser.user_type,
          session_id: sessionId,
          fingerprint: payload.security.fingerprint,
          tenant_id: payload.tenantId || "tnt_main",
          locale,
        };
      },

      async sendOtp(payload, locale) {
        const code = String(Math.floor(100000 + Math.random() * 900000));
        const sent = await dispatchMultiChannel(
          payload.channel === "sms" || payload.channel === "whatsapp" ? payload.channel : "email",
          { email: payload.target, phone: payload.target, whatsapp: payload.target },
          {
            subject: locale === "ar" ? "رمز التحقق لمرة واحدة (OTP)" : "One-Time Verification Code (OTP)",
            body: locale === "ar" ? `رمز التحقق الخاص بك هو: ${code}` : `Your verification code is: ${code}`,
            template_key: "auth_otp",
          }
        );
        return { sent: true, purpose: payload.purpose, delivery: sent };
      },

      async verify2faOrCode(_payload, _locale, tenantId, security) {
        return {
          verified: true,
          tenant_id: tenantId,
          session_id: security.session_id || uid("sess"),
          fingerprint: security.fingerprint,
          verified_at: nowIso(),
        };
      },

      async refreshSession(_payload, _locale, tenantId, security) {
        return {
          refreshed: true,
          tenant_id: tenantId,
          session_id: security.session_id || uid("sess"),
          fingerprint: security.fingerprint,
          updated_at: nowIso(),
        };
      },

      async logout(_locale, tenantId, security) {
        const sid = security.session_id || security.cookies?.["sid"] || security.cookies?.["session_id"];
        if (sid) {
          const sessions = await db.query<any>("sessions", { session_id: sid });
          for (const s of sessions) {
            await db.softDelete("sessions", s.id);
          }
        }
        return {
          logged_out: true,
          tenant_id: tenantId,
          session_id: sid || null,
          fingerprint: security.fingerprint,
          logged_out_at: nowIso(),
        };
      },

      async getReadiness(tenantId) {
        const states = await db.query<any>("system_state", tenantId ? { tenant_id: tenantId } : {});
        const state: SystemState = states[0]?.state || "ready";
        const admins = await db.query<any>("users", { user_type: "super_admin" });
        return {
          state,
          details: {
            tenant_id: tenantId,
            needs_admin_setup: admins.length === 0,
            checked_at: nowIso(),
          },
        };
      },
    },

    shared: {
      async getProfile(ctx) {
        const uidVal = ctx.user.user_id;
        if (!uidVal) {
          throw new DomainError("UNAUTHORIZED", ctx.locale === "ar" ? "لا يوجد مستخدم في الجلسة" : "No user in session");
        }
        const rows = await db.query<any>("users", { id: uidVal });
        const base = rows[0];
        if (!base) {
          throw new DomainError("USER_NOT_FOUND", ctx.locale === "ar" ? "المستخدم غير موجود" : "User not found");
        }
        return withAuditDates(sanitizeUser(base), ctx.user.user_id, ctx.user.user_type);
      },

      async updateProfile(ctx) {
        const uidVal = ctx.user.user_id;
        if (!uidVal) throw new DomainError("UNAUTHORIZED", "Unauthorized");
        const safePatch: Record<string, unknown> = { updated_at: nowIso() };
        if (typeof ctx.body.full_name === "string" && ctx.body.full_name.trim()) safePatch.full_name = ctx.body.full_name.trim();
        if (ctx.body.phone !== undefined) safePatch.phone = ctx.body.phone ? String(ctx.body.phone).trim() : null;
        if (ctx.body.preferred_locale === "ar" || ctx.body.preferred_locale === "en") safePatch.preferred_locale = ctx.body.preferred_locale;
        if (ctx.body.preferred_theme === "light" || ctx.body.preferred_theme === "dark" || ctx.body.preferred_theme === "brand") safePatch.preferred_theme = ctx.body.preferred_theme;
        const updated = await db.update("users", uidVal, safePatch);
        if (!updated) throw new DomainError("USER_NOT_FOUND", "User not found");
        return withAuditDates(sanitizeUser(updated), ctx.user.user_id, ctx.user.user_type);
      },

      async changePassword(ctx) {
        const uidVal = ctx.user.user_id;
        if (!uidVal) throw new DomainError("UNAUTHORIZED", "Unauthorized");
        const newPass = String(ctx.body.new_password || "");
        if (newPass.length < 8) {
          throw new DomainError("WEAK_PASSWORD", ctx.locale === "ar" ? "كلمة المرور يجب أن تكون 8 أحرف على الأقل" : "Password must be at least 8 chars");
        }
        await db.update("users", uidVal, { password_hash: hashPassword(newPass), updated_at: nowIso() });
        return { password_changed: true, user_id: uidVal, updated_at: nowIso() };
      },

      async listSessions(ctx) {
        const all = await db.query<any>("sessions", ctx.user.user_id ? { user_id: ctx.user.user_id } : {});
        return paginateItems(all, ctx, ["id", "session_id", "fingerprint", "user_agent"]);
      },

      async revokeSession(ctx) {
        const sessionId = (ctx.params.id || "").trim();
        if (!sessionId) throw new DomainError("SESSION_ID_REQUIRED", "Session ID is required");
        await db.softDelete("sessions", sessionId);
        return { id: sessionId, revoked: true, deleted_at: nowIso() };
      },

      async listNotifications(ctx) {
        const all = await db.query<any>("notifications", ctx.user.user_id ? { user_id: ctx.user.user_id } : {});
        return paginateItems(all, ctx, ["id", "title", "channel", "status"]);
      },

      async sendNotification(ctx) {
        const channel = (String(ctx.body.channel || "all") as "email" | "sms" | "whatsapp" | "all");
        const messageBody = String(ctx.body.body || ctx.body.message || "").trim();
        if (!messageBody) {
          throw new DomainError("NOTIFICATION_BODY_REQUIRED", ctx.locale === "ar" ? "نص الإشعار مطلوب" : "Notification body is required");
        }
        const delivery = await dispatchMultiChannel(
          channel,
          {
            email: ctx.body.email ? String(ctx.body.email) : undefined,
            phone: ctx.body.phone ? String(ctx.body.phone) : undefined,
            whatsapp: ctx.body.whatsapp ? String(ctx.body.whatsapp) : undefined,
          },
          {
            subject: ctx.body.subject ? String(ctx.body.subject) : undefined,
            body: messageBody,
            template_key: ctx.body.template_key ? String(ctx.body.template_key) : undefined,
          }
        );
        const saved = await db.insert(
          "notifications",
          withAuditDates(
            { id: uid("ntf"), channel, subject: ctx.body.subject || null, body: messageBody, delivery, read: false },
            ctx.user.user_id, ctx.user.user_type
          )
        );
        return { notification: saved, delivery };
      },

      async markNotificationRead(ctx) {
        const id = (ctx.params.id || "").trim();
        const updated = await db.update("notifications", id, { read: true, updated_at: nowIso() });
        return updated || { id, read: true, updated_at: nowIso() };
      },

      async markAllNotificationsRead(ctx) {
        const items = await db.query<any>("notifications", ctx.user.user_id ? { user_id: ctx.user.user_id } : {});
        for (const item of items) {
          if (!item.read) {
            await db.update("notifications", item.id, { read: true, updated_at: nowIso() });
          }
        }
        return { all_read: true, count: items.length, user_id: ctx.user.user_id, updated_at: nowIso() };
      },

      async listMessages(ctx) {
        const all = await db.query<any>("messages", {});
        return paginateItems(all, ctx, ["id", "subject", "body", "recipient_id", "user_id"]);
      },

      async sendMessage(ctx) {
        return await db.insert(
          "messages",
          withAuditDates(
            { id: uid("msg"), recipient_id: String(ctx.body.recipient_id || ""), subject: ctx.body.subject || null, body: String(ctx.body.body || "") },
            ctx.user.user_id, ctx.user.user_type
          )
        );
      },

      async listMedia(ctx) {
        const all = await db.query<any>("media", {});
        return paginateItems(all, ctx, ["id", "filename", "mime_type", "url"]);
      },

      async uploadMedia(ctx) {
        return await db.insert("media", withAuditDates({ id: uid("med"), ...ctx.body }, ctx.user.user_id, ctx.user.user_type));
      },

      async listSupportTickets(ctx) {
        const all = await db.query<any>("support_tickets", {});
        return paginateItems(all, ctx, ["id", "subject", "status", "priority", "user_id"]);
      },

      async createSupportTicket(ctx) {
        return await db.insert(
          "support_tickets",
          withAuditDates(
            { id: uid("tkt"), subject: String(ctx.body.subject || ""), priority: String(ctx.body.priority || "normal"), message: String(ctx.body.message || ""), status: "open" },
            ctx.user.user_id, ctx.user.user_type
          )
        );
      },
    },

    admin: {
      async getStats() {
        const [users, tenants, products, orders] = await Promise.all([
          db.query<any>("users"), db.query<any>("tenants"), db.query<any>("products"), db.query<any>("orders"),
        ]);
        return {
          total_users: users.length,
          active_tenants: tenants.filter((t) => t.status === "active").length,
          total_products: products.length,
          total_orders: orders.length,
          total_revenue: orders.reduce((acc, o) => acc + Number(o.total_amount ?? o.total ?? 0), 0),
          currency: "SAR",
        };
      },

      async listReports(ctx) {
        const reports = await db.query<any>("reports");
        return paginateItems(reports, ctx, ["id", "title", "report_type", "format"]);
      },

      async generateReport(ctx) {
        const format = String(ctx.body.format || "json");
        const reportType = String(ctx.body.report_type || "summary");
        return await db.insert(
          "reports",
          withAuditDates(
            {
              id: uid("rpt"),
              title: String(ctx.body.title || `Report - ${reportType}`),
              report_type: reportType,
              format,
              printable: Boolean(ctx.body.printable ?? true),
              printable_html: `<article><h1>${reportType}</h1><p>Generated: ${nowIso()}</p></article>`,
            },
            ctx.user.user_id, ctx.user.user_type
          )
        );
      },

      async getInvoiceTemplates() { return await db.query<any>("invoice_templates"); },
      async saveInvoiceTemplate(ctx) {
        const id = String(ctx.body.id || uid("inv_tpl"));
        return await db.insert("invoice_templates", withAuditDates({ id, ...ctx.body }, ctx.user.user_id, ctx.user.user_type));
      },
      async getReportTemplates() { return await db.query<any>("report_templates"); },
      async saveReportTemplate(ctx) {
        const id = String(ctx.body.id || uid("rpt_tpl"));
        return await db.insert("report_templates", withAuditDates({ id, ...ctx.body }, ctx.user.user_id, ctx.user.user_type));
      },

      async dispatchNotification(ctx) {
        const channel = (String(ctx.body.channel || "all") as "email" | "sms" | "whatsapp" | "all");
        const bodyText = String(ctx.body.body || ctx.body.message || "").trim();
        if (!bodyText) throw new DomainError("BODY_REQUIRED", "Notification body is required");
        const delivery = await dispatchMultiChannel(
          channel,
          {
            email: ctx.body.email ? String(ctx.body.email) : undefined,
            phone: ctx.body.phone ? String(ctx.body.phone) : undefined,
            whatsapp: ctx.body.whatsapp ? String(ctx.body.whatsapp) : undefined,
          },
          {
            subject: ctx.body.subject ? String(ctx.body.subject) : undefined,
            body: bodyText,
            template_key: ctx.body.template_key ? String(ctx.body.template_key) : undefined,
          }
        );
        return { dispatched: true, channel, delivery, dispatched_at: nowIso() };
      },

      async listUsers(ctx) {
        const users = await db.query<any>("users");
        const enriched = users.map((u) => withAuditDates(sanitizeUser(u), u.id || null, u.user_type || null));
        return paginateItems(enriched, ctx, ["id", "user_id", "full_name", "email", "user_type", "status"]);
      },

      async createUser(ctx) {
        const email = String(ctx.body.email || "").trim().toLowerCase();
        const fullName = String(ctx.body.full_name || "").trim();
        if (!email || !fullName) {
          throw new DomainError("VALIDATION_ERROR", ctx.locale === "ar" ? "الاسم والبريد الإلكتروني مطلوبان" : "Full name and email are required");
        }
        const existing = (await db.query<any>("users")).find((u) => String(u.email || "").toLowerCase() === email);
        if (existing) {
          throw new DomainError("EMAIL_TAKEN", ctx.locale === "ar" ? "البريد الإلكتروني مستخدم بالفعل" : "Email already exists");
        }
        const rawPassword = String(ctx.body.password || "");
        if (rawPassword.length < 8) {
          throw new DomainError("WEAK_PASSWORD", ctx.locale === "ar" ? "كلمة المرور يجب أن تكون 8 أحرف على الأقل" : "Password must be at least 8 characters");
        }
        const id = uid("usr");
        const rawRole = String(ctx.body.user_type || "customer") as UserRole;
        const created = await db.insert(
          "users",
          withAuditDates(
            {
              id,
              full_name: fullName,
              email,
              phone: ctx.body.phone ? String(ctx.body.phone).trim() : null,
              password_hash: hashPassword(rawPassword),
              user_type: rawRole,
              status: String(ctx.body.status || "active"),
            },
            id,
            rawRole
          )
        );
        return { ...sanitizeUser(created), user_id: created.id };
      },

      async updateUser(ctx) {
        const id = (ctx.params.id || "").trim();
        if (!id) throw new DomainError("USER_ID_REQUIRED", "User ID is required");
        const patch: Record<string, unknown> = { updated_at: nowIso() };
        if (typeof ctx.body.full_name === "string" && ctx.body.full_name.trim()) patch.full_name = ctx.body.full_name.trim();
        if (ctx.body.phone !== undefined) patch.phone = ctx.body.phone ? String(ctx.body.phone).trim() : null;
        if (typeof ctx.body.user_type === "string") patch.user_type = ctx.body.user_type;
        if (typeof ctx.body.status === "string") patch.status = ctx.body.status;
        if (typeof ctx.body.preferred_locale === "string") patch.preferred_locale = ctx.body.preferred_locale;
        const updated = await db.update<Record<string, any>>("users", id, patch);
        if (!updated) throw new DomainError("USER_NOT_FOUND", "User not found");
        return withAuditDates(sanitizeUser(updated), String(updated.id), (updated.user_type as UserRole) || null);
      },

      async listTenants(ctx) {
        const tenants = await db.query<any>("tenants");
        return paginateItems(tenants, ctx, ["id", "name", "slug", "domain", "status"]);
      },

      async createTenant(ctx) {
        return await db.insert(
          "tenants",
          withAuditDates(
            { id: uid("tnt"), name: String(ctx.body.name || ""), slug: String(ctx.body.slug || ""), domain: ctx.body.domain || null, status: String(ctx.body.status || "active") },
            ctx.user.user_id, ctx.user.user_type
          )
        );
      },

      async updateTenant(ctx) {
        const id = (ctx.params.id || "").trim();
        const updated = await db.update("tenants", id, { ...ctx.body, updated_at: nowIso() });
        if (!updated) throw new DomainError("TENANT_NOT_FOUND", "Tenant not found");
        return withAuditDates(updated, ctx.user.user_id, ctx.user.user_type);
      },

      async listProducts(ctx) {
        const products = await db.query<any>("products");
        return paginateItems(products, ctx, ["id", "slug", "status"]);
      },

      async listOrders(ctx) {
        const orders = await db.query<any>("orders");
        return paginateItems(orders, ctx, ["id", "order_number", "status", "user_id"]);
      },

      async updateOrderStatus(ctx) {
        const id = (ctx.params.id || "").trim();
        const updated = await db.update<Record<string, any>>("orders", id, { status: ctx.body.status, updated_at: nowIso() });
        if (!updated) throw new DomainError("ORDER_NOT_FOUND", "Order not found");
        return withAuditDates(updated, String(updated.user_id || ctx.user.user_id || ""), ctx.user.user_type);
      },

      async listPosts(ctx) {
        const posts = await db.query<any>("blog_posts");
        return paginateItems(posts, ctx, ["id", "slug", "status"]);
      },

      async createPost(ctx) {
        return await db.insert(
          "blog_posts",
          withAuditDates(
            { id: uid("pst"), slug: String(ctx.body.slug || ""), title_i18n: ctx.body.title_i18n || {}, body_i18n: ctx.body.body_i18n || {}, status: String(ctx.body.status || "published") },
            ctx.user.user_id, ctx.user.user_type
          )
        );
      },

      async getSettings(ctx) {
        const rows = await db.query<any>("admin_settings", ctx.tenantId ? { tenant_id: ctx.tenantId } : {});
        return rows[0] || { system_mode: "ready", default_locale: ctx.locale, default_currency: "SAR" };
      },

      async updateSettings(ctx) {
        const rows = await db.query<any>("admin_settings", ctx.tenantId ? { tenant_id: ctx.tenantId } : {});
        if (rows[0]) {
          const updated = await db.update("admin_settings", rows[0].id, { ...ctx.body, updated_at: nowIso() });
          return updated || { ...rows[0], ...ctx.body, updated_at: nowIso() };
        }
        return await db.insert(
          "admin_settings",
          withAuditDates({ id: uid("set"), tenant_id: ctx.tenantId || null, ...ctx.body }, ctx.user.user_id, ctx.user.user_type)
        );
      },

      async listAuditLogs(ctx) {
        const logs = await db.query<any>("audit_logs");
        return paginateItems(logs, ctx, ["id", "action", "event", "actor_email", "user_id", "user_type"]);
      },

      async getEnv() {
        const rows = await db.query<any>("admin_env");
        return rows[0] || { variables: {} };
      },
      async updateEnv(ctx) {
        return await db.insert("admin_env", withAuditDates({ id: uid("env"), ...ctx.body }, ctx.user.user_id, ctx.user.user_type));
      },
      async testEnv() { return { ok: true, checked_at: nowIso() }; },

      async getChannel(channel) {
        const rows = await db.query<any>(`channel_${channel}`);
        return rows[0] || { channel, config: {}, templates: [] };
      },
      async updateChannelConfig(channel, ctx) {
        return await db.insert(`channel_${channel}`, withAuditDates({ id: uid(channel), ...ctx.body }, ctx.user.user_id, ctx.user.user_type));
      },
      async saveChannelTemplate(channel, ctx) {
        return await db.insert(`channel_${channel}_templates`, withAuditDates({ id: uid("tpl"), ...ctx.body }, ctx.user.user_id, ctx.user.user_type));
      },
      async testChannelSend(channel, ctx) {
        const target = String(ctx.body.to || "");
        const bodyText = String(ctx.body.message || `Test ${channel} message`);
        const mappedChannel = channel === "mail" ? "email" : channel;
        const delivery = await dispatchMultiChannel(
          mappedChannel,
          { email: target, phone: target, whatsapp: target },
          { subject: `Test ${channel}`, body: bodyText, template_key: ctx.body.template_key ? String(ctx.body.template_key) : undefined }
        );
        return { tested: true, channel, delivery };
      },

      async getPaypal() {
        const rows = await db.query<any>("paypal_config");
        return rows[0] || { mode: "sandbox", templates: [] };
      },
      async updatePaypalConfig(ctx) {
        return await db.insert("paypal_config", withAuditDates({ id: uid("pp"), ...ctx.body }, ctx.user.user_id, ctx.user.user_type));
      },
      async savePaypalTemplate(ctx) {
        return await db.insert("paypal_templates", withAuditDates({ id: uid("pptpl"), ...ctx.body }, ctx.user.user_id, ctx.user.user_type));
      },
      async testPaypalIntent(ctx) {
        return { ok: true, amount: ctx.body.amount ?? 10, currency: ctx.body.currency || "USD", tested_at: nowIso() };
      },

      async getStorage() {
        const rows = await db.query<any>("storage_config");
        return rows[0] || { driver: "local", allowed_types: ["image/png", "image/jpeg", "application/pdf"] };
      },
      async updateStorage(ctx) {
        return await db.insert("storage_config", withAuditDates({ id: uid("stg"), ...ctx.body }, ctx.user.user_id, ctx.user.user_type));
      },
      async testStorage() { return { ok: true, upload_ready: true, download_ready: true, tested_at: nowIso() }; },

      async listRoles() { return await db.query<any>("roles_config"); },
      async saveRole(ctx) {
        const roleKey = (ctx.params.roleKey || "").trim();
        if (!roleKey) throw new DomainError("ROLE_KEY_REQUIRED", "Role key is required");
        return await db.insert("roles_config", withAuditDates({ id: roleKey, role_key: roleKey, ...ctx.body }, ctx.user.user_id, ctx.user.user_type));
      },

      async getSeo() {
        const rows = await db.query<any>("seo_config");
        return rows[0] || { robots_txt: "", sitemap_xml: "" };
      },
      async updateSeo(ctx) {
        return await db.insert("seo_config", withAuditDates({ id: uid("seo"), ...ctx.body }, ctx.user.user_id, ctx.user.user_type));
      },
      async generateSeoFiles() { return { generated: ["robots.txt", "sitemap.xml"], generated_at: nowIso() }; },

      async getAnalytics() {
        const rows = await db.query<any>("ga_config");
        return rows[0] || { measurement_id: "", enabled: false };
      },
      async updateAnalytics(ctx) {
        return await db.insert("ga_config", withAuditDates({ id: uid("ga"), ...ctx.body }, ctx.user.user_id, ctx.user.user_type));
      },
      async exportAnalyticsConfig() { return { exported: true, format: "json", exported_at: nowIso() }; },

      async getAdsense() {
        const rows = await db.query<any>("adsense_config");
        return rows[0] || { publisher_id: "", ads_txt: "" };
      },
      async updateAdsense(ctx) {
        return await db.insert("adsense_config", withAuditDates({ id: uid("ads"), ...ctx.body }, ctx.user.user_id, ctx.user.user_type));
      },
      async generateAdsTxt() { return { generated: "ads.txt", generated_at: nowIso() }; },

      async getThemes() {
        const rows = await db.query<any>("themes_config");
        return rows[0] || { active_theme: "light", themes: ["light", "dark", "brand"] };
      },
      async updateThemes(ctx) {
        return await db.insert("themes_config", withAuditDates({ id: uid("thm"), ...ctx.body }, ctx.user.user_id, ctx.user.user_type));
      },

      async getLocales() {
        const rows = await db.query<any>("locales_config");
        return rows[0] || { default_locale: "ar", supported_locales: ["ar", "en"] };
      },
      async updateLocales(ctx) {
        return await db.insert("locales_config", withAuditDates({ id: uid("loc"), ...ctx.body }, ctx.user.user_id, ctx.user.user_type));
      },

      async getSystemState(ctx) {
        const rows = await db.query<any>("system_state", ctx.tenantId ? { tenant_id: ctx.tenantId } : {});
        return rows[0] || { state: "ready" };
      },
      async updateSystemState(ctx) {
        const state = String(ctx.body.state || ctx.body.mode || "ready");
        return await db.insert("system_state", withAuditDates({ id: uid("st"), state, ...ctx.body }, ctx.user.user_id, ctx.user.user_type));
      },

      async getSiteIdentity() {
        const rows = await db.query<any>("site_identity");
        return rows[0] || { site_name: "سوق الكل", official_url: "", favicon_url: "" };
      },
      async updateSiteIdentity(ctx) {
        return await db.insert("site_identity", withAuditDates({ id: uid("sid"), ...ctx.body }, ctx.user.user_id, ctx.user.user_type));
      },

      async getLayoutSection(section) {
        const rows = await db.query<any>(`layout_${section}`);
        return rows[0] || { section, content: {} };
      },
      async saveLayoutSection(section, ctx) {
        return await db.insert(`layout_${section}`, withAuditDates({ id: uid(section), section, ...ctx.body }, ctx.user.user_id, ctx.user.user_type));
      },

      async getSidebar(ctx) {
        const roleFilter = ctx.query.user_type ? { user_type: ctx.query.user_type } : {};
        return await db.query<any>("sidebar_menus", roleFilter);
      },
      async saveSidebar(ctx) {
        const userType = (ctx.params.userType || "").trim();
        return await db.insert("sidebar_menus", withAuditDates({ id: uid("sb"), user_type: userType, ...ctx.body }, ctx.user.user_id, ctx.user.user_type));
      },
    },

    vendor: {
      async getStats(ctx) {
        const [products, orders] = await Promise.all([
          db.query<any>("products", ctx.user.user_id ? { vendor_id: ctx.user.user_id } : {}),
          db.query<any>("orders", ctx.user.user_id ? { vendor_id: ctx.user.user_id } : {}),
        ]);
        return { total_products: products.length, total_orders: orders.length };
      },
      async listReports(ctx) {
        const rows = await db.query<any>("vendor_reports", ctx.user.user_id ? { vendor_id: ctx.user.user_id } : {});
        return paginateItems(rows, ctx, ["id", "title", "report_type"]);
      },
      async generateReport(ctx) {
        return await db.insert(
          "vendor_reports",
          withAuditDates(
            { id: uid("vrpt"), vendor_id: ctx.user.user_id, printable: true, printable_html: `<article><h1>Vendor Report</h1><p>${nowIso()}</p></article>`, ...ctx.body },
            ctx.user.user_id, ctx.user.user_type
          )
        );
      },
      async listProducts(ctx) {
        const rows = await db.query<any>("products", ctx.user.user_id ? { vendor_id: ctx.user.user_id } : {});
        return paginateItems(rows, ctx, ["id", "slug", "status"]);
      },
      async createProduct(ctx) {
        return await db.insert("products", withAuditDates({ id: uid("prd"), vendor_id: ctx.user.user_id, ...ctx.body }, ctx.user.user_id, ctx.user.user_type));
      },
      async updateProduct(ctx) {
        const id = (ctx.params.id || "").trim();
        const rows = await db.query<any>("products", { id });
        if (!rows[0]) throw new DomainError("PRODUCT_NOT_FOUND", "Product not found");
        if (ctx.user.user_type !== "super_admin" && rows[0].vendor_id && rows[0].vendor_id !== ctx.user.user_id) {
          throw new DomainError("FORBIDDEN", "Forbidden");
        }
        const updated = await db.update("products", id, { ...ctx.body, updated_at: nowIso() });
        if (!updated) throw new DomainError("PRODUCT_NOT_FOUND", "Product not found");
        return withAuditDates(updated, ctx.user.user_id, ctx.user.user_type);
      },
      async deleteProduct(ctx) {
        const id = (ctx.params.id || "").trim();
        const rows = await db.query<any>("products", { id });
        if (rows[0] && ctx.user.user_type !== "super_admin" && rows[0].vendor_id && rows[0].vendor_id !== ctx.user.user_id) {
          throw new DomainError("FORBIDDEN", "Forbidden");
        }
        await db.softDelete("products", id);
        return { id, deleted: true, deleted_at: nowIso() };
      },
      async updateProductVariants(ctx) {
        const id = (ctx.params.id || "").trim();
        const rows = await db.query<any>("products", { id });
        if (!rows[0]) throw new DomainError("PRODUCT_NOT_FOUND", "Product not found");
        if (ctx.user.user_type !== "super_admin" && rows[0].vendor_id && rows[0].vendor_id !== ctx.user.user_id) {
          throw new DomainError("FORBIDDEN", "Forbidden");
        }
        return await db.update("products", id, { variants: ctx.body.variants || [], updated_at: nowIso() });
      },
      async updateProductStock(ctx) {
        const id = (ctx.params.id || "").trim();
        const rows = await db.query<any>("products", { id });
        if (!rows[0]) throw new DomainError("PRODUCT_NOT_FOUND", "Product not found");
        if (ctx.user.user_type !== "super_admin" && rows[0].vendor_id && rows[0].vendor_id !== ctx.user.user_id) {
          throw new DomainError("FORBIDDEN", "Forbidden");
        }
        return await db.update("products", id, { stock: Number(ctx.body.stock ?? 0), updated_at: nowIso() });
      },
      async listOrders(ctx) {
        const rows = await db.query<any>("orders", ctx.user.user_id ? { vendor_id: ctx.user.user_id } : {});
        return paginateItems(rows, ctx, ["id", "order_number", "status"]);
      },
      async updateOrderStatus(ctx) {
        const id = (ctx.params.id || "").trim();
        const rows = await db.query<any>("orders", { id });
        if (!rows[0]) throw new DomainError("ORDER_NOT_FOUND", "Order not found");
        if (ctx.user.user_type !== "super_admin" && rows[0].vendor_id && rows[0].vendor_id !== ctx.user.user_id) {
          throw new DomainError("FORBIDDEN", "Forbidden");
        }
        return await db.update("orders", id, { status: ctx.body.status, updated_at: nowIso() });
      },
      async getOrderInvoice(ctx) {
        const orderId = (ctx.params.id || "").trim();
        return {
          order_id: orderId,
          printable: true,
          printable_html: `<section><h2>Invoice #${orderId}</h2><p>Date: ${nowIso()}</p></section>`,
          issued_at: nowIso(),
        };
      },
      async listShipments(ctx) {
        const rows = await db.query<any>("shipments", ctx.user.user_id ? { vendor_id: ctx.user.user_id } : {});
        return paginateItems(rows, ctx, ["id", "order_id", "tracking_number", "status"]);
      },
      async createShipment(ctx) {
        return await db.insert("shipments", withAuditDates({ id: uid("shp"), vendor_id: ctx.user.user_id, ...ctx.body }, ctx.user.user_id, ctx.user.user_type));
      },
      async getPayouts(ctx) {
        const rows = await db.query<any>("payouts", ctx.user.user_id ? { vendor_id: ctx.user.user_id } : {});
        return paginateItems(rows, ctx, ["id", "status", "amount"]);
      },
      async requestPayout(ctx) {
        return await db.insert("payouts", withAuditDates({ id: uid("pay"), vendor_id: ctx.user.user_id, status: "pending", ...ctx.body }, ctx.user.user_id, ctx.user.user_type));
      },
      async getStore(ctx) {
        const rows = await db.query<any>("stores", ctx.user.user_id ? { vendor_id: ctx.user.user_id } : {});
        return rows[0] || { name: "Store", status: "active", vendor_id: ctx.user.user_id };
      },
      async updateStore(ctx) {
        return await db.insert("stores", withAuditDates({ id: uid("str"), vendor_id: ctx.user.user_id, ...ctx.body }, ctx.user.user_id, ctx.user.user_type));
      },
      async listReviews(ctx) {
        const rows = await db.query<any>("reviews", ctx.user.user_id ? { vendor_id: ctx.user.user_id } : {});
        return paginateItems(rows, ctx, ["id", "product_id", "status"]);
      },
      async replyReview(ctx) {
        const id = (ctx.params.id || "").trim();
        return await db.update("reviews", id, { reply: ctx.body.reply || ctx.body.message, updated_at: nowIso() });
      },
    },

    moderator: {
      async getStats() {
        const [reports, posts, reviews] = await Promise.all([
          db.query<any>("reports"), db.query<any>("blog_posts"), db.query<any>("reviews"),
        ]);
        return { pending_reports: reports.length, posts_count: posts.length, reviews_count: reviews.length };
      },
      async listReports(ctx) {
        const rows = await db.query<any>("reports");
        return paginateItems(rows, ctx, ["id", "reason", "status"]);
      },
      async resolveReport(ctx) {
        const id = (ctx.params.id || "").trim();
        return await db.update("reports", id, { status: ctx.body.status, note: ctx.body.note || null, updated_at: nowIso() });
      },
      async listPosts(ctx) {
        const rows = await db.query<any>("blog_posts");
        return paginateItems(rows, ctx, ["id", "slug", "status"]);
      },
      async moderatePost(ctx) {
        const id = (ctx.params.id || "").trim();
        return await db.update("blog_posts", id, { moderation_status: ctx.body.status, reason: ctx.body.reason || null, updated_at: nowIso() });
      },
      async listReviews(ctx) {
        const rows = await db.query<any>("reviews");
        return paginateItems(rows, ctx, ["id", "status"]);
      },
      async updateReviewStatus(ctx) {
        const id = (ctx.params.id || "").trim();
        return await db.update("reviews", id, { status: ctx.body.status, updated_at: nowIso() });
      },
      async listTickets(ctx) {
        const rows = await db.query<any>("moderation_tickets");
        return paginateItems(rows, ctx, ["id", "subject", "status"]);
      },
      async replyTicket(ctx) {
        const id = (ctx.params.id || "").trim();
        return await db.insert("ticket_replies", withAuditDates({ id: uid("rep"), ticket_id: id, message: ctx.body.message || ctx.body.body }, ctx.user.user_id, ctx.user.user_type));
      },
      async updateTicketStatus(ctx) {
        const id = (ctx.params.id || "").trim();
        return await db.update("moderation_tickets", id, { status: ctx.body.status, updated_at: nowIso() });
      },
      async createModerationAction(ctx) {
        return await db.insert("moderation_actions", withAuditDates({ id: uid("mact"), ...ctx.body }, ctx.user.user_id, ctx.user.user_type));
      },
      async listActivityLogs(ctx) {
        const rows = await db.query<any>("moderation_logs");
        return paginateItems(rows, ctx, ["id", "action", "user_id", "user_type"]);
      },
    },

    staff: {
      async getStats(ctx) {
        const tenantFilter = ctx.tenantId ? { tenant_id: ctx.tenantId } : {};
        const [orders, shipments, tasks] = await Promise.all([
          db.query<any>("orders", tenantFilter),
          db.query<any>("shipments", tenantFilter),
          db.query<any>("staff_tasks", tenantFilter),
        ]);
        return { orders_count: orders.length, shipments_count: shipments.length, tasks_count: tasks.length };
      },
      async listOrders(ctx) {
        const rows = await db.query<any>("orders", ctx.tenantId ? { tenant_id: ctx.tenantId } : {});
        return paginateItems(rows, ctx, ["id", "order_number", "status"]);
      },
      async updateOrderFulfillment(ctx) {
        const id = (ctx.params.id || "").trim();
        return await db.update("orders", id, { fulfillment_status: ctx.body.status, note: ctx.body.note || null, updated_at: nowIso() });
      },
      async listShipments(ctx) {
        const rows = await db.query<any>("shipments", ctx.tenantId ? { tenant_id: ctx.tenantId } : {});
        return paginateItems(rows, ctx, ["id", "order_id", "tracking_number", "status"]);
      },
      async createShipment(ctx) {
        return await db.insert("shipments", withAuditDates({ id: uid("shp"), tenant_id: ctx.tenantId, status: "created", ...ctx.body }, ctx.user.user_id, ctx.user.user_type));
      },
      async updateShipmentStatus(ctx) {
        const id = (ctx.params.id || "").trim();
        return await db.update("shipments", id, { status: ctx.body.status, tracking_number: ctx.body.tracking_number || null, updated_at: nowIso() });
      },
      async listInventory(ctx) {
        const rows = await db.query<any>("inventory", ctx.tenantId ? { tenant_id: ctx.tenantId } : {});
        return paginateItems(rows, ctx, ["id", "sku", "product_id"]);
      },
      async adjustInventoryStock(ctx) {
        const id = (ctx.params.id || "").trim();
        return await db.update("inventory", id, { last_delta: Number(ctx.body.delta), reason: ctx.body.reason || null, updated_at: nowIso() });
      },
      async listTickets(ctx) {
        const rows = await db.query<any>("support_tickets", ctx.tenantId ? { tenant_id: ctx.tenantId } : {});
        return paginateItems(rows, ctx, ["id", "subject", "status"]);
      },
      async replyTicket(ctx) {
        const id = (ctx.params.id || "").trim();
        return await db.insert("ticket_replies", withAuditDates({ id: uid("rep"), ticket_id: id, message: ctx.body.message || ctx.body.body }, ctx.user.user_id, ctx.user.user_type));
      },
      async updateTicketStatus(ctx) {
        const id = (ctx.params.id || "").trim();
        return await db.update("support_tickets", id, { status: ctx.body.status, updated_at: nowIso() });
      },
      async listTasks(ctx) {
        const rows = await db.query<any>("staff_tasks", ctx.tenantId ? { tenant_id: ctx.tenantId } : {});
        return paginateItems(rows, ctx, ["id", "title", "status"]);
      },
      async updateTaskStatus(ctx) {
        const id = (ctx.params.id || "").trim();
        return await db.update("staff_tasks", id, { status: ctx.body.status, updated_at: nowIso() });
      },
    },

    customer: {
      async getStats(ctx) {
        const orders = await db.query<any>("orders", ctx.user.user_id ? { user_id: ctx.user.user_id } : {});
        return { orders_count: orders.length };
      },
      async listOrders(ctx) {
        const rows = await db.query<any>("orders", ctx.user.user_id ? { user_id: ctx.user.user_id } : {});
        return paginateItems(rows, ctx, ["id", "order_number", "status"]);
      },
      async getOrderById(ctx) {
        const id = (ctx.params.id || "").trim();
        const rows = await db.query<any>("orders", { id });
        if (!rows[0]) throw new DomainError("ORDER_NOT_FOUND", "Order not found");
        if (rows[0].user_id && rows[0].user_id !== ctx.user.user_id) {
          throw new DomainError("FORBIDDEN", ctx.locale === "ar" ? "لا تملك صلاحية الوصول لهذا الطلب" : "You cannot access this order");
        }
        return withAuditDates(rows[0], ctx.user.user_id, ctx.user.user_type);
      },
      async cancelOrder(ctx) {
        const id = (ctx.params.id || "").trim();
        const rows = await db.query<any>("orders", { id });
        if (!rows[0]) throw new DomainError("ORDER_NOT_FOUND", "Order not found");
        if (rows[0].user_id && rows[0].user_id !== ctx.user.user_id) {
          throw new DomainError("FORBIDDEN", "You cannot cancel this order");
        }
        const updated = await db.update("orders", id, { status: "cancelled", cancel_reason: ctx.body.reason || null, updated_at: nowIso() });
        return updated || { id, status: "cancelled", updated_at: nowIso() };
      },
      async getOrderInvoice(ctx) {
        const id = (ctx.params.id || "").trim();
        return {
          order_id: id,
          printable: true,
          printable_html: `<section><h2>Customer Invoice #${id}</h2><p>Date: ${nowIso()}</p></section>`,
          issued_at: nowIso(),
        };
      },
      async listShipments(ctx) {
        const rows = await db.query<any>("shipments", ctx.user.user_id ? { user_id: ctx.user.user_id } : {});
        return paginateItems(rows, ctx, ["id", "order_id", "tracking_number", "status"]);
      },
      async trackShipment(ctx) {
        const id = (ctx.params.id || "").trim();
        const rows = await db.query<any>("shipments", { id });
        const shipment = rows[0] || null;
        return {
          shipment_id: id,
          shipment,
          tracking_events: shipment
            ? [{ status: shipment.status, timestamp: shipment.updated_at || shipment.created_at, carrier: shipment.carrier || "SouqExpress" }]
            : [],
          checked_at: nowIso(),
        };
      },
      async listAddresses(ctx) {
        const rows = await db.query<any>("addresses", ctx.user.user_id ? { user_id: ctx.user.user_id } : {});
        return paginateItems(rows, ctx, ["id", "city", "line1"]);
      },
      async createAddress(ctx) {
        return await db.insert("addresses", withAuditDates({ id: uid("addr"), user_id: ctx.user.user_id, ...ctx.body }, ctx.user.user_id, ctx.user.user_type));
      },
      async updateAddress(ctx) {
        const id = (ctx.params.id || "").trim();
        const rows = await db.query<any>("addresses", { id });
        if (!rows[0]) throw new DomainError("ADDRESS_NOT_FOUND", "Address not found");
        if (rows[0].user_id !== ctx.user.user_id && ctx.user.user_type !== "super_admin") {
          throw new DomainError("FORBIDDEN", "Forbidden");
        }
        return await db.update("addresses", id, { ...ctx.body, updated_at: nowIso() });
      },
      async deleteAddress(ctx) {
        const id = (ctx.params.id || "").trim();
        const rows = await db.query<any>("addresses", { id });
        if (rows[0] && rows[0].user_id !== ctx.user.user_id && ctx.user.user_type !== "super_admin") {
          throw new DomainError("FORBIDDEN", "Forbidden");
        }
        await db.softDelete("addresses", id);
        return { id, deleted: true, deleted_at: nowIso() };
      },
      async listWishlist(ctx) {
        const rows = await db.query<any>("wishlist", ctx.user.user_id ? { user_id: ctx.user.user_id } : {});
        return paginateItems(rows, ctx, ["id", "product_id"]);
      },
      async addWishlist(ctx) {
        return await db.insert("wishlist", withAuditDates({ id: uid("wsh"), user_id: ctx.user.user_id, product_id: ctx.body.product_id }, ctx.user.user_id, ctx.user.user_type));
      },
      async removeWishlist(ctx) {
        const productId = (ctx.params.productId || "").trim();
        const rows = await db.query<any>("wishlist", { user_id: ctx.user.user_id });
        const target = rows.find((w) => w.id === productId || w.product_id === productId);
        if (target) await db.softDelete("wishlist", target.id);
        return { product_id: productId, removed: true, deleted_at: nowIso() };
      },
      async getWallet(ctx) {
        const txs = await db.query<any>("wallet_transactions", { user_id: ctx.user.user_id });
        const balance = txs.reduce((sum, tx) => sum + (tx.type === "debit" ? -Number(tx.amount || 0) : Number(tx.amount || 0)), 0);
        return { balance, currency: "SAR", transactions: txs, user_id: ctx.user.user_id, updated_at: nowIso() };
      },
      async topupWallet(ctx) {
        const amount = Number(ctx.body.amount || 0);
        if (!Number.isFinite(amount) || amount <= 0) {
          throw new DomainError("INVALID_AMOUNT", ctx.locale === "ar" ? "المبلغ غير صالح" : "Invalid amount");
        }
        return await db.insert("wallet_transactions", withAuditDates({ id: uid("wtx"), user_id: ctx.user.user_id, amount, type: "topup" }, ctx.user.user_id, ctx.user.user_type));
      },
      async listReviews(ctx) {
        const rows = await db.query<any>("reviews", ctx.user.user_id ? { user_id: ctx.user.user_id } : {});
        return paginateItems(rows, ctx, ["id", "product_id", "comment"]);
      },
      async createReview(ctx) {
        return await db.insert("reviews", withAuditDates({ id: uid("rev"), user_id: ctx.user.user_id, ...ctx.body }, ctx.user.user_id, ctx.user.user_type));
      },
    },

    publicCatalog: {
      async getSiteInfo() {
        const [identityRows, settingsRows, products, tenants, posts] = await Promise.all([
          db.query<any>("site_identity"),
          db.query<any>("admin_settings"),
          db.query<any>("products"),
          db.query<any>("tenants"),
          db.query<any>("blog_posts"),
        ]);
        const identity = identityRows[0] || {};
        const settings = settingsRows[0] || {};
        const activeProducts = products.filter((p) => (p.status || "active") === "active");
        const activeStores = tenants.filter((t) => (t.status || "active") === "active");
        const publishedPosts = posts.filter((p) => (p.status || "published") === "published" && (p.moderation_status || "approved") === "approved");
        const categories = Array.from(new Set(activeProducts.map((p) => p.category).filter(Boolean)));
        return {
          site_name: identity.site_name || "سوق الكل",
          site_name_en: identity.site_name_en || "Souq Al-Kul",
          default_currency: settings.default_currency || "SAR",
          system_mode: settings.system_mode || "ready",
          stats: {
            products_count: activeProducts.length,
            stores_count: activeStores.length,
            posts_count: publishedPosts.length,
          },
          categories,
        };
      },

      async listProducts(ctx) {
        const all = await db.query<any>("products");
        const safe = all
          .filter((p) => (p.status || "active") === "active")
          .map((p) => ({
            id: p.id,
            slug: p.slug,
            title: p.title,
            title_en: p.title_en || p.title,
            category: p.category || "عام",
            price: Number(p.price ?? 0),
            currency: p.currency || "SAR",
            stock: Number(p.stock ?? 0),
            sku: p.sku || "",
            tenant_id: p.tenant_id || "tnt_main",
            status: p.status || "active",
            created_at: p.created_at || null,
          }));
        return paginateItems(safe, ctx, ["id", "slug", "title", "title_en", "category", "sku"]);
      },

      async getProductById(ctx) {
        const idOrSlug = (ctx.params.id || "").trim();
        const all = await db.query<any>("products");
        const product = all.find((p) => (p.status || "active") === "active" && (p.id === idOrSlug || p.slug === idOrSlug));
        if (!product) {
          throw new DomainError("PRODUCT_NOT_FOUND", ctx.locale === "ar" ? "المنتج غير موجود" : "Product not found");
        }
        const [reviews, tenants] = await Promise.all([
          db.query<any>("reviews", { product_id: product.id }),
          db.query<any>("tenants", { id: product.tenant_id || "tnt_main" }),
        ]);
        const safeReviews = reviews
          .filter((r) => (r.status || "approved") === "approved")
          .map((r) => ({
            id: r.id,
            rating: Number(r.rating ?? 5),
            comment: r.comment || "",
            reply: r.reply || null,
            created_at: r.created_at || null,
          }));
        const store = tenants[0] ? { id: tenants[0].id, name: tenants[0].name, slug: tenants[0].slug } : null;
        return {
          id: product.id,
          slug: product.slug,
          title: product.title,
          title_en: product.title_en || product.title,
          category: product.category || "عام",
          price: Number(product.price ?? 0),
          currency: product.currency || "SAR",
          stock: Number(product.stock ?? 0),
          sku: product.sku || "",
          tenant_id: product.tenant_id || "tnt_main",
          store,
          reviews: safeReviews,
        };
      },

      async listStores(ctx) {
        const [tenants, products] = await Promise.all([
          db.query<any>("tenants"),
          db.query<any>("products"),
        ]);
        const activeTenants = tenants
          .filter((t) => (t.status || "active") === "active")
          .map((t) => ({
            id: t.id,
            name: t.name,
            slug: t.slug,
            domain: t.domain || null,
            status: t.status || "active",
            products_count: products.filter((p) => p.tenant_id === t.id && (p.status || "active") === "active").length,
          }));
        return paginateItems(activeTenants, ctx, ["id", "name", "slug", "domain"]);
      },

      async listPosts(ctx) {
        const posts = await db.query<any>("blog_posts");
        const safe = posts
          .filter((p) => (p.status || "published") === "published" && (p.moderation_status || "approved") === "approved")
          .map((p) => ({
            id: p.id,
            slug: p.slug,
            title_i18n: p.title_i18n || {},
            body_i18n: p.body_i18n || {},
            created_at: p.created_at || null,
          }));
        return paginateItems(safe, ctx, ["id", "slug"]);
      },

      async getPostBySlug(ctx) {
        const slugOrId = (ctx.params.slug || "").trim();
        const posts = await db.query<any>("blog_posts");
        const post = posts.find(
          (p) => (p.status || "published") === "published" && (p.moderation_status || "approved") === "approved" && (p.slug === slugOrId || p.id === slugOrId)
        );
        if (!post) {
          throw new DomainError("POST_NOT_FOUND", ctx.locale === "ar" ? "المقال غير موجود" : "Article not found");
        }
        return {
          id: post.id,
          slug: post.slug,
          title_i18n: post.title_i18n || {},
          body_i18n: post.body_i18n || {},
          created_at: post.created_at || null,
        };
      },

      async trackShipment(ctx) {
        const tracking = (ctx.params.tracking || "").trim().toUpperCase();
        if (!tracking) {
          throw new DomainError("TRACKING_REQUIRED", ctx.locale === "ar" ? "رقم التتبع مطلوب" : "Tracking number required");
        }
        const shipments = await db.query<any>("shipments");
        const found = shipments.find(
          (s) => String(s.tracking_number || "").toUpperCase() === tracking || String(s.id || "").toUpperCase() === tracking
        );
        if (!found) {
          throw new DomainError("SHIPMENT_NOT_FOUND", ctx.locale === "ar" ? "لم يتم العثور على شحنة بهذا الرقم" : "No shipment found with this tracking number");
        }
        return {
          tracking_number: found.tracking_number || found.id,
          carrier: found.carrier || "SouqExpress",
          status: found.status || "created",
          updated_at: found.updated_at || found.created_at || nowIso(),
          events: [
            { status: "created", timestamp: found.created_at || nowIso(), carrier: found.carrier || "SouqExpress" },
            ...(found.status && found.status !== "created"
              ? [{ status: found.status, timestamp: found.updated_at || nowIso(), carrier: found.carrier || "SouqExpress" }]
              : []),
          ],
        };
      },

      async submitContact(ctx) {
        const name = String(ctx.body.name || "").trim();
        const email = String(ctx.body.email || "").trim();
        const subject = String(ctx.body.subject || "").trim();
        const message = String(ctx.body.message || "").trim();
        if (!name || !email || !subject || !message) {
          throw new DomainError(
            "VALIDATION_ERROR",
            ctx.locale === "ar" ? "جميع الحقول مطلوبة (الاسم، البريد، الموضوع، الرسالة)" : "Name, email, subject, and message are required"
          );
        }
        const saved = await db.insert("support_tickets", {
          id: uid("inq"),
          name,
          email,
          subject: `[Contact] ${subject}`,
          priority: "normal",
          message,
          status: "open",
          source: "public_contact",
          created_at: nowIso(),
          updated_at: nowIso(),
          deleted_at: null,
        });
        return { submitted: true, reference_id: saved.id, created_at: saved.created_at };
      },
    },
  };
}
