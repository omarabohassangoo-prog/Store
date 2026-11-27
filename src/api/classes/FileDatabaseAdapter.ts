import fs from "node:fs";
import path from "node:path";
import type { DatabaseAdapter } from "../services";
import { Helpers } from "./Helpers";

export class FileDatabaseAdapter implements DatabaseAdapter {
  private readonly filePath: string;
  private readonly store = new Map<string, Array<Record<string, any>>>();
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(filePath = path.resolve(process.cwd(), "data", "souqalkul-db.json")) {
    this.filePath = filePath;
    this.loadFromDisk();
  }

  private loadFromDisk(): void {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      if (!fs.existsSync(this.filePath)) return;
      const raw = fs.readFileSync(this.filePath, "utf8");
      if (!raw.trim()) return;
      const parsed = JSON.parse(raw) as Record<string, Array<Record<string, any>>>;
      if (parsed && typeof parsed === "object") {
        for (const [collection, rows] of Object.entries(parsed)) {
          if (Array.isArray(rows)) this.store.set(collection, rows);
        }
      }
    } catch (err) {
      console.error("Failed to load database file:", err);
    }
  }

  private persistToDisk(): Promise<void> {
    // Recover the queue tail after a failed write so one I/O error does not
    // permanently reject every later write. The operation itself still rejects
    // and is reported to its caller.
    const write = this.writeQueue.catch(() => undefined).then(async () => {
      const dir = path.dirname(this.filePath);
      await fs.promises.mkdir(dir, { recursive: true });
      const snapshot: Record<string, Array<Record<string, any>>> = {};
      for (const [key, rows] of this.store.entries()) snapshot[key] = rows;
      const tmpPath = `${this.filePath}.${process.pid}.${Date.now()}.tmp`;
      try {
        await fs.promises.writeFile(tmpPath, JSON.stringify(snapshot, null, 2), "utf8");
        await fs.promises.rename(tmpPath, this.filePath);
      } catch (error) {
        await fs.promises.rm(tmpPath, { force: true }).catch(() => undefined);
        throw error;
      }
    });
    this.writeQueue = write;
    return write;
  }

  private bucket(collection: string): Array<Record<string, any>> {
    if (!this.store.has(collection)) this.store.set(collection, []);
    return this.store.get(collection)!;
  }

  public async query<T = any>(collection: string, filter?: Record<string, any>): Promise<T[]> {
    const rows = this.bucket(collection).filter((row) => !row.deleted_at);
    if (!filter || Object.keys(filter).length === 0) return rows as T[];
    return rows.filter((row) =>
      Object.entries(filter).every(([key, value]) => value === undefined || row[key] === value)
    ) as T[];
  }

  public async insert<T extends Record<string, any>>(collection: string, record: T): Promise<T> {
    const list = this.bucket(collection);
    const item = { ...record, id: record.id || Helpers.uid(collection.slice(0, 3)) };
    list.push(item);
    await this.persistToDisk();
    return item as T;
  }

  public async update<T extends Record<string, any>>(collection: string, id: string, patch: Partial<T>): Promise<T | null> {
    const list = this.bucket(collection);
    const idx = list.findIndex((row) => String(row.id) === String(id) && !row.deleted_at);
    if (idx < 0) return null;
    list[idx] = { ...list[idx], ...patch, updated_at: Helpers.nowIso() };
    await this.persistToDisk();
    return list[idx] as T;
  }

  public async softDelete(collection: string, id: string): Promise<boolean> {
    const list = this.bucket(collection);
    const idx = list.findIndex((row) => String(row.id) === String(id));
    if (idx < 0) return false;
    list[idx] = { ...list[idx], deleted_at: Helpers.nowIso(), updated_at: Helpers.nowIso() };
    await this.persistToDisk();
    return true;
  }
}
