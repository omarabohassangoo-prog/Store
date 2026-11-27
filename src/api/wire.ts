/**
 * src/api/wire.ts
 * غلاف مبسط حول Init — يحافظ على التوافق مع الاستخدام القديم.
 */

import { Init, type InitializedSystem } from "./classes/Init";
import type { AllSystemServices, UnifiedJsonRouter } from "./api";
import type { ChannelDispatcherAdapter, DatabaseAdapter } from "./services";

export function buildSecuredUnifiedRouter(
  _services: AllSystemServices,
  deps: { db: DatabaseAdapter; channels: ChannelDispatcherAdapter }
): UnifiedJsonRouter {
  const system = Init.bootstrap(deps);
  return system.router;
}

export type { InitializedSystem };
