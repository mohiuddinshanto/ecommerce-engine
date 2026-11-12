import { createHash, randomUUID } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import mysql from "mysql2/promise";

loadEnv();

const migrationsDir = resolve("prisma", "migrations");

function parseDatabaseUrl(rawUrl) {
  if (!rawUrl) throw new Error("DATABASE_URL is not set.");

  const parsed = new URL(rawUrl);
  if (!parsed.protocol.startsWith("mysql")) {
    throw new Error(`Unsupported DATABASE_URL protocol "${parsed.protocol}". Expected mysql://`);
  }

  const database = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
  if (!database) throw new Error("DATABASE_URL is missing the database name.");

  return {
    host: decodeURIComponent(parsed.hostname) || "localhost",
    port: parsed.port ? Number(parsed.port) : 3306,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database,
  };
}

async function ensureMigrationsTable(connection) {
  await connection.query(
    `CREATE TABLE IF NOT EXISTS \`_prisma_migrations\` (
      \`id\` VARCHAR(36) NOT NULL,
      \`checksum\` VARCHAR(64) NOT NULL,
      \`finished_at\` TIMESTAMP(3) NULL,
      \`migration_name\` VARCHAR(255) NOT NULL,
      \`logs\` TEXT NULL,
      \`rolled_back_at\` TIMESTAMP(3) NULL,
      \`started_at\` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`applied_steps_count\` INT UNSIGNED NOT NULL DEFAULT 0,
      INDEX \`_prisma_migrations_finished_at_idx\`(\`finished_at\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );
}

function readMigrations() {
  if (!existsSync(migrationsDir)) {
    throw new Error(`Migrations directory not found: ${migrationsDir}`);
  }

  return readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .map((name) => {
      const file = join(migrationsDir, name, "migration.sql");
      if (!existsSync(file)) throw new Error(`Missing migration.sql in ${name}`);
      const sql = readFileSync(file, "utf8");
      return { name, sql, checksum: createHash("sha256").update(sql).digest("hex") };
    });
}

const REFERENCE_PATTERNS = [
  /ALTER\s+TABLE\s+`?([A-Za-z0-9_]+)`?/gi,
  /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?([A-Za-z0-9_]+)`?/gi,
  /DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?`?([A-Za-z0-9_]+)`?/gi,
  /INSERT\s+INTO\s+`?([A-Za-z0-9_]+)`?/gi,
  /UPDATE\s+`?([A-Za-z0-9_]+)`?\s+SET/gi,
  /REFERENCES\s+`?([A-Za-z0-9_]+)`?\s*\(/gi,
];

const createdTablePattern = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?([A-Za-z0-9_]+)`?/gi;

function referencedTables(sql) {
  const refs = new Set();
  for (const pattern of REFERENCE_PATTERNS) {
    for (const match of sql.matchAll(pattern)) {
      if (match[1] !== "_prisma_migrations") refs.add(match[1]);
    }
  }
  return refs;
}

function verifyTableReferences(migrations, existingTables) {
  const created = new Set();
  for (const migration of migrations) {
    for (const match of migration.sql.matchAll(createdTablePattern)) created.add(match[1]);
  }

  const known = new Set([...existingTables, ...created]);
  const unknown = new Map();

  for (const migration of migrations) {
    for (const table of referencedTables(migration.sql)) {
      if (known.has(table)) continue;
      if (!unknown.has(table)) unknown.set(table, migration.name);
    }
  }

  if (unknown.size > 0) {
    const lines = [...unknown].map(
      ([table, migration]) => `  - \`${table}\` (referenced by ${migration})`,
    );
    throw new Error(
      `table names do not match the schema (MySQL table names are case sensitive on Linux). Unknown tables:\n${lines.join("\n")}\nKnown tables: ${[...existingTables].join(", ")}`,
    );
  }
}

async function main() {
  const target = parseDatabaseUrl(process.env.DATABASE_URL);
  console.log(`[migrate] target ${target.user}@${target.host}:${target.port}/${target.database}`);

  const connection = await mysql.createConnection({
    ...target,
    multipleStatements: true,
    charset: "utf8mb4",
  });

  try {
    await ensureMigrationsTable(connection);

    const migrations = readMigrations();
    const [tableRows] = await connection.query("SHOW TABLES");
    const existingTables = tableRows.map((row) => Object.values(row)[0]);

    verifyTableReferences(migrations, existingTables);
    console.log(`[migrate] verified table references against ${existingTables.length} existing table(s)`);

    const [rows] = await connection.query(
      "SELECT migration_name, checksum, finished_at, rolled_back_at FROM _prisma_migrations",
    );

    const done = new Map();
    const failed = new Set();
    for (const row of rows) {
      if (row.finished_at && !row.rolled_back_at) done.set(row.migration_name, row.checksum);
      else failed.add(row.migration_name);
    }

    for (const name of failed) {
      if (done.has(name)) {
        await connection.query("DELETE FROM _prisma_migrations WHERE migration_name = ? AND finished_at IS NULL", [name]);
        console.log(`[migrate] cleared a stale failed record for ${name} (it has since been applied)`);
      } else {
        console.log(`[migrate] retrying previously failed migration ${name}`);
      }
    }

    const pending = migrations.filter((m) => !done.has(m.name));

    const drifted = migrations.filter((m) => done.has(m.name) && done.get(m.name) !== m.checksum);
    for (const migration of drifted) {
      console.log(`[migrate] WARNING ${migration.name} was applied from a different file revision.`);
      console.log(`[migrate] WARNING keeping the applied schema and only refreshing its recorded checksum.`);
      await connection.query(
        "UPDATE _prisma_migrations SET checksum = ? WHERE migration_name = ? AND finished_at IS NOT NULL",
        [migration.checksum, migration.name],
      );
    }

    console.log(`[migrate] ${migrations.length} migrations found, ${pending.length} pending`);

    for (const migration of pending) {
      await connection.query("DELETE FROM _prisma_migrations WHERE migration_name = ? AND finished_at IS NULL", [migration.name]);

      const recordId = randomUUID();
      await connection.query(
        "INSERT INTO _prisma_migrations (id, checksum, migration_name, started_at, applied_steps_count) VALUES (?, ?, ?, CURRENT_TIMESTAMP(3), 0)",
        [recordId, migration.checksum, migration.name],
      );

      try {
        await connection.query(migration.sql);
      } catch (error) {
        await connection.query("UPDATE _prisma_migrations SET logs = ? WHERE id = ?", [
          String(error.message).slice(0, 2000),
          recordId,
        ]);
        throw new Error(`${migration.name} failed: ${error.message}`);
      }

      await connection.query(
        "UPDATE _prisma_migrations SET finished_at = CURRENT_TIMESTAMP(3), applied_steps_count = 1, logs = NULL WHERE id = ?",
        [recordId],
      );
      console.log(`[migrate] applied ${migration.name}`);
    }

    const [tables] = await connection.query("SHOW TABLES");
    console.log(`[migrate] done -> ${pending.length} applied, database now has ${tables.length} tables`);
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(`[migrate] ${error.message}`);
  process.exit(1);
});