/**
 * src/api/classes/ExtraActions.ts
 */

import type { UnifiedHandlerContext } from "../api";
import { AuditManager } from "./Manager";
import { OrderFulfillmentManager, RolePermissionManager } from "./ExtraManagers";
import { Validation } from "./Validation";

export class LoginAction {
  constructor(private readonly roles: RolePermissionManager, private readonly audit: AuditManager) {}

  public async execute(ctx: UnifiedHandlerContext, loginFn: () => Promise<any>) {
    const email = Validation.requireNonEmpty(ctx.body.email, "EMAIL_REQUIRED", "البريد الإلكتروني مطلوب", "Email is required", ctx.locale);
    Validation.requireNonEmpty(ctx.body.password, "PASSWORD_REQUIRED", "كلمة المرور مطلوبة", "Password is required", ctx.locale);
    const rawResult = await loginFn();
    const role = Validation.requireRole(rawResult?.user_type || rawResult?.user?.user_type || "customer", ctx.locale);
    const policy = await this.roles.resolvePolicy(role, ctx.locale);
    await this.audit.record(ctx, "USER_LOGIN", "user", rawResult?.user_id || email, {
      user_type: role,
      session_id: ctx.security.session_id,
      fingerprint: ctx.security.fingerprint,
    });
    return { ...rawResult, user_type: role, redirect_url: rawResult?.redirect_url || policy.redirect_url };
  }
}

export class RequestPayoutAction {
  constructor(private readonly fulfillment: OrderFulfillmentManager, private readonly audit: AuditManager) {}

  public async execute(ctx: UnifiedHandlerContext) {
    const amount = Validation.requirePositiveAmount(ctx.body.amount, ctx.locale);
    const currency = String(ctx.body.currency || "SAR").trim();
    const payout = await this.fulfillment.requestVendorPayout(ctx, amount, currency);
    await this.audit.record(ctx, "PAYOUT_REQUESTED", "payout", payout.id, { amount, currency });
    return payout;
  }
}

export class TopupWalletAction {
  constructor(private readonly fulfillment: OrderFulfillmentManager, private readonly audit: AuditManager) {}

  public async execute(ctx: UnifiedHandlerContext) {
    const amount = Validation.requirePositiveAmount(ctx.body.amount, ctx.locale);
    const currency = String(ctx.body.currency || "SAR").trim();
    const result = await this.fulfillment.topupCustomerWallet(ctx, amount, currency);
    await this.audit.record(ctx, "WALLET_TOPUP", "wallet", result.transaction.id, { amount, currency });
    return result;
  }
}
