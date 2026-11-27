/**
 * src/api/classes/ExtraManagers.ts
 */

import type { Locale, UnifiedHandlerContext, UserRole } from "../api";
import type { DatabaseAdapter } from "../services";
import { DomainError } from "../middleware";
import { Helpers } from "./Helpers";

export interface RolePolicy {
  role_key: UserRole;
  redirect_url: string;
  permissions: string[];
  active: boolean;
}

const DEFAULT_ROLE_POLICIES: Record<UserRole, RolePolicy> = {
  super_admin: { role_key: "super_admin", redirect_url: "/ar/dashboard/admin", permissions: ["*"], active: true },
  moderator:   { role_key: "moderator",   redirect_url: "/ar/dashboard/moderator", permissions: ["moderate:*"], active: true },
  staff:       { role_key: "staff",       redirect_url: "/ar/dashboard/staff", permissions: ["fulfill:*"], active: true },
  vendor:      { role_key: "vendor",      redirect_url: "/ar/dashboard/vendor", permissions: ["store:*"], active: true },
  customer:    { role_key: "customer",    redirect_url: "/ar/dashboard/customer", permissions: ["self:*"], active: true },
};

export class RolePermissionManager {
  constructor(private readonly db: DatabaseAdapter) {}

  public async resolvePolicy(role: UserRole, locale: Locale): Promise<RolePolicy> {
    const rows = await this.db.query<any>("roles_config", { role_key: role });
    const stored = rows[0];
    const base = DEFAULT_ROLE_POLICIES[role];
    if (!base) {
      throw new DomainError("UNKNOWN_ROLE", locale === "ar" ? "الدور غير معروف" : "Unknown role");
    }
    return { ...base, ...(stored && typeof stored === "object" ? stored : {}) };
  }
}

export class OrderFulfillmentManager {
  constructor(private readonly db: DatabaseAdapter) {}

  public async requestVendorPayout(ctx: UnifiedHandlerContext, amount: number, currency: string) {
    return await this.db.insert(
      "payouts",
      Helpers.attachAuditFields(
        { id: Helpers.uid("pay"), vendor_id: ctx.user.user_id, amount, currency, status: "pending" },
        ctx.user.user_id,
        ctx.user.user_type
      )
    );
  }

  public async topupCustomerWallet(ctx: UnifiedHandlerContext, amount: number, currency: string) {
    const tx = await this.db.insert(
      "wallet_transactions",
      Helpers.attachAuditFields(
        { id: Helpers.uid("wtx"), user_id: ctx.user.user_id, amount, currency, type: "topup" },
        ctx.user.user_id,
        ctx.user.user_type
      )
    );
    return { transaction: tx, amount, currency };
  }
}
