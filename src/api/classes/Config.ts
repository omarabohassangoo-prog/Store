/**
 * src/api/classes/Config.ts
 */

import type { Locale, SystemMode, ThemeMode, UserRole } from "../api";

export interface SystemConfigShape {
  appName: string;
  defaultLocale: Locale;
  defaultTheme: ThemeMode;
  defaultCurrency: string;
  systemMode: SystemMode;
  pagination: { defaultPage: number; defaultLimit: number; maxLimit: number };
  security: {
    sessionCookieNames: string[];
    fingerprintCookieNames: string[];
    requireFingerprintOnAdmin: boolean;
    idempotencyTtlSeconds: number;
  };
  roles: UserRole[];
  channels: { defaultEmailFrom: string; defaultSmsSender: string; defaultWhatsappSender: string };
}

export class Config {
  private static instance: SystemConfigShape = {
    appName: "سوق الكل",
    defaultLocale: "ar",
    defaultTheme: "light",
    defaultCurrency: "SAR",
    systemMode: "ready",
    pagination: { defaultPage: 1, defaultLimit: 20, maxLimit: 200 },
    security: {
      sessionCookieNames: ["sid", "session_id"],
      fingerprintCookieNames: ["fp", "fingerprint"],
      requireFingerprintOnAdmin: true,
      idempotencyTtlSeconds: 3600,
    },
    roles: ["super_admin", "moderator", "staff", "vendor", "customer"],
    channels: {
      defaultEmailFrom: "noreply@souqalkul.local",
      defaultSmsSender: "SouqAlKul",
      defaultWhatsappSender: "SouqAlKul",
    },
  };

  public static get(): SystemConfigShape {
    return this.instance;
  }

  public static override(partial: Partial<SystemConfigShape>): SystemConfigShape {
    this.instance = {
      ...this.instance,
      ...partial,
      pagination: { ...this.instance.pagination, ...(partial.pagination || {}) },
      security: { ...this.instance.security, ...(partial.security || {}) },
      channels: { ...this.instance.channels, ...(partial.channels || {}) },
    };
    return this.instance;
  }

  public static validate(): void {
    const cfg = this.instance;
    if (!["ar", "en"].includes(cfg.defaultLocale)) {
      throw new Error(`Invalid defaultLocale: ${cfg.defaultLocale}`);
    }
    if (!["light", "dark", "brand"].includes(cfg.defaultTheme)) {
      throw new Error(`Invalid defaultTheme: ${cfg.defaultTheme}`);
    }
    if (!["ready", "maintenance", "development"].includes(cfg.systemMode)) {
      throw new Error(`Invalid systemMode: ${cfg.systemMode}`);
    }
    if (cfg.pagination.maxLimit < cfg.pagination.defaultLimit) {
      throw new Error("maxLimit must be >= defaultLimit");
    }
  }
}
