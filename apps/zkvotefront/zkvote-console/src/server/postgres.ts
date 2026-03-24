import { Pool, type PoolClient } from "pg";
import { getServerEnv } from "@/server/env";

declare global {
  // eslint-disable-next-line no-var
  var __zkvoteConsolePgPool__: Pool | undefined;
}

export function getPostgresPool(): Pool {
  const env = getServerEnv();
  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL_REQUIRED");
  }

  if (!global.__zkvoteConsolePgPool__) {
    global.__zkvoteConsolePgPool__ = new Pool({
      connectionString: env.DATABASE_URL
    });
  }

  return global.__zkvoteConsolePgPool__;
}

export async function withPostgresTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPostgresPool().connect();

  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
