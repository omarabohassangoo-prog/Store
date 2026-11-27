import { check, index, jsonb, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const appRecords = pgTable(
  "app_records",
  {
    collection: text("collection").notNull(),
    id: text("id").notNull(),
    userId: text("user_id"),
    tenantId: text("tenant_id"),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.collection, table.id], name: "app_records_pkey" }),
    check("app_records_collection_check", sql`length(${table.collection}) BETWEEN 1 AND 100`),
    check("app_records_payload_check", sql`jsonb_typeof(${table.payload}) = 'object'`),
    index("app_records_collection_idx").on(table.collection),
    index("app_records_user_idx").on(table.collection, table.userId),
    index("app_records_tenant_idx").on(table.collection, table.tenantId),
    index("app_records_payload_idx").using("gin", table.payload.op("jsonb_path_ops")),
  ]
);
