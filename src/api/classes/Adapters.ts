/**
 * src/api/classes/Adapters.ts
 */

import type { ChannelDispatcherAdapter, DatabaseAdapter } from "../services";
import type { SessionResolver } from "../middleware";
import { Helpers } from "./Helpers";

export class MemoryDatabaseAdapter implements DatabaseAdapter {
  private readonly store = new Map<string, Array<Record<string, any>>>();

  private bucket(collection: string): Array<Record<string, any>> {
    if (!this.store.has(collection)) this.store.set(collection, []);
    return this.store.get(collection)!;
  }

  public async query<T = any>(collection: string, filter?: Record<string, any>): Promise<T[]> {
    const rows = this.bucket(collection).filter((r) => !r.deleted_at);
    if (!filter || Object.keys(filter).length === 0) return rows as T[];
    return rows.filter((row) =>
      Object.entries(filter).every(([k, v]) => v === undefined || row[k] === v)
    ) as T[];
  }

  public async insert<T extends Record<string, any>>(collection: string, record: T): Promise<T> {
    const list = this.bucket(collection);
    const id = record.id || Helpers.uid(collection.slice(0, 3));
    const item = { ...record, id };
    list.push(item);
    return item as T;
  }

  public async update<T extends Record<string, any>>(collection: string, id: string, patch: Partial<T>): Promise<T | null> {
    const list = this.bucket(collection);
    const idx = list.findIndex((r) => String(r.id) === String(id) && !r.deleted_at);
    if (idx < 0) return null;
    list[idx] = { ...list[idx], ...patch, updated_at: Helpers.nowIso() };
    return list[idx] as T;
  }

  public async softDelete(collection: string, id: string): Promise<boolean> {
    const list = this.bucket(collection);
    const idx = list.findIndex((r) => String(r.id) === String(id));
    if (idx < 0) return false;
    list[idx] = { ...list[idx], deleted_at: Helpers.nowIso(), updated_at: Helpers.nowIso() };
    return true;
  }
}

export interface HttpChannelEndpoints {
  emailUrl?: string;
  smsUrl?: string;
  whatsappUrl?: string;
  bearerToken?: string;
}

export class HttpChannelDispatcherAdapter implements ChannelDispatcherAdapter {
  constructor(private readonly endpoints: HttpChannelEndpoints = {}) {}

  private async postJson(url: string | undefined, payload: Record<string, unknown>, prefix: string) {
    if (!url) return { message_id: Helpers.uid(prefix) };
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (this.endpoints.bearerToken) headers["Authorization"] = `Bearer ${this.endpoints.bearerToken}`;
    const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(payload) });
    const json = await res.json().catch(() => ({}));
    return { message_id: String(json?.message_id || json?.id || Helpers.uid(prefix)) };
  }

  public async sendEmail(to: string, subject: string, htmlOrText: string, templateKey?: string) {
    return await this.postJson(this.endpoints.emailUrl, { to, subject, body: htmlOrText, template_key: templateKey || null }, "eml");
  }

  public async sendSms(to: string, text: string, templateKey?: string) {
    return await this.postJson(this.endpoints.smsUrl, { to, message: text, template_key: templateKey || null }, "sms");
  }

  public async sendWhatsapp(to: string, textOrTemplate: string, templateName?: string) {
    return await this.postJson(this.endpoints.whatsappUrl, { to, text: textOrTemplate, template_name: templateName || null }, "wa");
  }
}

export class DbSessionResolver implements SessionResolver {
  constructor(private readonly db: DatabaseAdapter) {}

  public async resolve(input: { sessionId: string | null; fingerprint: string | null; tenantId: string | null; }) {
    if (!input.sessionId) return null;
    const rows = await this.db.query<any>("sessions", { session_id: input.sessionId });
    const session = rows[0];
    if (!session || session.deleted_at) return null;
    if (session.expires_at && new Date(session.expires_at).getTime() < Date.now()) return null;
    if (session.fingerprint && input.fingerprint && session.fingerprint !== input.fingerprint) return null;
    if (session.tenant_id && input.tenantId && session.tenant_id !== input.tenantId) return null;
    const users = await this.db.query<any>("users", { id: session.user_id });
    const user = users[0];
    if (!user || user.deleted_at || user.status === "suspended") return null;
    return { user_id: user.id, user_type: user.user_type, tenant_id: session.tenant_id || null };
  }
}
