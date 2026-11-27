/**
 * src/api/api.ts
 * الراوتر المركزي الموحد (Unified JSON Router) لجميع أدوار وصفحات النظام
 */

export type Locale = "ar" | "en";
export type ThemeMode = "light" | "dark" | "brand";
export type UserRole = "super_admin" | "moderator" | "staff" | "vendor" | "customer";
export type SystemState = "maintenance" | "locked" | "development" | "ready";
export type SystemMode = "ready" | "maintenance" | "development";
export type OrderStatus = "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled";
export type VendorOrderStatus = "pending" | "confirmed" | "processing" | "shipped" | "delivered";
export type ReportResolutionStatus = "resolved" | "dismissed" | "escalated";
export type PostModerationStatus = "approved" | "hidden" | "rejected";
export type ReviewModerationStatus = "approved" | "hidden" | "flagged";
export type TicketModerationStatus = "open" | "in_progress" | "resolved" | "closed";
export type StaffFulfillmentStatus = "picking" | "packed" | "shipped" | "delivered" | "on_hold";
export type StaffShipmentStatus = "created" | "in_transit" | "out_for_delivery" | "delivered" | "returned";
export type StaffTicketStatus = "open" | "pending_customer" | "resolved" | "closed";
export type StaffTaskStatus = "pending" | "in_progress" | "completed" | "blocked";
export type NotificationChannel = "email" | "sms" | "whatsapp" | "all";
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: Array<{ field?: string; reason?: string }>;
}

export interface ClientSecurityContext {
  cookies: Record<string, string>;
  session_id: string | null;
  fingerprint: string | null;
  user_agent: string | null;
  /** 🔒 مفتاح Idempotency القادم من الهيدر x-idempotency-key */
  idempotency_key: string | null;
}

export interface UserAuditFields {
  user_id: string | null;
  user_type: UserRole | null;
  created_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;
}

export interface ListQueryOptions {
  page: number;
  limit: number;
  search: string | null;
  lookup_field: string | null;
  sort_by: string | null;
  sort_dir: "asc" | "desc";
  filters: Record<string, string>;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number | null;
  total_pages: number | null;
  next_page: number | null;
  prev_page: number | null;
  has_next: boolean;
  has_prev: boolean;
}

export interface ApiMetaPayload {
  route: string;
  method: HttpMethod;
  tenant_id: string | null;
  actor_id: string | null;
  user: UserAuditFields;
  security: Pick<ClientSecurityContext, "session_id" | "fingerprint" | "idempotency_key">;
  pagination?: PaginationMeta;
  locale: Locale;
  request_id: string;
  execution_ms: number;
}

export interface JsonApiResponse<T = unknown> {
  success: boolean;
  data: T | null;
  meta: ApiMetaPayload;
  error: ApiErrorPayload | null;
}

export interface UnifiedJsonRequestContext {
  path: string;
  method: HttpMethod;
  query?: Record<string, unknown>;
  body?: unknown;
  headers?: Record<string, string | undefined>;
}

export interface UnifiedHandlerContext {
  method: HttpMethod;
  path: string;
  params: Record<string, string>;
  query: Record<string, string>;
  list: ListQueryOptions;
  body: Record<string, unknown>;
  tenantId: string | null;
  actorId: string | null;
  user: UserAuditFields;
  security: ClientSecurityContext;
  locale: Locale;
}

export type UnifiedJsonHandler<T = unknown> = (
  ctx: UnifiedHandlerContext
) => Promise<Omit<JsonApiResponse<T>, "meta">> | Omit<JsonApiResponse<T>, "meta">;

interface CompiledUnifiedRoute {
  method: HttpMethod;
  pattern: string;
  regex: RegExp;
  paramNames: string[];
  handler: UnifiedJsonHandler<any>;
}

const VALID_ROLES: UserRole[] = ["super_admin", "moderator", "staff", "vendor", "customer"];
const VALID_THEMES: ThemeMode[] = ["light", "dark", "brand"];
const VALID_SYSTEM_MODES: SystemMode[] = ["ready", "maintenance", "development"];
const VALID_ORDER_STATUSES: OrderStatus[] = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];
const VALID_VENDOR_ORDER_STATUSES: VendorOrderStatus[] = ["pending", "confirmed", "processing", "shipped", "delivered"];
const VALID_REPORT_STATUSES: ReportResolutionStatus[] = ["resolved", "dismissed", "escalated"];
const VALID_POST_MOD_STATUSES: PostModerationStatus[] = ["approved", "hidden", "rejected"];
const VALID_REVIEW_STATUSES: ReviewModerationStatus[] = ["approved", "hidden", "flagged"];
const VALID_MOD_TICKET_STATUSES: TicketModerationStatus[] = ["open", "in_progress", "resolved", "closed"];
const VALID_FULFILLMENT_STATUSES: StaffFulfillmentStatus[] = ["picking", "packed", "shipped", "delivered", "on_hold"];
const VALID_SHIPMENT_STATUSES: StaffShipmentStatus[] = ["created", "in_transit", "out_for_delivery", "delivered", "returned"];
const VALID_STAFF_TICKET_STATUSES: StaffTicketStatus[] = ["open", "pending_customer", "resolved", "closed"];
const VALID_TASK_STATUSES: StaffTaskStatus[] = ["pending", "in_progress", "completed", "blocked"];
const VALID_CHANNELS: NotificationChannel[] = ["email", "sms", "whatsapp", "all"];

export function getDashboardRouteByRole(role: string | null | undefined, locale: Locale = "ar"): string | null {
  if (!role || !VALID_ROLES.includes(role as UserRole)) return null;
  const map: Record<UserRole, string> = {
    super_admin: `/${locale}/dashboard/admin`,
    moderator: `/${locale}/dashboard/moderator`,
    staff: `/${locale}/dashboard/staff`,
    vendor: `/${locale}/dashboard/vendor`,
    customer: `/${locale}/dashboard/customer`,
  };
  return map[role as UserRole];
}

export function buildPaginationMeta(page: number, limit: number, total: number | null | undefined): PaginationMeta {
  const safePage = Math.max(1, page);
  const safeLimit = Math.max(1, Math.min(200, limit));
  const numericTotal = typeof total === "number" && Number.isFinite(total) && total >= 0 ? total : null;
  const totalPages = numericTotal !== null ? Math.max(1, Math.ceil(numericTotal / safeLimit)) : null;
  const hasPrev = safePage > 1;
  const hasNext = totalPages !== null ? safePage < totalPages : true;
  return {
    page: safePage,
    limit: safeLimit,
    total: numericTotal,
    total_pages: totalPages,
    next_page: hasNext ? safePage + 1 : null,
    prev_page: hasPrev ? safePage - 1 : null,
    has_next: hasNext,
    has_prev: hasPrev,
  };
}

export class UnifiedJsonRouter {
  private routes: CompiledUnifiedRoute[] = [];

  public register<T = unknown>(method: HttpMethod, pattern: string, handler: UnifiedJsonHandler<T>): this {
    const paramNames: string[] = [];
    const regexSource =
      "^/" +
      pattern
        .split("/")
        .filter(Boolean)
        .map((segment) => {
          if (segment.startsWith("[") && segment.endsWith("]")) {
            paramNames.push(segment.slice(1, -1));
            return "([^/]+)";
          }
          if (segment.startsWith(":")) {
            paramNames.push(segment.slice(1));
            return "([^/]+)";
          }
          return segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        })
        .join("/") +
      "/?$";
    this.routes.push({ method, pattern, regex: new RegExp(regexSource), paramNames, handler });
    return this;
  }

  public get<T = unknown>(pattern: string, handler: UnifiedJsonHandler<T>): this { return this.register("GET", pattern, handler); }
  public post<T = unknown>(pattern: string, handler: UnifiedJsonHandler<T>): this { return this.register("POST", pattern, handler); }
  public put<T = unknown>(pattern: string, handler: UnifiedJsonHandler<T>): this { return this.register("PUT", pattern, handler); }
  public patch<T = unknown>(pattern: string, handler: UnifiedJsonHandler<T>): this { return this.register("PATCH", pattern, handler); }
  public delete<T = unknown>(pattern: string, handler: UnifiedJsonHandler<T>): this { return this.register("DELETE", pattern, handler); }

  private normalizeLocale(raw?: string): Locale {
    const code = (raw || "ar").split(",")[0]?.trim().toLowerCase().slice(0, 2);
    return code === "en" ? "en" : "ar";
  }

  private normalizeQuery(raw?: Record<string, unknown>): Record<string, string> {
    const out: Record<string, string> = {};
    if (!raw) return out;
    for (const [k, v] of Object.entries(raw)) {
      if (v !== undefined && v !== null && String(v) !== "") out[k] = String(v);
    }
    return out;
  }

  private parseCookies(cookieHeader?: string): Record<string, string> {
    const cookies: Record<string, string> = {};
    if (!cookieHeader) return cookies;
    for (const part of cookieHeader.split(";")) {
      const idx = part.indexOf("=");
      if (idx <= 0) continue;
      const key = part.slice(0, idx).trim();
      const val = part.slice(idx + 1).trim();
      if (key) {
        try { cookies[key] = decodeURIComponent(val); }
        catch { cookies[key] = val; }
      }
    }
    return cookies;
  }

  private parseListOptions(query: Record<string, string>, body: Record<string, unknown>): ListQueryOptions {
    const rawPage = Number(query.page ?? body.page ?? 1);
    const rawLimit = Number(query.limit ?? body.limit ?? 20);
    const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1;
    const limit = Number.isFinite(rawLimit) && rawLimit >= 1 ? Math.min(200, Math.floor(rawLimit)) : 20;
    const searchRaw = query.search ?? query.q ?? (typeof body.search === "string" ? body.search : "");
    const search = searchRaw.trim() ? searchRaw.trim() : null;
    const lookupFieldRaw = query.lookup_field ?? query.search_field ?? (typeof body.lookup_field === "string" ? body.lookup_field : "");
    const lookup_field = lookupFieldRaw.trim() ? lookupFieldRaw.trim() : null;
    const sortByRaw = query.sort_by ?? query.order_by ?? "";
    const sort_by = sortByRaw.trim() ? sortByRaw.trim() : null;
    const sort_dir: "asc" | "desc" = (query.sort_dir ?? query.order_dir ?? "desc").toLowerCase() === "asc" ? "asc" : "desc";
    const reserved = new Set(["page","limit","search","q","lookup_field","search_field","sort_by","order_by","sort_dir","order_dir","locale","tenant_id","actor_id","user_id","user_type"]);
    const filters: Record<string, string> = {};
    for (const [k, v] of Object.entries(query)) {
      if (!reserved.has(k) && v !== "") filters[k] = v;
    }
    if (body.filters && typeof body.filters === "object" && !Array.isArray(body.filters)) {
      for (const [k, v] of Object.entries(body.filters as Record<string, unknown>)) {
        if (v !== undefined && v !== null && String(v) !== "") filters[k] = String(v);
      }
    }
    return { page, limit, search, lookup_field, sort_by, sort_dir, filters };
  }

  private match(method: HttpMethod, cleanPath: string): { route: CompiledUnifiedRoute; params: Record<string, string> } | null {
    for (const route of this.routes) {
      if (route.method !== method) continue;
      const m = cleanPath.match(route.regex);
      if (m) {
        const params: Record<string, string> = {};
        route.paramNames.forEach((name, idx) => {
          params[name] = decodeURIComponent(m[idx + 1] || "");
        });
        return { route, params };
      }
    }
    return null;
  }

  public async dispatch<T = unknown>(req: UnifiedJsonRequestContext): Promise<JsonApiResponse<T>> {
    const startedAt = performance.now();
    const requestId = `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const parsedUrl = new URL(req.path, "http://localhost");
    const cleanPath = parsedUrl.pathname;
    const mergedQuery: Record<string, unknown> = {};
    parsedUrl.searchParams.forEach((value, key) => { mergedQuery[key] = value; });
    Object.assign(mergedQuery, req.query || {});
    const query = this.normalizeQuery(mergedQuery);
    const headersLower: Record<string, string> = {};
    Object.entries(req.headers || {}).forEach(([k, v]) => {
      if (v !== undefined) headersLower[k.toLowerCase()] = v;
    });
    const body =
      req.body && typeof req.body === "object" && !Array.isArray(req.body)
        ? (req.body as Record<string, unknown>)
        : {};
    const cookies = this.parseCookies(headersLower["cookie"]);
    const authHeader = headersLower["authorization"] || "";
    const bearerToken = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : null;
    const sessionId =
      bearerToken || headersLower["x-session-id"] || cookies["sid"] || cookies["session_id"] ||
      (typeof body.session_id === "string" ? body.session_id : null);
    const fingerprint =
      headersLower["x-fingerprint"] || headersLower["x-device-fingerprint"] ||
      cookies["fp"] || cookies["fingerprint"] ||
      (typeof body.fingerprint === "string" ? body.fingerprint : null);
    const locale = this.normalizeLocale(
      query.locale || headersLower["accept-language"] || cookies["locale"] || cookies["preferred_locale"]
    );
    const tenantId = headersLower["x-tenant-id"] || query.tenant_id || cookies["tenant_id"] || null;
    const rawUserId =
      headersLower["x-user-id"] || headersLower["x-actor-id"] || headersLower["x-vendor-id"] ||
      headersLower["x-moderator-id"] || headersLower["x-staff-id"] || headersLower["x-customer-id"] ||
      query.user_id || query.actor_id || (typeof body.user_id === "string" ? body.user_id : null);
    const rawUserType =
      headersLower["x-user-type"] || headersLower["x-role"] || query.user_type ||
      (typeof body.user_type === "string" ? body.user_type : null);
    const user: UserAuditFields = {
      user_id: rawUserId ? String(rawUserId) : null,
      user_type: rawUserType && VALID_ROLES.includes(rawUserType as UserRole) ? (rawUserType as UserRole) : null,
      created_at: headersLower["x-user-created-at"] || (typeof body.created_at === "string" ? body.created_at : null),
      updated_at: headersLower["x-user-updated-at"] || (typeof body.updated_at === "string" ? body.updated_at : null),
      deleted_at: headersLower["x-user-deleted-at"] || (typeof body.deleted_at === "string" ? body.deleted_at : null),
    };
    const security: ClientSecurityContext = {
      cookies,
      session_id: sessionId,
      fingerprint,
      user_agent: headersLower["user-agent"] || null,
      idempotency_key: headersLower["x-idempotency-key"] || null,
    };
    const list = this.parseListOptions(query, body);
    const actorId = user.user_id;
    let paginationMeta: PaginationMeta | undefined;
    if (req.method === "GET") {
      paginationMeta = buildPaginationMeta(list.page, list.limit, null);
    }
    const buildMeta = (): ApiMetaPayload => ({
      route: cleanPath,
      method: req.method,
      tenant_id: tenantId,
      actor_id: actorId,
      user,
      security: {
        session_id: security.session_id,
        fingerprint: security.fingerprint,
        idempotency_key: security.idempotency_key,
      },
      ...(paginationMeta ? { pagination: paginationMeta } : {}),
      locale,
      request_id: requestId,
      execution_ms: Math.max(1, Math.round(performance.now() - startedAt)),
    });
    const found = this.match(req.method, cleanPath);
    if (!found) {
      return {
        success: false,
        data: null,
        meta: buildMeta(),
        error: { code: "ROUTE_NOT_FOUND", message: locale === "ar" ? "مسار API غير موجود" : "API route not found" },
      };
    }
    try {
      const result = await found.route.handler({
        method: req.method,
        path: cleanPath,
        params: found.params,
        query,
        list,
        body,
        tenantId,
        actorId,
        user,
        security,
        locale,
      });
      const resData: any = result.data ?? null;
      if (req.method === "GET" && resData && typeof resData === "object" && !Array.isArray(resData)) {
        const candidateTotal =
          typeof resData.total === "number" ? resData.total
          : typeof resData.meta?.total === "number" ? resData.meta.total : null;
        paginationMeta = buildPaginationMeta(list.page, list.limit, candidateTotal);
      }
      return {
        success: Boolean(result.success),
        data: resData as T | null,
        meta: buildMeta(),
        error: result.error ?? null,
      };
    } catch (err) {
      return {
        success: false,
        data: null,
        meta: buildMeta(),
        error: {
          code: "INTERNAL_ERROR",
          message: locale === "ar" ? "حدث خطأ أثناء تنفيذ طلب JSON" : err instanceof Error ? err.message : "Internal error in unified JSON router",
        },
      };
    }
  }
}

export interface AllSystemServices {
  auth: {
    login: (payload: { email: string; password: string; tenantId: string | null; security: ClientSecurityContext }, locale: Locale) => Promise<any>;
    register: (payload: { full_name: string; email: string; phone?: string; password: string; user_type: UserRole; preferred_locale: Locale; tenantId: string | null; security: ClientSecurityContext }, locale: Locale) => Promise<any>;
    sendOtp: (payload: { channel: string; purpose: string; target: string; tenantId: string | null; security: ClientSecurityContext }, locale: Locale) => Promise<any>;
    verify2faOrCode: (payload: Record<string, unknown>, locale: Locale, tenantId: string | null, security: ClientSecurityContext) => Promise<any>;
    refreshSession: (payload: Record<string, unknown>, locale: Locale, tenantId: string | null, security: ClientSecurityContext) => Promise<any>;
    logout: (locale: Locale, tenantId: string | null, security: ClientSecurityContext) => Promise<any>;
    getReadiness: (tenantId: string | null) => Promise<{ state: SystemState; details?: Record<string, unknown> }>;
    getBootstrapStatus: () => Promise<{ needs_admin_setup: boolean; env_passcode_configured: boolean }>;
    bootstrapAdmin: (payload: { full_name: string; email: string; password: string; setup_passcode?: string; tenantId: string | null; security: ClientSecurityContext }, locale: Locale) => Promise<any>;
  };
  shared: {
    getProfile: (ctx: UnifiedHandlerContext) => Promise<any>;
    updateProfile: (ctx: UnifiedHandlerContext) => Promise<any>;
    changePassword: (ctx: UnifiedHandlerContext) => Promise<any>;
    listSessions: (ctx: UnifiedHandlerContext) => Promise<any>;
    revokeSession: (ctx: UnifiedHandlerContext) => Promise<any>;
    listNotifications: (ctx: UnifiedHandlerContext) => Promise<any>;
    sendNotification: (ctx: UnifiedHandlerContext) => Promise<any>;
    markNotificationRead: (ctx: UnifiedHandlerContext) => Promise<any>;
    markAllNotificationsRead: (ctx: UnifiedHandlerContext) => Promise<any>;
    listMessages: (ctx: UnifiedHandlerContext) => Promise<any>;
    sendMessage: (ctx: UnifiedHandlerContext) => Promise<any>;
    listMedia: (ctx: UnifiedHandlerContext) => Promise<any>;
    uploadMedia: (ctx: UnifiedHandlerContext) => Promise<any>;
    listSupportTickets: (ctx: UnifiedHandlerContext) => Promise<any>;
    createSupportTicket: (ctx: UnifiedHandlerContext) => Promise<any>;
  };
  admin: {
    getStats: (ctx: UnifiedHandlerContext) => Promise<any>;
    listReports: (ctx: UnifiedHandlerContext) => Promise<any>;
    generateReport: (ctx: UnifiedHandlerContext) => Promise<any>;
    getInvoiceTemplates: (ctx: UnifiedHandlerContext) => Promise<any>;
    saveInvoiceTemplate: (ctx: UnifiedHandlerContext) => Promise<any>;
    getReportTemplates: (ctx: UnifiedHandlerContext) => Promise<any>;
    saveReportTemplate: (ctx: UnifiedHandlerContext) => Promise<any>;
    dispatchNotification: (ctx: UnifiedHandlerContext) => Promise<any>;
    listUsers: (ctx: UnifiedHandlerContext) => Promise<any>;
    createUser: (ctx: UnifiedHandlerContext) => Promise<any>;
    updateUser: (ctx: UnifiedHandlerContext) => Promise<any>;
    listTenants: (ctx: UnifiedHandlerContext) => Promise<any>;
    createTenant: (ctx: UnifiedHandlerContext) => Promise<any>;
    updateTenant: (ctx: UnifiedHandlerContext) => Promise<any>;
    listProducts: (ctx: UnifiedHandlerContext) => Promise<any>;
    listOrders: (ctx: UnifiedHandlerContext) => Promise<any>;
    updateOrderStatus: (ctx: UnifiedHandlerContext) => Promise<any>;
    listPosts: (ctx: UnifiedHandlerContext) => Promise<any>;
    createPost: (ctx: UnifiedHandlerContext) => Promise<any>;
    getSettings: (ctx: UnifiedHandlerContext) => Promise<any>;
    updateSettings: (ctx: UnifiedHandlerContext) => Promise<any>;
    listAuditLogs: (ctx: UnifiedHandlerContext) => Promise<any>;
    getEnv: (ctx: UnifiedHandlerContext) => Promise<any>;
    updateEnv: (ctx: UnifiedHandlerContext) => Promise<any>;
    testEnv: (ctx: UnifiedHandlerContext) => Promise<any>;
    getChannel: (channel: "mail" | "sms" | "whatsapp", ctx: UnifiedHandlerContext) => Promise<any>;
    updateChannelConfig: (channel: "mail" | "sms" | "whatsapp", ctx: UnifiedHandlerContext) => Promise<any>;
    saveChannelTemplate: (channel: "mail" | "sms" | "whatsapp", ctx: UnifiedHandlerContext) => Promise<any>;
    testChannelSend: (channel: "mail" | "sms" | "whatsapp", ctx: UnifiedHandlerContext) => Promise<any>;
    getPaypal: (ctx: UnifiedHandlerContext) => Promise<any>;
    updatePaypalConfig: (ctx: UnifiedHandlerContext) => Promise<any>;
    savePaypalTemplate: (ctx: UnifiedHandlerContext) => Promise<any>;
    testPaypalIntent: (ctx: UnifiedHandlerContext) => Promise<any>;
    getStorage: (ctx: UnifiedHandlerContext) => Promise<any>;
    updateStorage: (ctx: UnifiedHandlerContext) => Promise<any>;
    testStorage: (ctx: UnifiedHandlerContext) => Promise<any>;
    listRoles: (ctx: UnifiedHandlerContext) => Promise<any>;
    saveRole: (ctx: UnifiedHandlerContext) => Promise<any>;
    getSeo: (ctx: UnifiedHandlerContext) => Promise<any>;
    updateSeo: (ctx: UnifiedHandlerContext) => Promise<any>;
    generateSeoFiles: (ctx: UnifiedHandlerContext) => Promise<any>;
    getAnalytics: (ctx: UnifiedHandlerContext) => Promise<any>;
    updateAnalytics: (ctx: UnifiedHandlerContext) => Promise<any>;
    exportAnalyticsConfig: (ctx: UnifiedHandlerContext) => Promise<any>;
    getAdsense: (ctx: UnifiedHandlerContext) => Promise<any>;
    updateAdsense: (ctx: UnifiedHandlerContext) => Promise<any>;
    generateAdsTxt: (ctx: UnifiedHandlerContext) => Promise<any>;
    getThemes: (ctx: UnifiedHandlerContext) => Promise<any>;
    updateThemes: (ctx: UnifiedHandlerContext) => Promise<any>;
    getLocales: (ctx: UnifiedHandlerContext) => Promise<any>;
    updateLocales: (ctx: UnifiedHandlerContext) => Promise<any>;
    getSystemState: (ctx: UnifiedHandlerContext) => Promise<any>;
    updateSystemState: (ctx: UnifiedHandlerContext) => Promise<any>;
    getSiteIdentity: (ctx: UnifiedHandlerContext) => Promise<any>;
    updateSiteIdentity: (ctx: UnifiedHandlerContext) => Promise<any>;
    getLayoutSection: (section: "footer" | "head" | "header", ctx: UnifiedHandlerContext) => Promise<any>;
    saveLayoutSection: (section: "footer" | "head" | "header", ctx: UnifiedHandlerContext) => Promise<any>;
    getSidebar: (ctx: UnifiedHandlerContext) => Promise<any>;
    saveSidebar: (ctx: UnifiedHandlerContext) => Promise<any>;
  };
  vendor: {
    getStats: (ctx: UnifiedHandlerContext) => Promise<any>;
    listReports: (ctx: UnifiedHandlerContext) => Promise<any>;
    generateReport: (ctx: UnifiedHandlerContext) => Promise<any>;
    listProducts: (ctx: UnifiedHandlerContext) => Promise<any>;
    createProduct: (ctx: UnifiedHandlerContext) => Promise<any>;
    updateProduct: (ctx: UnifiedHandlerContext) => Promise<any>;
    deleteProduct: (ctx: UnifiedHandlerContext) => Promise<any>;
    updateProductVariants: (ctx: UnifiedHandlerContext) => Promise<any>;
    updateProductStock: (ctx: UnifiedHandlerContext) => Promise<any>;
    listOrders: (ctx: UnifiedHandlerContext) => Promise<any>;
    updateOrderStatus: (ctx: UnifiedHandlerContext) => Promise<any>;
    getOrderInvoice: (ctx: UnifiedHandlerContext) => Promise<any>;
    listShipments: (ctx: UnifiedHandlerContext) => Promise<any>;
    createShipment: (ctx: UnifiedHandlerContext) => Promise<any>;
    getPayouts: (ctx: UnifiedHandlerContext) => Promise<any>;
    requestPayout: (ctx: UnifiedHandlerContext) => Promise<any>;
    getStore: (ctx: UnifiedHandlerContext) => Promise<any>;
    updateStore: (ctx: UnifiedHandlerContext) => Promise<any>;
    listReviews: (ctx: UnifiedHandlerContext) => Promise<any>;
    replyReview: (ctx: UnifiedHandlerContext) => Promise<any>;
  };
  moderator: {
    getStats: (ctx: UnifiedHandlerContext) => Promise<any>;
    listReports: (ctx: UnifiedHandlerContext) => Promise<any>;
    resolveReport: (ctx: UnifiedHandlerContext) => Promise<any>;
    listPosts: (ctx: UnifiedHandlerContext) => Promise<any>;
    moderatePost: (ctx: UnifiedHandlerContext) => Promise<any>;
    listReviews: (ctx: UnifiedHandlerContext) => Promise<any>;
    updateReviewStatus: (ctx: UnifiedHandlerContext) => Promise<any>;
    listTickets: (ctx: UnifiedHandlerContext) => Promise<any>;
    replyTicket: (ctx: UnifiedHandlerContext) => Promise<any>;
    updateTicketStatus: (ctx: UnifiedHandlerContext) => Promise<any>;
    createModerationAction: (ctx: UnifiedHandlerContext) => Promise<any>;
    listActivityLogs: (ctx: UnifiedHandlerContext) => Promise<any>;
  };
  staff: {
    getStats: (ctx: UnifiedHandlerContext) => Promise<any>;
    listOrders: (ctx: UnifiedHandlerContext) => Promise<any>;
    updateOrderFulfillment: (ctx: UnifiedHandlerContext) => Promise<any>;
    listShipments: (ctx: UnifiedHandlerContext) => Promise<any>;
    createShipment: (ctx: UnifiedHandlerContext) => Promise<any>;
    updateShipmentStatus: (ctx: UnifiedHandlerContext) => Promise<any>;
    listInventory: (ctx: UnifiedHandlerContext) => Promise<any>;
    adjustInventoryStock: (ctx: UnifiedHandlerContext) => Promise<any>;
    listTickets: (ctx: UnifiedHandlerContext) => Promise<any>;
    replyTicket: (ctx: UnifiedHandlerContext) => Promise<any>;
    updateTicketStatus: (ctx: UnifiedHandlerContext) => Promise<any>;
    listTasks: (ctx: UnifiedHandlerContext) => Promise<any>;
    updateTaskStatus: (ctx: UnifiedHandlerContext) => Promise<any>;
  };
  customer: {
    getStats: (ctx: UnifiedHandlerContext) => Promise<any>;
    listOrders: (ctx: UnifiedHandlerContext) => Promise<any>;
    getOrderById: (ctx: UnifiedHandlerContext) => Promise<any>;
    cancelOrder: (ctx: UnifiedHandlerContext) => Promise<any>;
    getOrderInvoice: (ctx: UnifiedHandlerContext) => Promise<any>;
    listShipments: (ctx: UnifiedHandlerContext) => Promise<any>;
    trackShipment: (ctx: UnifiedHandlerContext) => Promise<any>;
    listAddresses: (ctx: UnifiedHandlerContext) => Promise<any>;
    createAddress: (ctx: UnifiedHandlerContext) => Promise<any>;
    updateAddress: (ctx: UnifiedHandlerContext) => Promise<any>;
    deleteAddress: (ctx: UnifiedHandlerContext) => Promise<any>;
    listWishlist: (ctx: UnifiedHandlerContext) => Promise<any>;
    addWishlist: (ctx: UnifiedHandlerContext) => Promise<any>;
    removeWishlist: (ctx: UnifiedHandlerContext) => Promise<any>;
    getWallet: (ctx: UnifiedHandlerContext) => Promise<any>;
    topupWallet: (ctx: UnifiedHandlerContext) => Promise<any>;
    listReviews: (ctx: UnifiedHandlerContext) => Promise<any>;
    createReview: (ctx: UnifiedHandlerContext) => Promise<any>;
  };
  publicCatalog: {
    getSiteInfo: (ctx: UnifiedHandlerContext) => Promise<any>;
    listProducts: (ctx: UnifiedHandlerContext) => Promise<any>;
    getProductById: (ctx: UnifiedHandlerContext) => Promise<any>;
    listStores: (ctx: UnifiedHandlerContext) => Promise<any>;
    listPosts: (ctx: UnifiedHandlerContext) => Promise<any>;
    getPostBySlug: (ctx: UnifiedHandlerContext) => Promise<any>;
    trackShipment: (ctx: UnifiedHandlerContext) => Promise<any>;
    submitContact: (ctx: UnifiedHandlerContext) => Promise<any>;
  };
}

export function createUnifiedApiRouter(services: AllSystemServices): UnifiedJsonRouter {
  const router = new UnifiedJsonRouter();

  router.post("/api/v1/auth/login", async ({ body, locale, tenantId, security }) => {
    const email = String(body.email || "").trim();
    const password = String(body.password || "");
    const effectiveTenant = body.tenant_id ? String(body.tenant_id) : tenantId;
    if (!email || !password) {
      return { success: false, data: null, error: { code: "VALIDATION_ERROR", message: locale === "ar" ? "البريد الإلكتروني وكلمة المرور مطلوبان" : "Email and password required" } };
    }
    const result = await services.auth.login({ email, password, tenantId: effectiveTenant, security }, locale);
    const role = result?.user_type || result?.user?.user_type || null;
    const redirectUrl = result?.redirect_url || getDashboardRouteByRole(role, locale);
    return { success: true, data: { ...result, ...(redirectUrl ? { redirect_url: redirectUrl } : {}) }, error: null };
  });

  router.post("/api/v1/auth/register", async ({ body, locale, tenantId, security }) => {
    const full_name = String(body.full_name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const rawRole = String(body.user_type || "customer");
    if (rawRole !== "customer" && rawRole !== "vendor") {
      return {
        success: false,
        data: null,
        error: {
          code: "FORBIDDEN_ROLE",
          message: locale === "ar" ? "التسجيل الذاتي متاح للعملاء والتجار فقط" : "Self-registration is limited to customer and vendor accounts",
        },
      };
    }
    const user_type: UserRole = rawRole;
    const preferred_locale: Locale = body.preferred_locale === "en" ? "en" : locale;
    const effectiveTenant = body.tenant_id ? String(body.tenant_id) : tenantId;
    if (!full_name || !email || password.length < 8) {
      return { success: false, data: null, error: { code: "VALIDATION_ERROR", message: locale === "ar" ? "الاسم الكامل والبريد وكلمة المرور (8+) مطلوبة" : "Name, email, and password (8+) required" } };
    }
    const created = await services.auth.register({ full_name, email, phone: body.phone ? String(body.phone).trim() : undefined, password, user_type, preferred_locale, tenantId: effectiveTenant, security }, locale);
    return { success: true, data: created, error: null };
  });

  router.get("/api/v1/auth/bootstrap-status", async () => {
    return { success: true, data: await services.auth.getBootstrapStatus(), error: null };
  });

  router.post("/api/v1/auth/bootstrap-admin", async ({ body, locale, tenantId, security }) => {
    const full_name = String(body.full_name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const setup_passcode = body.setup_passcode ? String(body.setup_passcode) : undefined;
    if (!full_name || !email || password.length < 8) {
      return {
        success: false,
        data: null,
        error: {
          code: "VALIDATION_ERROR",
          message: locale === "ar" ? "الاسم الكامل والبريد وكلمة المرور (8+) مطلوبة" : "Name, email, and password (8+) required",
        },
      };
    }
    const result = await services.auth.bootstrapAdmin({ full_name, email, password, setup_passcode, tenantId, security }, locale);
    const redirectUrl = getDashboardRouteByRole("super_admin", locale);
    return { success: true, data: { ...result, ...(redirectUrl ? { redirect_url: redirectUrl } : {}) }, error: null };
  });

  router.post("/api/v1/auth/otp/send", async ({ body, locale, tenantId, security }) => {
    const channel = String(body.channel || "email").trim();
    const purpose = String(body.purpose || "verify_contact").trim();
    const target = String(body.target || "").trim();
    if (!target) {
      return { success: false, data: null, error: { code: "TARGET_REQUIRED", message: locale === "ar" ? "هدف الإرسال مطلوب" : "Target required" } };
    }
    return { success: true, data: await services.auth.sendOtp({ channel, purpose, target, tenantId, security }, locale), error: null };
  });

  router.post("/api/v1/auth/2fa/verify", async ({ body, locale, tenantId, security }) => {
    const code = String(body.code || "").trim();
    if (!code) {
      return { success: false, data: null, error: { code: "CODE_REQUIRED", message: locale === "ar" ? "رمز التحقق مطلوب" : "Verification code required" } };
    }
    const verified = await services.auth.verify2faOrCode(body, locale, tenantId, security);
    const role = verified?.user_type || verified?.user?.user_type || null;
    const redirectUrl = verified?.redirect_url || getDashboardRouteByRole(role, locale);
    return { success: true, data: { ...verified, ...(redirectUrl ? { redirect_url: redirectUrl } : {}) }, error: null };
  });

  router.post("/api/v1/auth/refresh", async ({ body, locale, tenantId, security }) => {
    const refreshed = await services.auth.refreshSession(body, locale, tenantId, security);
    const role = refreshed?.user_type || refreshed?.user?.user_type || refreshed?.role || null;
    const redirectUrl = getDashboardRouteByRole(role, locale);
    return { success: true, data: { ...refreshed, ...(redirectUrl ? { redirect_url: redirectUrl } : {}) }, error: null };
  });

  router.post("/api/v1/auth/logout", async ({ locale, tenantId, security }) => {
    const res = await services.auth.logout(locale, tenantId, security);
    return { success: true, data: res ?? { logged_out: true }, error: null };
  });

  router.get("/api/v1/health/ready", async ({ tenantId }) => {
    const health = await services.auth.getReadiness(tenantId);
    return { success: true, data: { status: health.state, state: health.state, ...(health.details || {}) }, error: null };
  });

  router.get("/api/v1/profile", async (ctx) => ({ success: true, data: await services.shared.getProfile(ctx), error: null }));
  router.patch("/api/v1/profile", async (ctx) => ({ success: true, data: await services.shared.updateProfile(ctx), error: null }));
  router.patch("/api/v1/profile/password", async (ctx) => ({ success: true, data: await services.shared.changePassword(ctx), error: null }));
  router.get("/api/v1/profile/sessions", async (ctx) => ({ success: true, data: await services.shared.listSessions(ctx), error: null }));
  router.delete("/api/v1/profile/sessions/[id]", async (ctx) => ({ success: true, data: await services.shared.revokeSession(ctx), error: null }));

  router.get("/api/v1/notifications", async (ctx) => ({ success: true, data: await services.shared.listNotifications(ctx), error: null }));
  router.post("/api/v1/notifications/send", async (ctx) => {
    const ch = String(ctx.body.channel || "all") as NotificationChannel;
    if (!VALID_CHANNELS.includes(ch)) {
      return { success: false, data: null, error: { code: "INVALID_CHANNEL", message: ctx.locale === "ar" ? "قناة الإشعار غير صالحة" : "Invalid notification channel" } };
    }
    return { success: true, data: await services.shared.sendNotification(ctx), error: null };
  });
  router.patch("/api/v1/notifications/[id]/read", async (ctx) => ({ success: true, data: await services.shared.markNotificationRead(ctx), error: null }));
  router.patch("/api/v1/notifications/read-all", async (ctx) => ({ success: true, data: await services.shared.markAllNotificationsRead(ctx), error: null }));

  router.get("/api/v1/messages", async (ctx) => ({ success: true, data: await services.shared.listMessages(ctx), error: null }));
  router.post("/api/v1/messages", async (ctx) => ({ success: true, data: await services.shared.sendMessage(ctx), error: null }));

  router.get("/api/v1/media", async (ctx) => ({ success: true, data: await services.shared.listMedia(ctx), error: null }));
  router.post("/api/v1/media/upload", async (ctx) => ({ success: true, data: await services.shared.uploadMedia(ctx), error: null }));

  router.get("/api/v1/support/tickets", async (ctx) => ({ success: true, data: await services.shared.listSupportTickets(ctx), error: null }));
  router.post("/api/v1/support/tickets", async (ctx) => ({ success: true, data: await services.shared.createSupportTicket(ctx), error: null }));

  router.get("/api/v1/admin/stats", async (ctx) => ({ success: true, data: await services.admin.getStats(ctx), error: null }));
  router.get("/api/v1/admin/reports", async (ctx) => ({ success: true, data: await services.admin.listReports(ctx), error: null }));
  router.post("/api/v1/admin/reports", async (ctx) => ({ success: true, data: await services.admin.generateReport(ctx), error: null }));

  router.get("/api/v1/admin/templates/invoices", async (ctx) => ({ success: true, data: await services.admin.getInvoiceTemplates(ctx), error: null }));
  router.put("/api/v1/admin/templates/invoices", async (ctx) => ({ success: true, data: await services.admin.saveInvoiceTemplate(ctx), error: null }));
  router.post("/api/v1/admin/templates/invoices", async (ctx) => ({ success: true, data: await services.admin.saveInvoiceTemplate(ctx), error: null }));

  router.get("/api/v1/admin/templates/reports", async (ctx) => ({ success: true, data: await services.admin.getReportTemplates(ctx), error: null }));
  router.put("/api/v1/admin/templates/reports", async (ctx) => ({ success: true, data: await services.admin.saveReportTemplate(ctx), error: null }));
  router.post("/api/v1/admin/templates/reports", async (ctx) => ({ success: true, data: await services.admin.saveReportTemplate(ctx), error: null }));

  router.post("/api/v1/admin/notifications/dispatch", async (ctx) => ({ success: true, data: await services.admin.dispatchNotification(ctx), error: null }));

  router.get("/api/v1/admin/users", async (ctx) => ({ success: true, data: await services.admin.listUsers(ctx), error: null }));
  router.post("/api/v1/admin/users", async (ctx) => ({ success: true, data: await services.admin.createUser(ctx), error: null }));
  router.patch("/api/v1/admin/users/[id]", async (ctx) => ({ success: true, data: await services.admin.updateUser(ctx), error: null }));

  router.get("/api/v1/admin/tenants", async (ctx) => ({ success: true, data: await services.admin.listTenants(ctx), error: null }));
  router.post("/api/v1/admin/tenants", async (ctx) => ({ success: true, data: await services.admin.createTenant(ctx), error: null }));
  router.patch("/api/v1/admin/tenants/[id]", async (ctx) => ({ success: true, data: await services.admin.updateTenant(ctx), error: null }));

  router.get("/api/v1/admin/products", async (ctx) => ({ success: true, data: await services.admin.listProducts(ctx), error: null }));
  router.get("/api/v1/admin/orders", async (ctx) => ({ success: true, data: await services.admin.listOrders(ctx), error: null }));
  router.patch("/api/v1/admin/orders/[id]", async (ctx) => {
    const status = String(ctx.body.status || "");
    if (!VALID_ORDER_STATUSES.includes(status as OrderStatus)) {
      return { success: false, data: null, error: { code: "INVALID_ORDER_STATUS", message: ctx.locale === "ar" ? "حالة الطلب غير صالحة" : "Invalid order status" } };
    }
    return { success: true, data: await services.admin.updateOrderStatus(ctx), error: null };
  });

  router.get("/api/v1/admin/blog/posts", async (ctx) => ({ success: true, data: await services.admin.listPosts(ctx), error: null }));
  router.post("/api/v1/admin/blog/posts", async (ctx) => ({ success: true, data: await services.admin.createPost(ctx), error: null }));

  router.get("/api/v1/admin/settings", async (ctx) => ({ success: true, data: await services.admin.getSettings(ctx), error: null }));
  router.patch("/api/v1/admin/settings", async (ctx) => {
    const nextLocale: Locale | undefined = ctx.body.preferred_locale === "ar" || ctx.body.preferred_locale === "en" ? ctx.body.preferred_locale : undefined;
    const nextTheme: ThemeMode | undefined =
      typeof ctx.body.preferred_theme === "string" && VALID_THEMES.includes(ctx.body.preferred_theme as ThemeMode)
        ? (ctx.body.preferred_theme as ThemeMode) : undefined;
    const updated = await services.admin.updateSettings(ctx);
    return {
      success: true,
      data: {
        ...(nextLocale ? { preferred_locale: nextLocale } : {}),
        ...(nextTheme ? { preferred_theme: nextTheme } : {}),
        ...(updated && typeof updated === "object" ? updated : {}),
      },
      error: null,
    };
  });
  router.get("/api/v1/admin/audit-logs", async (ctx) => ({ success: true, data: await services.admin.listAuditLogs(ctx), error: null }));

  router.get("/api/v1/admin/env", async (ctx) => ({ success: true, data: await services.admin.getEnv(ctx), error: null }));
  router.patch("/api/v1/admin/env", async (ctx) => ({ success: true, data: await services.admin.updateEnv(ctx), error: null }));
  router.post("/api/v1/admin/env/test", async (ctx) => ({ success: true, data: await services.admin.testEnv(ctx), error: null }));

  for (const ch of ["mail", "sms", "whatsapp"] as const) {
    router.get(`/api/v1/admin/channels/${ch}`, async (ctx) => ({ success: true, data: await services.admin.getChannel(ch, ctx), error: null }));
    router.patch(`/api/v1/admin/channels/${ch}/config`, async (ctx) => ({ success: true, data: await services.admin.updateChannelConfig(ch, ctx), error: null }));
    router.put(`/api/v1/admin/channels/${ch}/templates`, async (ctx) => ({ success: true, data: await services.admin.saveChannelTemplate(ch, ctx), error: null }));
    router.post(`/api/v1/admin/channels/${ch}/test`, async (ctx) => ({ success: true, data: await services.admin.testChannelSend(ch, ctx), error: null }));
  }

  router.get("/api/v1/admin/payments/paypal", async (ctx) => ({ success: true, data: await services.admin.getPaypal(ctx), error: null }));
  router.patch("/api/v1/admin/payments/paypal/config", async (ctx) => ({ success: true, data: await services.admin.updatePaypalConfig(ctx), error: null }));
  router.put("/api/v1/admin/payments/paypal/templates", async (ctx) => ({ success: true, data: await services.admin.savePaypalTemplate(ctx), error: null }));
  router.post("/api/v1/admin/payments/paypal/test", async (ctx) => ({ success: true, data: await services.admin.testPaypalIntent(ctx), error: null }));

  router.get("/api/v1/admin/storage", async (ctx) => ({ success: true, data: await services.admin.getStorage(ctx), error: null }));
  router.patch("/api/v1/admin/storage", async (ctx) => ({ success: true, data: await services.admin.updateStorage(ctx), error: null }));
  router.post("/api/v1/admin/storage/test", async (ctx) => ({ success: true, data: await services.admin.testStorage(ctx), error: null }));

  router.get("/api/v1/admin/roles", async (ctx) => ({ success: true, data: await services.admin.listRoles(ctx), error: null }));
  router.put("/api/v1/admin/roles/[roleKey]", async (ctx) => ({ success: true, data: await services.admin.saveRole(ctx), error: null }));

  router.get("/api/v1/admin/seo", async (ctx) => ({ success: true, data: await services.admin.getSeo(ctx), error: null }));
  router.patch("/api/v1/admin/seo", async (ctx) => ({ success: true, data: await services.admin.updateSeo(ctx), error: null }));
  router.post("/api/v1/admin/seo/generate-files", async (ctx) => ({ success: true, data: await services.admin.generateSeoFiles(ctx), error: null }));

  router.get("/api/v1/admin/integrations/google-analytics", async (ctx) => ({ success: true, data: await services.admin.getAnalytics(ctx), error: null }));
  router.patch("/api/v1/admin/integrations/google-analytics", async (ctx) => ({ success: true, data: await services.admin.updateAnalytics(ctx), error: null }));
  router.post("/api/v1/admin/integrations/google-analytics/config-file", async (ctx) => ({ success: true, data: await services.admin.exportAnalyticsConfig(ctx), error: null }));

  router.get("/api/v1/admin/integrations/adsense", async (ctx) => ({ success: true, data: await services.admin.getAdsense(ctx), error: null }));
  router.patch("/api/v1/admin/integrations/adsense", async (ctx) => ({ success: true, data: await services.admin.updateAdsense(ctx), error: null }));
  router.post("/api/v1/admin/integrations/adsense/ads-txt", async (ctx) => ({ success: true, data: await services.admin.generateAdsTxt(ctx), error: null }));

  router.get("/api/v1/admin/appearance/themes", async (ctx) => ({ success: true, data: await services.admin.getThemes(ctx), error: null }));
  router.patch("/api/v1/admin/appearance/themes", async (ctx) => ({ success: true, data: await services.admin.updateThemes(ctx), error: null }));
  router.get("/api/v1/admin/appearance/locales", async (ctx) => ({ success: true, data: await services.admin.getLocales(ctx), error: null }));
  router.patch("/api/v1/admin/appearance/locales", async (ctx) => ({ success: true, data: await services.admin.updateLocales(ctx), error: null }));

  router.get("/api/v1/admin/system/state", async (ctx) => ({ success: true, data: await services.admin.getSystemState(ctx), error: null }));
  router.patch("/api/v1/admin/system/state", async (ctx) => {
    const mode = String(ctx.body.mode || ctx.body.state || "");
    if (mode && !VALID_SYSTEM_MODES.includes(mode as SystemMode)) {
      return { success: false, data: null, error: { code: "INVALID_SYSTEM_MODE", message: ctx.locale === "ar" ? "وضع النظام غير صالح" : "Invalid system mode" } };
    }
    return { success: true, data: await services.admin.updateSystemState(ctx), error: null };
  });

  router.get("/api/v1/admin/site/identity", async (ctx) => ({ success: true, data: await services.admin.getSiteIdentity(ctx), error: null }));
  router.patch("/api/v1/admin/site/identity", async (ctx) => ({ success: true, data: await services.admin.updateSiteIdentity(ctx), error: null }));

  for (const sec of ["footer", "head", "header"] as const) {
    router.get(`/api/v1/admin/layout/${sec}`, async (ctx) => ({ success: true, data: await services.admin.getLayoutSection(sec, ctx), error: null }));
    router.put(`/api/v1/admin/layout/${sec}`, async (ctx) => ({ success: true, data: await services.admin.saveLayoutSection(sec, ctx), error: null }));
  }

  router.get("/api/v1/admin/layout/sidebar", async (ctx) => ({ success: true, data: await services.admin.getSidebar(ctx), error: null }));
  router.put("/api/v1/admin/layout/sidebar/[userType]", async (ctx) => ({ success: true, data: await services.admin.saveSidebar(ctx), error: null }));

  router.get("/api/v1/vendor/stats", async (ctx) => ({ success: true, data: await services.vendor.getStats(ctx), error: null }));
  router.get("/api/v1/vendor/reports", async (ctx) => ({ success: true, data: await services.vendor.listReports(ctx), error: null }));
  router.post("/api/v1/vendor/reports", async (ctx) => ({ success: true, data: await services.vendor.generateReport(ctx), error: null }));
  router.get("/api/v1/vendor/products", async (ctx) => ({ success: true, data: await services.vendor.listProducts(ctx), error: null }));
  router.post("/api/v1/vendor/products", async (ctx) => ({ success: true, data: await services.vendor.createProduct(ctx), error: null }));
  router.patch("/api/v1/vendor/products/[id]", async (ctx) => ({ success: true, data: await services.vendor.updateProduct(ctx), error: null }));
  router.delete("/api/v1/vendor/products/[id]", async (ctx) => ({ success: true, data: await services.vendor.deleteProduct(ctx), error: null }));
  router.put("/api/v1/vendor/products/[id]/variants", async (ctx) => ({ success: true, data: await services.vendor.updateProductVariants(ctx), error: null }));
  router.patch("/api/v1/vendor/products/[id]/stock", async (ctx) => ({ success: true, data: await services.vendor.updateProductStock(ctx), error: null }));
  router.get("/api/v1/vendor/orders", async (ctx) => ({ success: true, data: await services.vendor.listOrders(ctx), error: null }));
  router.patch("/api/v1/vendor/orders/[id]/status", async (ctx) => {
    const status = String(ctx.body.status || "");
    if (!VALID_VENDOR_ORDER_STATUSES.includes(status as VendorOrderStatus)) {
      return { success: false, data: null, error: { code: "INVALID_VENDOR_ORDER_STATUS", message: ctx.locale === "ar" ? "حالة الطلب غير صالحة" : "Invalid order status" } };
    }
    return { success: true, data: await services.vendor.updateOrderStatus(ctx), error: null };
  });
  router.get("/api/v1/vendor/orders/[id]/invoice", async (ctx) => ({ success: true, data: await services.vendor.getOrderInvoice(ctx), error: null }));
  router.get("/api/v1/vendor/shipments", async (ctx) => ({ success: true, data: await services.vendor.listShipments(ctx), error: null }));
  router.post("/api/v1/vendor/shipments", async (ctx) => ({ success: true, data: await services.vendor.createShipment(ctx), error: null }));
  router.get("/api/v1/vendor/payouts", async (ctx) => ({ success: true, data: await services.vendor.getPayouts(ctx), error: null }));
  router.post("/api/v1/vendor/payouts/request", async (ctx) => ({ success: true, data: await services.vendor.requestPayout(ctx), error: null }));
  router.get("/api/v1/vendor/store", async (ctx) => ({ success: true, data: await services.vendor.getStore(ctx), error: null }));
  router.patch("/api/v1/vendor/store", async (ctx) => ({ success: true, data: await services.vendor.updateStore(ctx), error: null }));
  router.get("/api/v1/vendor/reviews", async (ctx) => ({ success: true, data: await services.vendor.listReviews(ctx), error: null }));
  router.post("/api/v1/vendor/reviews/[id]/reply", async (ctx) => ({ success: true, data: await services.vendor.replyReview(ctx), error: null }));

  router.get("/api/v1/moderator/stats", async (ctx) => ({ success: true, data: await services.moderator.getStats(ctx), error: null }));
  router.get("/api/v1/moderator/reports", async (ctx) => ({ success: true, data: await services.moderator.listReports(ctx), error: null }));
  router.patch("/api/v1/moderator/reports/[id]/resolve", async (ctx) => {
    const status = String(ctx.body.status || "");
    if (!VALID_REPORT_STATUSES.includes(status as ReportResolutionStatus)) {
      return { success: false, data: null, error: { code: "INVALID_REPORT_RESOLUTION", message: ctx.locale === "ar" ? "حالة معالجة البلاغ غير صالحة" : "Invalid report resolution" } };
    }
    return { success: true, data: await services.moderator.resolveReport(ctx), error: null };
  });
  router.get("/api/v1/moderator/posts", async (ctx) => ({ success: true, data: await services.moderator.listPosts(ctx), error: null }));
  router.patch("/api/v1/moderator/posts/[id]/moderation", async (ctx) => {
    const status = String(ctx.body.status || "");
    if (!VALID_POST_MOD_STATUSES.includes(status as PostModerationStatus)) {
      return { success: false, data: null, error: { code: "INVALID_POST_MODERATION", message: ctx.locale === "ar" ? "حالة مراجعة المنشور غير صالحة" : "Invalid post moderation status" } };
    }
    return { success: true, data: await services.moderator.moderatePost(ctx), error: null };
  });
  router.get("/api/v1/moderator/reviews", async (ctx) => ({ success: true, data: await services.moderator.listReviews(ctx), error: null }));
  router.patch("/api/v1/moderator/reviews/[id]/status", async (ctx) => {
    const status = String(ctx.body.status || "");
    if (!VALID_REVIEW_STATUSES.includes(status as ReviewModerationStatus)) {
      return { success: false, data: null, error: { code: "INVALID_REVIEW_STATUS", message: ctx.locale === "ar" ? "حالة التقييم غير صالحة" : "Invalid review status" } };
    }
    return { success: true, data: await services.moderator.updateReviewStatus(ctx), error: null };
  });
  router.get("/api/v1/moderator/tickets", async (ctx) => ({ success: true, data: await services.moderator.listTickets(ctx), error: null }));
  router.post("/api/v1/moderator/tickets/[id]/reply", async (ctx) => ({ success: true, data: await services.moderator.replyTicket(ctx), error: null }));
  router.patch("/api/v1/moderator/tickets/[id]/status", async (ctx) => {
    const status = String(ctx.body.status || "");
    if (!VALID_MOD_TICKET_STATUSES.includes(status as TicketModerationStatus)) {
      return { success: false, data: null, error: { code: "INVALID_TICKET_STATUS", message: ctx.locale === "ar" ? "حالة التذكرة غير صالحة" : "Invalid ticket status" } };
    }
    return { success: true, data: await services.moderator.updateTicketStatus(ctx), error: null };
  });
  router.post("/api/v1/moderator/moderation-actions", async (ctx) => ({ success: true, data: await services.moderator.createModerationAction(ctx), error: null }));
  router.get("/api/v1/moderator/activity-logs", async (ctx) => ({ success: true, data: await services.moderator.listActivityLogs(ctx), error: null }));

  router.get("/api/v1/staff/stats", async (ctx) => ({ success: true, data: await services.staff.getStats(ctx), error: null }));
  router.get("/api/v1/staff/orders", async (ctx) => ({ success: true, data: await services.staff.listOrders(ctx), error: null }));
  router.patch("/api/v1/staff/orders/[id]/fulfillment", async (ctx) => {
    const status = String(ctx.body.status || "");
    if (!VALID_FULFILLMENT_STATUSES.includes(status as StaffFulfillmentStatus)) {
      return { success: false, data: null, error: { code: "INVALID_FULFILLMENT_STATUS", message: ctx.locale === "ar" ? "حالة التنفيذ غير صالحة" : "Invalid fulfillment status" } };
    }
    return { success: true, data: await services.staff.updateOrderFulfillment(ctx), error: null };
  });
  router.get("/api/v1/staff/shipments", async (ctx) => ({ success: true, data: await services.staff.listShipments(ctx), error: null }));
  router.post("/api/v1/staff/shipments", async (ctx) => ({ success: true, data: await services.staff.createShipment(ctx), error: null }));
  router.patch("/api/v1/staff/shipments/[id]/status", async (ctx) => {
    const status = String(ctx.body.status || "");
    if (!VALID_SHIPMENT_STATUSES.includes(status as StaffShipmentStatus)) {
      return { success: false, data: null, error: { code: "INVALID_SHIPMENT_STATUS", message: ctx.locale === "ar" ? "حالة الشحنة غير صالحة" : "Invalid shipment status" } };
    }
    return { success: true, data: await services.staff.updateShipmentStatus(ctx), error: null };
  });
  router.get("/api/v1/staff/inventory", async (ctx) => ({ success: true, data: await services.staff.listInventory(ctx), error: null }));
  router.patch("/api/v1/staff/inventory/[id]/adjust", async (ctx) => ({ success: true, data: await services.staff.adjustInventoryStock(ctx), error: null }));
  router.get("/api/v1/staff/tickets", async (ctx) => ({ success: true, data: await services.staff.listTickets(ctx), error: null }));
  router.post("/api/v1/staff/tickets/[id]/reply", async (ctx) => ({ success: true, data: await services.staff.replyTicket(ctx), error: null }));
  router.patch("/api/v1/staff/tickets/[id]/status", async (ctx) => {
    const status = String(ctx.body.status || "");
    if (!VALID_STAFF_TICKET_STATUSES.includes(status as StaffTicketStatus)) {
      return { success: false, data: null, error: { code: "INVALID_TICKET_STATUS", message: ctx.locale === "ar" ? "حالة التذكرة غير صالحة" : "Invalid ticket status" } };
    }
    return { success: true, data: await services.staff.updateTicketStatus(ctx), error: null };
  });
  router.get("/api/v1/staff/tasks", async (ctx) => ({ success: true, data: await services.staff.listTasks(ctx), error: null }));
  router.patch("/api/v1/staff/tasks/[id]/status", async (ctx) => {
    const status = String(ctx.body.status || "");
    if (!VALID_TASK_STATUSES.includes(status as StaffTaskStatus)) {
      return { success: false, data: null, error: { code: "INVALID_TASK_STATUS", message: ctx.locale === "ar" ? "حالة المهمة غير صالحة" : "Invalid task status" } };
    }
    return { success: true, data: await services.staff.updateTaskStatus(ctx), error: null };
  });

  router.get("/api/v1/customer/stats", async (ctx) => ({ success: true, data: await services.customer.getStats(ctx), error: null }));
  router.get("/api/v1/customer/orders", async (ctx) => ({ success: true, data: await services.customer.listOrders(ctx), error: null }));
  router.get("/api/v1/customer/orders/[id]", async (ctx) => ({ success: true, data: await services.customer.getOrderById(ctx), error: null }));
  router.post("/api/v1/customer/orders/[id]/cancel", async (ctx) => ({ success: true, data: await services.customer.cancelOrder(ctx), error: null }));
  router.get("/api/v1/customer/orders/[id]/invoice", async (ctx) => ({ success: true, data: await services.customer.getOrderInvoice(ctx), error: null }));
  router.get("/api/v1/customer/shipments", async (ctx) => ({ success: true, data: await services.customer.listShipments(ctx), error: null }));
  router.get("/api/v1/customer/shipments/[id]/track", async (ctx) => ({ success: true, data: await services.customer.trackShipment(ctx), error: null }));
  router.get("/api/v1/customer/addresses", async (ctx) => ({ success: true, data: await services.customer.listAddresses(ctx), error: null }));
  router.post("/api/v1/customer/addresses", async (ctx) => ({ success: true, data: await services.customer.createAddress(ctx), error: null }));
  router.patch("/api/v1/customer/addresses/[id]", async (ctx) => ({ success: true, data: await services.customer.updateAddress(ctx), error: null }));
  router.delete("/api/v1/customer/addresses/[id]", async (ctx) => ({ success: true, data: await services.customer.deleteAddress(ctx), error: null }));
  router.get("/api/v1/customer/wishlist", async (ctx) => ({ success: true, data: await services.customer.listWishlist(ctx), error: null }));
  router.post("/api/v1/customer/wishlist", async (ctx) => ({ success: true, data: await services.customer.addWishlist(ctx), error: null }));
  router.delete("/api/v1/customer/wishlist/[productId]", async (ctx) => ({ success: true, data: await services.customer.removeWishlist(ctx), error: null }));
  router.get("/api/v1/customer/wallet", async (ctx) => ({ success: true, data: await services.customer.getWallet(ctx), error: null }));
  router.post("/api/v1/customer/wallet/topup", async (ctx) => ({ success: true, data: await services.customer.topupWallet(ctx), error: null }));
  router.get("/api/v1/customer/reviews", async (ctx) => ({ success: true, data: await services.customer.listReviews(ctx), error: null }));
  router.post("/api/v1/customer/reviews", async (ctx) => ({ success: true, data: await services.customer.createReview(ctx), error: null }));

  router.get("/api/v1/public/site", async (ctx) => ({ success: true, data: await services.publicCatalog.getSiteInfo(ctx), error: null }));
  router.get("/api/v1/public/products", async (ctx) => ({ success: true, data: await services.publicCatalog.listProducts(ctx), error: null }));
  router.get("/api/v1/public/products/[id]", async (ctx) => ({ success: true, data: await services.publicCatalog.getProductById(ctx), error: null }));
  router.get("/api/v1/public/stores", async (ctx) => ({ success: true, data: await services.publicCatalog.listStores(ctx), error: null }));
  router.get("/api/v1/public/posts", async (ctx) => ({ success: true, data: await services.publicCatalog.listPosts(ctx), error: null }));
  router.get("/api/v1/public/posts/[slug]", async (ctx) => ({ success: true, data: await services.publicCatalog.getPostBySlug(ctx), error: null }));
  router.get("/api/v1/public/track/[tracking]", async (ctx) => ({ success: true, data: await services.publicCatalog.trackShipment(ctx), error: null }));
  router.post("/api/v1/public/contact", async (ctx) => ({ success: true, data: await services.publicCatalog.submitContact(ctx), error: null }));

  return router;
}
