import { and, eq, sql } from "drizzle-orm";
import { appRecords } from "../db/schema";
import { db, pool } from "../db";
import type { DatabaseAdapter } from "../services";
import { Helpers } from "./Helpers";

const INITIALIZATION_LOCK_ID = 20_261_128;

export class NeonDatabaseAdapter implements DatabaseAdapter {
  public async withInitializationLock<T>(initialize: () => Promise<T>): Promise<T> {
    const client = await pool.connect();
    try {
      await client.query("SELECT pg_advisory_lock($1)", [INITIALIZATION_LOCK_ID]);
      return await initialize();
    } finally {
      try {
        await client.query("SELECT pg_advisory_unlock($1)", [INITIALIZATION_LOCK_ID]);
      } finally {
        client.release();
      }
    }
  }

  public async isEmpty(): Promise<boolean> {
    const [row] = await db.select({ id: appRecords.id }).from(appRecords).limit(1);
    return !row;
  }

  public async query<T = any>(collection: string, filter?: Record<string, any>): Promise<T[]> {
    const conditions = [
      eq(appRecords.collection, collection),
      sql`COALESCE(${appRecords.payload}->>'deleted_at', '') = ''`,
    ];
    const safeFilter = Object.fromEntries(
      Object.entries(filter || {}).filter(([, value]) => value !== undefined)
    );
    if (Object.keys(safeFilter).length > 0) {
      conditions.push(sql`${appRecords.payload} @> ${JSON.stringify(safeFilter)}::jsonb` as typeof conditions[number]);
    }
    if (safeFilter.user_id != null) {
      conditions.push(eq(appRecords.userId, String(safeFilter.user_id)));
    }
    if (safeFilter.tenant_id != null) {
      conditions.push(eq(appRecords.tenantId, String(safeFilter.tenant_id)));
    }

    const rows = await db
      .select({ payload: appRecords.payload })
      .from(appRecords)
      .where(and(...conditions));
    return rows.map(({ payload }) => payload as T);
  }

  public async insert<T extends Record<string, any>>(collection: string, record: T): Promise<T> {
    const id = String(record.id || Helpers.uid(collection.slice(0, 3)));
    const item = { ...record, id };
    await db.insert(appRecords).values({
      collection,
      id,
      userId: item.user_id == null ? null : String(item.user_id),
      tenantId: item.tenant_id == null ? null : String(item.tenant_id),
      payload: item,
    });
    return item as T;
  }

  public async update<T extends Record<string, any>>(
    collection: string,
    id: string,
    patch: Partial<T>
  ): Promise<T | null> {
    const updatedAt = Helpers.nowIso();
    const [row] = await db
      .update(appRecords)
      .set({
        payload: sql`${appRecords.payload} || ${JSON.stringify({ ...patch, updated_at: updatedAt })}::jsonb`,
        updatedAt: new Date(updatedAt),
        ...(patch.user_id !== undefined
          ? { userId: patch.user_id == null ? null : String(patch.user_id) }
          : {}),
        ...(patch.tenant_id !== undefined
          ? { tenantId: patch.tenant_id == null ? null : String(patch.tenant_id) }
          : {}),
      })
      .where(and(
        eq(appRecords.collection, collection),
        eq(appRecords.id, String(id)),
        sql`COALESCE(${appRecords.payload}->>'deleted_at', '') = ''`
      ))
      .returning({ payload: appRecords.payload });
    return row ? row.payload as T : null;
  }

  public async softDelete(collection: string, id: string): Promise<boolean> {
    const deletedAt = Helpers.nowIso();
    const [row] = await db
      .update(appRecords)
      .set({
        payload: sql`${appRecords.payload} || ${JSON.stringify({ deleted_at: deletedAt, updated_at: deletedAt })}::jsonb`,
        updatedAt: new Date(deletedAt),
      })
      .where(and(eq(appRecords.collection, collection), eq(appRecords.id, String(id))))
      .returning({ id: appRecords.id });
    return Boolean(row);
  }

  public async close(): Promise<void> {
    await pool.end();
  }
}
