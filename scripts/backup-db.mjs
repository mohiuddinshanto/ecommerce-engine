import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { config as loadEnv } from "dotenv";

loadEnv();

function parseDatabaseUrl(rawUrl) {
  if (!rawUrl) throw new Error("DATABASE_URL is not set.");
  const parsed = new URL(rawUrl);
  if (!parsed.protocol.startsWith("mysql")) throw new Error(`Unsupported DATABASE_URL protocol "${parsed.protocol}".`);
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

const target = parseDatabaseUrl(process.env.DATABASE_URL);
const outDir = resolve(process.env.BACKUP_DIR || "backups");
mkdirSync(outDir, { recursive: true });

const stamp = new Date().toISOString().slice(0, 19).replace("T", "_").replace(/:/g, "-");
const file = join(outDir, `store-${stamp}.sql`);

const candidates = [
  process.env.MYSQLDUMP_PATH,
  "mysqldump",
  "C:\\xampp\\mysql\\bin\\mysqldump.exe",
].filter(Boolean);

const args = [
  "--host", target.host,
  "--port", String(target.port),
  "--user", target.user,
  ...(target.password ? [`--password=${target.password}`] : []),
  "--single-transaction",
  "--routines",
  "--events",
  "--databases", target.database,
  `--result-file=${file}`,
];

let ran = false;
for (const bin of candidates) {
  const result = spawnSync(bin, args, { stdio: "inherit" });
  if (result.error && result.error.code === "ENOENT") continue;
  ran = true;
  if (result.status !== 0) {
    console.error(`[backup] mysqldump exited with code ${result.status}`);
    process.exit(1);
  }
  break;
}

if (!ran) {
  console.error("[backup] mysqldump not found. Set MYSQLDUMP_PATH to its full path.");
  process.exit(1);
}

console.log(`[backup] wrote ${file}`);
