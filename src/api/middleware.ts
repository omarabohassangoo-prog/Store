/**
 * src/api/middleware.ts
 * طبقة الوسائط (RBAC, Session/Fingerprint, Idempotency, DomainError, Pagination)
 */

import type {
  JsonApiResponse,
  UnifiedHandlerContext,
  UnifiedJsonHandler,
  UserRole,
} from "./api";

export class DomainError extends Error {
  public readonly code: string;
  public readonly details?: Array<{ field?: string; reason?: string }>;

  constructor(code: string, message: string, details?: Array<{ field?: string; reason?: string }>) {
    super(message);
    this.name = "DomainError";
    this.code = code;
    this.details = details;
  }
}

export interface IdempotencyStore {
  get: (key: string) => Promise<any | null>;
  set: (key: string, value: any, ttlSeconds?: number) => Promise<void>;
}

export function createMemoryIdempotencyStore(): IdempotencyStore {
  const cache = new Map<string, { value: any; expiresAt: number }>();
  return {
    async get(key: string) {
      const entry = cache.get(key);
      if (!entry) return null;
      if (Date.now() > entry.expiresAt) {
        cache.delete(key);
        return null;
      }
      return entry.value;
    },
    async set(key: string, value: any, ttlSeconds = 3600) {
      cache.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
    },
  };
}

export interface SessionResolver {
  resolve: (input: {
    sessionId: string | null;
    fingerprint: string | null;
    tenantId: string | null;
  }) => Promise<{
    user_id: string;
    user_type: UserRole;
    tenant_id: string | null;
  } | null>;
}

export function paginateItems<T extends Record<string, any>>(
  allItems: T[],
  ctx: UnifiedHandlerContext,
  searchableFields: string[] = []
): { items: T[]; total: number } {
  let rows = [...allItems];
  for (const [field, val] of Object.entries(ctx.list.filters)) {
    rows = rows.filter((row) => String(row[field] ?? "").toLowerCase() === val.toLowerCase());
  }
  if (ctx.list.search) {
    const q = ctx.list.search.toLowerCase();
    const fields =
      ctx.list.lookup_field && searchableFields.includes(ctx.list.lookup_field)
        ? [ctx.list.lookup_field]
        : searchableFields.length > 0
          ? searchableFields
          : Object.keys(rows[0] || {});
    rows = rows.filter((row) =>
      fields.some((f) => String(row[f] ?? "").toLowerCase().includes(q))
    );
  }
  if (ctx.list.sort_by) {
    const sortKey = ctx.list.sort_by;
    const dir = ctx.list.sort_dir === "asc" ? 1 : -1;
    rows.sort((a, b) => {
      const av = String(a[sortKey] ?? "");
      const bv = String(b[sortKey] ?? "");
      return av.localeCompare(bv) * dir;
    });
  }
  const total = rows.length;
  const start = (ctx.list.page - 1) * ctx.list.limit;
  const items = rows.slice(start, start + ctx.list.limit);
  return { items, total };
}

export function resolveRequiredRoleFromPath(path: string): UserRole | null {
  if (path.startsWith("/api/v1/admin/")) return "super_admin";
  if (path.startsWith("/api/v1/vendor/")) return "vendor";
  if (path.startsWith("/api/v1/moderator/")) return "moderator";
  if (path.startsWith("/api/v1/staff/")) return "staff";
  if (path.startsWith("/api/v1/customer/")) return "customer";
  return null;
}

export function verifySecurityContext(ctx: UnifiedHandlerContext, requireSession = true): void {
  const hasSession = Boolean(ctx.security.session_id || ctx.security.cookies["sid"] || ctx.security.cookies["session_id"]);
  const hasFingerprint = Boolean(ctx.security.fingerprint || ctx.security.cookies["fp"] || ctx.security.cookies["fingerprint"]);
  if (requireSession && !hasSession) {
    throw new DomainError(
      "UNAUTHORIZED_SESSION",
      ctx.locale === "ar" ? "الجلسة غير صالحة أو مفقودة" : "Missing or invalid session"
    );
  }
  if (requireSession && !hasFingerprint && ctx.path.startsWith("/api/v1/admin/")) {
    throw new DomainError(
      "FINGERPRINT_REQUIRED",
      ctx.locale === "ar" ? "بصمة الجهاز/المتصفح مطلوبة للعمليات الإدارية" : "Device fingerprint required for admin routes"
    );
  }
}

export function enforceRoleAccess(ctx: UnifiedHandlerContext, allowedRoles?: UserRole[]): void {
  const required = allowedRoles && allowedRoles.length > 0 ? allowedRoles : null;
  const pathRole = resolveRequiredRoleFromPath(ctx.path);
  const effectiveAllowed = required ?? (pathRole ? [pathRole, "super_admin"] : null);
  if (!effectiveAllowed) return;
  const currentRole = ctx.user.user_type;
  if (!currentRole || !effectiveAllowed.includes(currentRole)) {
    throw new DomainError(
      "FORBIDDEN_ROLE",
      ctx.locale === "ar"
        ? "لا تملك الصلاحية اللازمة للوصول إلى هذا المورد"
        : "Insufficient role permissions for this resource"
    );
  }
}

export function wrapWithMiddleware<T = unknown>(
  handler: UnifiedJsonHandler<T>,
  options: {
    requireSession?: boolean;
    allowedRoles?: UserRole[];
    idempotencyKeyHeader?: string;
    idempotencyStore?: IdempotencyStore;
    sessionResolver?: SessionResolver;
  } = {}
): UnifiedJsonHandler<T> {
  return async (ctx: UnifiedHandlerContext): Promise<Omit<JsonApiResponse<T>, "meta">> => {
    try {
      verifySecurityContext(ctx, options.requireSession ?? false);
      if (options.sessionResolver) {
        ctx.user = { ...ctx.user, user_id: null, user_type: null };
        ctx.actorId = null;
        const resolved = await options.sessionResolver.resolve({
          sessionId: ctx.security.session_id || ctx.security.cookies["sid"] || ctx.security.cookies["session_id"] || null,
          fingerprint: ctx.security.fingerprint || ctx.security.cookies["fp"] || ctx.security.cookies["fingerprint"] || null,
          tenantId: ctx.tenantId,
        });
        if (options.requireSession && !resolved) {
          throw new DomainError(
            "UNAUTHORIZED_SESSION",
            ctx.locale === "ar" ? "الجلسة غير صالحة" : "Invalid session"
          );
        }
        if (resolved) {
          ctx.user = {
            ...ctx.user,
            user_id: resolved.user_id,
            user_type: resolved.user_type,
          };
          ctx.actorId = resolved.user_id;
          if (resolved.tenant_id) ctx.tenantId = resolved.tenant_id;
        }
      }
      enforceRoleAccess(ctx, options.allowedRoles);
      const headerName = options.idempotencyKeyHeader?.toLowerCase();
      const idemKey = headerName ? ctx.security.idempotency_key : null;
      if (idemKey && options.idempotencyStore) {
        const cached = await options.idempotencyStore.get(
          `idem:${ctx.method}:${ctx.path}:${idemKey}`
        );
        if (cached) {
          return { success: true, data: cached as T, error: null };
        }
      }
      const result = await handler(ctx);
      if (result.success && idemKey && options.idempotencyStore && result.data !== undefined) {
        await options.idempotencyStore.set(`idem:${ctx.method}:${ctx.path}:${idemKey}`, result.data);
      }
      return result;
    } catch (err) {
      if (err instanceof DomainError) {
        return {
          success: false,
          data: null,
          error: {
            code: err.code,
            message: err.message,
            ...(err.details ? { details: err.details } : {}),
          },
        };
      }
      throw err;
    }
  };
}
