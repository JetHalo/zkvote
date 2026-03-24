import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL_REQUIRED");
  }

  const schemaPath = resolve(__dirname, "../db/schema.sql");
  const schemaSql = await readFile(schemaPath, "utf8");

  const pool = new pg.Pool({
    connectionString: databaseUrl
  });

  try {
    await pool.query(schemaSql);
    console.log("Database schema applied.");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
