/**
 * src/api/classes/Actions.ts
 */

import type { Locale, UnifiedHandlerContext } from "../api";
import { AuditManager, BillingReportManager, NotificationManager } from "./Manager";
import { Validation } from "./Validation";

export class DispatchNotificationAction {
  constructor(private readonly notifications: NotificationManager, private readonly audit: AuditManager) {}

  public async execute(ctx: UnifiedHandlerContext) {
    const channel = Validation.requireChannel(ctx.body.channel ?? "all", ctx.locale);
    const bodyText = Validation.requireNonEmpty(
      ctx.body.body ?? ctx.body.message,
      "NOTIFICATION_BODY_REQUIRED",
      "نص الإشعار مطلوب",
      "Notification body is required",
      ctx.locale
    );
    const result = await this.notifications.sendAcrossChannels(
      ctx,
      channel,
      {
        email: ctx.body.email ? String(ctx.body.email).trim() : undefined,
        phone: ctx.body.phone ? String(ctx.body.phone).trim() : undefined,
        whatsapp: ctx.body.whatsapp ? String(ctx.body.whatsapp).trim() : undefined,
      },
      {
        subject: ctx.body.subject ? String(ctx.body.subject).trim() : undefined,
        body: bodyText,
        template_key: ctx.body.template_key ? String(ctx.body.template_key).trim() : undefined,
      }
    );
    await this.audit.record(ctx, "NOTIFICATION_DISPATCHED", "notification", result.id, { channel });
    return result;
  }
}

export class GeneratePrintableReportAction {
  constructor(private readonly reports: BillingReportManager, private readonly audit: AuditManager) {}

  public async execute(ctx: UnifiedHandlerContext, scope: "admin" | "vendor", locale: Locale) {
    const reportType = Validation.requireNonEmpty(
      ctx.body.report_type ?? "summary",
      "REPORT_TYPE_REQUIRED",
      "نوع التقرير مطلوب",
      "Report type is required",
      locale
    );
    const title = String(ctx.body.title || (locale === "ar" ? `تقرير ${reportType}` : `Report ${reportType}`)).trim();
    const format = String(ctx.body.format || "html").trim();
    const sectionsHtml = String(ctx.body.html || `<p>${title}</p>`);
    const report = await this.reports.buildPrintableReport(ctx, scope, title, reportType, format, sectionsHtml);
    await this.audit.record(ctx, "REPORT_GENERATED", "report", report.id, { scope, format });
    return report;
  }
}
