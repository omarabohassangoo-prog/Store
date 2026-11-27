/**
 * src/api/classes/Manager.ts
 */

import type { NotificationChannel, UnifiedHandlerContext } from "../api";
import type { ChannelDispatcherAdapter, DatabaseAdapter } from "../services";
import { Helpers } from "./Helpers";

export class NotificationManager {
  constructor(private readonly db: DatabaseAdapter, private readonly dispatcher: ChannelDispatcherAdapter) {}

  public async sendAcrossChannels(
    ctx: UnifiedHandlerContext,
    channel: NotificationChannel,
    targets: { email?: string; phone?: string; whatsapp?: string },
    payload: { subject?: string; body: string; template_key?: string }
  ): Promise<{ id: string; channel: NotificationChannel; delivery: Record<string, any> }> {
    const delivery: Record<string, any> = {};
    const subject = payload.subject || (ctx.locale === "ar" ? "إشعار النظام" : "System Notification");
    if ((channel === "email" || channel === "all") && targets.email) {
      delivery.email = await this.dispatcher.sendEmail(targets.email, subject, payload.body, payload.template_key);
    }
    if ((channel === "sms" || channel === "all") && targets.phone) {
      delivery.sms = await this.dispatcher.sendSms(targets.phone, payload.body, payload.template_key);
    }
    if ((channel === "whatsapp" || channel === "all") && (targets.whatsapp || targets.phone)) {
      delivery.whatsapp = await this.dispatcher.sendWhatsapp(targets.whatsapp || targets.phone!, payload.body, payload.template_key);
    }
    const record = await this.db.insert(
      "notifications",
      Helpers.attachAuditFields(
        { id: Helpers.uid("ntf"), channel, subject, body: payload.body, template_key: payload.template_key || null, delivery, read: false },
        ctx.user.user_id,
        ctx.user.user_type
      )
    );
    return { id: record.id, channel, delivery };
  }
}

export class BillingReportManager {
  constructor(private readonly db: DatabaseAdapter) {}

  public async buildPrintableReport(
    ctx: UnifiedHandlerContext,
    scope: "admin" | "vendor",
    title: string,
    reportType: string,
    format: string,
    sectionsHtml: string
  ) {
    const id = Helpers.uid(scope === "admin" ? "rpt" : "vrpt");
    const printableHtml = Helpers.buildPrintableHtml(
      title,
      [
        `رقم التقرير: ${id}`,
        `النوع: ${reportType}`,
        `الصيغة: ${format}`,
        `المستخدم: ${ctx.user.user_id || "system"} (${ctx.user.user_type || "unknown"})`,
        `التاريخ: ${Helpers.nowIso()}`,
      ],
      sectionsHtml
    );
    const collection = scope === "admin" ? "reports" : "vendor_reports";
    return await this.db.insert(
      collection,
      Helpers.attachAuditFields(
        { id, title, report_type: reportType, format, printable: true, printable_html: printableHtml },
        ctx.user.user_id,
        ctx.user.user_type
      )
    );
  }

  public async buildPrintableInvoice(orderId: string, ctx: UnifiedHandlerContext, linesHtml: string) {
    const invoiceId = Helpers.uid("inv");
    return {
      invoice_id: invoiceId,
      order_id: orderId,
      user_id: ctx.user.user_id,
      user_type: ctx.user.user_type,
      printable: true,
      printable_html: Helpers.buildPrintableHtml(
        ctx.locale === "ar" ? `فاتورة رقم #${orderId}` : `Invoice #${orderId}`,
        [`رقم الفاتورة: ${invoiceId}`, `رقم الطلب: ${orderId}`, `تاريخ الإصدار: ${Helpers.nowIso()}`],
        linesHtml
      ),
      issued_at: Helpers.nowIso(),
    };
  }
}

export class AuditManager {
  constructor(private readonly db: DatabaseAdapter) {}

  public async record(
    ctx: UnifiedHandlerContext,
    action: string,
    targetType: string,
    targetId: string | null,
    meta: Record<string, unknown> = {}
  ) {
    return await this.db.insert(
      "audit_logs",
      Helpers.attachAuditFields(
        {
          id: Helpers.uid("aud"),
          action,
          target_type: targetType,
          target_id: targetId,
          session_id: ctx.security.session_id,
          fingerprint: ctx.security.fingerprint,
          meta,
        },
        ctx.user.user_id,
        ctx.user.user_type
      )
    );
  }
}
