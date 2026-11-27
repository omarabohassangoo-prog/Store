/**
 * src/api/classes/Validation.ts
 */

import type { Locale, NotificationChannel, UserRole } from "../api";
import { DomainError } from "../middleware";

const ROLES: UserRole[] = ["super_admin", "moderator", "staff", "vendor", "customer"];
const CHANNELS: NotificationChannel[] = ["email", "sms", "whatsapp", "all"];

export class Validation {
  public static requireNonEmpty(value: unknown, code: string, messageAr: string, messageEn: string, locale: Locale): string {
    const str = String(value ?? "").trim();
    if (!str) {
      throw new DomainError(code, locale === "ar" ? messageAr : messageEn);
    }
    return str;
  }

  public static requirePositiveAmount(value: unknown, locale: Locale): number {
    const num = Number(value);
    if (!Number.isFinite(num) || num <= 0) {
      throw new DomainError(
        "INVALID_AMOUNT",
        locale === "ar" ? "المبلغ يجب أن يكون رقماً أكبر من الصفر" : "Amount must be a positive number"
      );
    }
    return num;
  }

  public static requireRole(value: unknown, locale: Locale): UserRole {
    const role = String(value ?? "").trim() as UserRole;
    if (!ROLES.includes(role)) {
      throw new DomainError("INVALID_ROLE", locale === "ar" ? "نوع المستخدم غير صالح" : "Invalid user role");
    }
    return role;
  }

  public static requireChannel(value: unknown, locale: Locale): NotificationChannel {
    const ch = String(value ?? "").trim() as NotificationChannel;
    if (!CHANNELS.includes(ch)) {
      throw new DomainError("INVALID_CHANNEL", locale === "ar" ? "قناة الإشعار غير صالحة" : "Invalid notification channel");
    }
    return ch;
  }

  public static validatePagination(page: number, limit: number, maxLimit: number, locale: Locale): void {
    if (page < 1 || limit < 1 || limit > maxLimit) {
      throw new DomainError(
        "INVALID_PAGINATION",
        locale === "ar" ? `رقم الصفحة أو الحد غير صالح (الحد الأقصى ${maxLimit})` : `Invalid page or limit (max ${maxLimit})`
      );
    }
  }
}
