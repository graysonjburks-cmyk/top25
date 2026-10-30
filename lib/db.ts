import { readFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { AsyncLocalStorage } from "node:async_hooks";
import { PGlite } from "@electric-sql/pglite";
import { Pool } from "pg";
type DB = { query: (sql: string, params?: any[]) => Promise<{ rows: any[] }> };
const scope = new AsyncLocalStorage<DB>();
const globalDb = globalThis as unknown as { pollDb?: Promise<PGlite | Pool> };
export function db(): Promise<PGlite | Pool> {
  if (process.env.VERCEL && !process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required on Vercel; local database storage is not persistent.");
  }
  return (globalDb.pollDb ??= (async () => {
    const localPath =
      process.env.LOCAL_DB_PATH || join(process.cwd(), ".data/poll");
    if (!process.env.DATABASE_URL)
      await mkdir(dirname(localPath), { recursive: true });
    const database = process.env.DATABASE_URL
      ? new Pool({ connectionString: process.env.DATABASE_URL })
      : new PGlite(localPath);
    for (const file of ["001_initial.sql", "002_expansion.sql"]) {
      const schema = await readFile(
        join(process.cwd(), "migrations", file),
        "utf8",
      );
      if (database instanceof PGlite) await database.exec(schema);
      else await database.query(schema);
    }
    return database;
  })());
}
export async function query(sql: string, params: any[] = []) {
  return (await (scope.getStore() || (await db())).query(sql, params)).rows;
}
export async function transaction<T>(fn: () => Promise<T>): Promise<T> {
  const database = await db();
  if (database instanceof PGlite)
    return database.transaction((tx) => scope.run(tx as DB, fn));
  const client = await database.connect();
  try {
    await client.query("BEGIN");
    const result = await scope.run(client, fn);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
