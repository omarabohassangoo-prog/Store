import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import dotenv from "dotenv";

dotenv.config({ path: ".env.development.local" });

const [{ NeonDatabaseAdapter }, { pool }] = await Promise.all([
  import("../src/api/classes/NeonDatabaseAdapter"),
  import("../src/api/db"),
]);

const adapter = new NeonDatabaseAdapter();
const collection = `smoke_${randomUUID().replaceAll("-", "")}`;
const id = "neon-crud-check";

try {
  const inserted = await adapter.insert(collection, {
    id,
    label: "Neon persistence smoke test",
    enabled: true,
    user_id: "smoke-user-before",
    tenant_id: "smoke-tenant-before",
    metadata: { source: "test", version: 1 },
    deleted_at: null,
  });
  assert.equal(inserted.id, id);

  const selected = await adapter.query(collection, {
    enabled: true,
    user_id: "smoke-user-before",
    tenant_id: "smoke-tenant-before",
    metadata: { source: "test", version: 1 },
  });
  assert.equal(selected.length, 1);
  assert.equal(selected[0].label, "Neon persistence smoke test");

  const updated = await adapter.update(collection, id, {
    label: "Updated through Neon",
    revision: 2,
    user_id: "smoke-user-after",
    tenant_id: "smoke-tenant-after",
  });
  assert.equal(updated?.label, "Updated through Neon");
  assert.equal((await adapter.query(collection, {
    revision: 2,
    user_id: "smoke-user-after",
    tenant_id: "smoke-tenant-after",
  })).length, 1);

  assert.equal(await adapter.softDelete(collection, id), true);
  assert.equal((await adapter.query(collection)).length, 0);

  console.log("Neon CRUD persistence flow passed: insert, filtered read, update, and soft delete.");
} finally {
  await pool.query("DELETE FROM public.app_records WHERE collection = $1 AND id = $2", [collection, id]);
  await pool.end();
}
