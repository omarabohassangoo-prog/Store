/**
 * src/api/classes/Init.ts
 */

import { createUnifiedApiRouter, type AllSystemServices, type UnifiedJsonRouter } from "../api";
import { createMemoryIdempotencyStore, type IdempotencyStore, type SessionResolver, wrapWithMiddleware } from "../middleware";
import { createSystemServices, type ChannelDispatcherAdapter, type DatabaseAdapter } from "../services";
import { Config } from "./Config";
import { AuditManager, BillingReportManager, NotificationManager } from "./Manager";
import { DbSessionResolver } from "./Adapters";

export interface InitializedSystem {
  router: UnifiedJsonRouter;
  services: AllSystemServices;
  managers: { notifications: NotificationManager; billingReports: BillingReportManager; audit: AuditManager };
  idempotencyStore: IdempotencyStore;
  sessionResolver: SessionResolver;
}

export class Init {
  public static bootstrap(deps: {
    db: DatabaseAdapter;
    channels: ChannelDispatcherAdapter;
    idempotencyStore?: IdempotencyStore;
    sessionResolver?: SessionResolver;
  }): InitializedSystem {
    Config.validate();
    const idempotencyStore = deps.idempotencyStore || createMemoryIdempotencyStore();
    const sessionResolver = deps.sessionResolver || new DbSessionResolver(deps.db);
    const notifications = new NotificationManager(deps.db, deps.channels);
    const billingReports = new BillingReportManager(deps.db);
    const audit = new AuditManager(deps.db);
    const services = createSystemServices(deps.db, deps.channels);
    const router = createUnifiedApiRouter(services);

    const sensitivePostRoutes = new Set([
      "/api/v1/notifications/send",
      "/api/v1/admin/notifications/dispatch",
      "/api/v1/admin/reports",
      "/api/v1/vendor/reports",
      "/api/v1/vendor/payouts/request",
      "/api/v1/customer/wallet/topup",
    ]);

    const publicRoutes = new Set([
      "/api/v1/auth/login",
      "/api/v1/auth/register",
      "/api/v1/auth/bootstrap-status",
      "/api/v1/auth/bootstrap-admin",
      "/api/v1/auth/otp/send",
      "/api/v1/auth/2fa/verify",
      "/api/v1/auth/refresh",
      "/api/v1/health/ready",
      "/api/v1/public/site",
      "/api/v1/public/products",
      "/api/v1/public/products/[id]",
      "/api/v1/public/stores",
      "/api/v1/public/posts",
      "/api/v1/public/posts/[slug]",
      "/api/v1/public/track/[tracking]",
      "/api/v1/public/contact",
    ]);

    const internal = router as unknown as { routes: Array<{ method: string; pattern: string; handler: any }> };

    for (const route of internal.routes) {
      const isPublic = publicRoutes.has(route.pattern);
      const requireSession = !isPublic;
      const useIdempotency = route.method === "POST" && sensitivePostRoutes.has(route.pattern);

      route.handler = wrapWithMiddleware(route.handler, {
        requireSession,
        sessionResolver: requireSession ? sessionResolver : undefined,
        ...(useIdempotency ? { idempotencyKeyHeader: "x-idempotency-key", idempotencyStore } : {}),
      });
    }

    return { router, services, managers: { notifications, billingReports, audit }, idempotencyStore, sessionResolver };
  }
}
