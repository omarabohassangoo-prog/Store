/**
 * src/api/classes/Helpers.ts
 */

import type { UserRole } from "../api";

export class Helpers {
  public static nowIso(): string {
    return new Date().toISOString();
  }

  public static uid(prefix: string): string {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  }

  public static maskSecret(value: unknown, visibleChars = 4): string {
    const str = String(value ?? "");
    if (!str) return "";
    if (str.length <= visibleChars) return "*".repeat(str.length);
    return `${"*".repeat(str.length - visibleChars)}${str.slice(-visibleChars)}`;
  }

  public static attachAuditFields<T extends Record<string, any>>(
    record: T,
    userId: string | null,
    userType: UserRole | null,
    isNew = true
  ): T & {
    user_id: string | null;
    user_type: UserRole | null;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
  } {
    const ts = this.nowIso();
    return {
      ...record,
      user_id: record.user_id ?? userId,
      user_type: record.user_type ?? userType,
      created_at: isNew ? record.created_at ?? ts : record.created_at ?? ts,
      updated_at: ts,
      deleted_at: record.deleted_at ?? null,
    };
  }

  public static escapeHtml(value: unknown): string {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  public static buildPrintableHtml(title: string, metaLines: string[], bodyHtml: string): string {
    const safeTitle = this.escapeHtml(title);
    const metaItems = metaLines.map((line) => `<li>${this.escapeHtml(line)}</li>`).join("");
    return [
      `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>${safeTitle}</title>`,
      `<style>body{font-family:sans-serif;padding:24px;color:#111}h1{margin:0 0 12px}ul{list-style:none;padding:0;margin:0 0 16px;color:#555}</style>`,
      `</head><body><h1>${safeTitle}</h1><ul>${metaItems}</ul><hr/><div>${bodyHtml}</div></body></html>`,
    ].join("");
  }
}
