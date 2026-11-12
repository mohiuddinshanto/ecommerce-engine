import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { basename, extname, isAbsolute, join, resolve, sep } from "node:path";
import { prisma } from "./prisma.js";
import { decrypt } from "./crypto.js";
import sharp from "sharp";

export type StorageConfig =
  | { provider: "local"; folderPath: string; publicBaseUrl: string }
  | { provider: "hostinger-object-storage"; endpoint: string; region: string; bucket: string; accessKeyId: string; secretAccessKey: string; publicBaseUrl?: string };

const has = (value: unknown, key: string): boolean => Boolean(value && typeof value === "object" && key in (value as Record<string, unknown>));

const uploadsRoot = process.env.UPLOADS_DIR ?? join(process.cwd(), "public", "uploads");
const IMAGE_CONTENT_TYPES: Record<string, string> = {
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

export function imageContentType(filename: string): string | undefined {
  return IMAGE_CONTENT_TYPES[extname(filename).toLowerCase()];
}

export function isPersistentLocalStoragePath(value: string): boolean {
  if (!isAbsolute(value)) return false;
  const segments = value.replace(/\\/g, "/").toLowerCase().split("/").filter(Boolean);
  return !segments.includes("hbuilds") && !segments.includes("public_html");
}

export async function getLocalProductsDirectory(): Promise<string> {
  const config = await loadStorageConfig();
  return config?.provider === "local" ? resolve(config.folderPath) : join(uploadsRoot, "products");
}

export async function readProductImage(filename: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  const safeName = basename(filename);
  const contentType = imageContentType(safeName);
  if (!contentType || safeName !== filename || safeName.startsWith(".")) return null;

  const roots = [await getLocalProductsDirectory(), join(uploadsRoot, "products")];
  for (const rootValue of [...new Set(roots)]) {
    const root = resolve(rootValue);
    const filePath = resolve(root, safeName);
    if (!filePath.startsWith(`${root}${sep}`)) continue;
    try {
      const buffer = await import("node:fs/promises").then(({ readFile }) => readFile(filePath));
      return { buffer, contentType };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  return null;
}

export function isLocalConfig(value: unknown): value is Extract<StorageConfig, { provider: "local" }> {
  return has(value, "provider") && (value as { provider: string }).provider === "local" && typeof (value as Extract<StorageConfig, { provider: "local" }>).folderPath === "string" && typeof (value as Extract<StorageConfig, { provider: "local" }>).publicBaseUrl === "string";
}

export function isHostingerConfig(value: unknown): value is Extract<StorageConfig, { provider: "hostinger-object-storage" }> {
  return has(value, "provider") && (value as { provider: string }).provider === "hostinger-object-storage" && ["endpoint", "bucket", "accessKeyId", "secretAccessKey"].every(key => typeof (value as Record<string, unknown>)[key] === "string");
}

export async function loadStorageConfig(): Promise<StorageConfig | null> {
  const config = await prisma.storeConfig.findUnique({ where: { id: "store-config-singleton" }, select: { storageConfig: true } });
  const stored = config?.storageConfig as { encrypted?: string } | null;
  const parsed = stored?.encrypted ? decrypt<unknown>(stored.encrypted) : undefined;
  if (isLocalConfig(parsed) || isHostingerConfig(parsed)) return parsed;
  return null;
}

export async function uploadImage(file: { buffer: Buffer; mimetype: string; originalname: string }, hero = false): Promise<string> {
  const storageConfig = await loadStorageConfig();
  if (!storageConfig) throw new Error("Storage is not configured. Add it from the Storage settings, then retry.");

  const originalExt = (extname(file.originalname) || ".img").toLowerCase();
  const optimized = [".gif", ".svg"].includes(originalExt)
    ? file.buffer
    : await sharp(file.buffer).rotate().resize({ width: hero ? 1600 : 1000, withoutEnlargement: true }).webp({ quality: hero ? 70 : 78 }).toBuffer();
  const ext = optimized === file.buffer ? originalExt : ".webp";

  if (storageConfig.provider === "local") {
    const productsDir = resolve(storageConfig.folderPath);
    mkdirSync(productsDir, { recursive: true, mode: 0o755 });
    const hash = createHash("sha256").update(optimized).digest("hex");
    const existing = readdirSync(productsDir).find((name) => name.startsWith(hash));
    const baseUrl = storageConfig.publicBaseUrl.replace(/\/+$/, "");
    if (existing) return `${baseUrl}/${existing}`;
    const filename = `${hash}${ext}`;
    writeFileSync(join(productsDir, filename), optimized, { mode: 0o644 });
    return `${baseUrl}/${filename}`;
  }

  const { PutObjectCommand, S3Client } = await import("@aws-sdk/client-s3");
  const hash = createHash("sha256").update(optimized).digest("hex").slice(0, 12);
  const filename = `${hash}${ext}`;
  const key = `uploads/products/${filename}`;
  const client = new S3Client({ region: storageConfig.region, endpoint: storageConfig.endpoint, forcePathStyle: true, credentials: { accessKeyId: storageConfig.accessKeyId, secretAccessKey: storageConfig.secretAccessKey } });
  await client.send(new PutObjectCommand({ Bucket: storageConfig.bucket, Key: key, Body: optimized, ContentType: ext === ".webp" ? "image/webp" : file.mimetype, ACL: "public-read" }));
  const base = storageConfig.publicBaseUrl?.replace(/[\\/]+$/, "") ?? `${storageConfig.endpoint.replace(/[\\/]+$/, "")}/${storageConfig.bucket}`;
  return `${base}/${key}`;
}

export async function listImages(): Promise<Array<{ url: string; filename: string; size: number; modifiedAt: Date }>> {
  const config = await loadStorageConfig();
  if (!config) throw new Error("Storage is not configured.");
  if (config.provider === "local") {
    const directory = resolve(config.folderPath);
    mkdirSync(directory, { recursive: true });
    const base = config.publicBaseUrl.replace(/\/+$/, "");
    return readdirSync(directory).flatMap((filename) => {
      try {
        const info = statSync(join(directory, filename));
        if (!info.isFile() || !/^\.(png|jpe?g|gif|webp|avif|svg|bmp)$/i.test(extname(filename))) return [];
        return [{ url: `${base}/${encodeURIComponent(filename)}`, filename, size: info.size, modifiedAt: info.mtime }];
      } catch { return []; }
    }).sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime());
  }
  const { ListObjectsV2Command, S3Client } = await import("@aws-sdk/client-s3");
  const client = new S3Client({ region: config.region, endpoint: config.endpoint, forcePathStyle: true, credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey } });
  const contents = [] as Array<{ Key?: string; Size?: number; LastModified?: Date }>;
  let continuationToken: string | undefined;
  do {
    const objects = await client.send(new ListObjectsV2Command({ Bucket: config.bucket, Prefix: "uploads/products/", ContinuationToken: continuationToken }));
    contents.push(...(objects.Contents ?? []));
    continuationToken = objects.IsTruncated ? objects.NextContinuationToken : undefined;
  } while (continuationToken);
  const base = config.publicBaseUrl?.replace(/[\\/]+$/, "") ?? `${config.endpoint.replace(/[\\/]+$/, "")}/${config.bucket}`;
  return contents.flatMap((object) => {
    const filename = object.Key?.slice("uploads/products/".length);
    if (!filename || filename.includes("/")) return [];
    return [{ url: `${base}/uploads/products/${encodeURIComponent(filename)}`, filename, size: object.Size ?? 0, modifiedAt: object.LastModified ?? new Date(0) }];
  }).sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime());
}

export async function deleteImage(url: string): Promise<void> {
  const storageConfig = await loadStorageConfig();
  if (!storageConfig) return;
  let parsed: URL;
  try { parsed = new URL(url, storageConfig.provider === "local" ? storageConfig.publicBaseUrl : storageConfig.publicBaseUrl ?? storageConfig.endpoint); }
  catch { throw new Error("Invalid media URL"); }
  const baseUrl = storageConfig.provider === "local"
    ? new URL(storageConfig.publicBaseUrl)
    : new URL(storageConfig.publicBaseUrl ?? `${storageConfig.endpoint.replace(/\/+$/, "")}/${storageConfig.bucket}/uploads/products`);
  const basePath = baseUrl.pathname.replace(/\/+$/, "");
  if (parsed.host !== baseUrl.host || !parsed.pathname.startsWith(`${basePath}/`)) throw new Error("Image is outside the configured storage folder");
  const filename = decodeURIComponent(parsed.pathname.slice(basePath.length + 1));
  const expectedName = storageConfig.provider === "local" ? filename : filename.replace(/^uploads\/products\//, "");
  if (!expectedName || expectedName.includes("/") || expectedName.includes("\\") || expectedName === "." || expectedName === "..") throw new Error("Invalid image path");
  if (storageConfig.provider === "local") {
    const root = resolve(storageConfig.folderPath);
    const file = resolve(root, expectedName);
    if (!file.startsWith(`${root}${process.platform === "win32" ? "\\" : "/"}`)) throw new Error("Invalid image path");
    try {
      unlinkSync(file);
    } catch {
      // file already gone or not deletable — treat as success
    }
    return;
  }
  const { DeleteObjectCommand, S3Client } = await import("@aws-sdk/client-s3");
  const client = new S3Client({ region: storageConfig.region, endpoint: storageConfig.endpoint, forcePathStyle: true, credentials: { accessKeyId: storageConfig.accessKeyId, secretAccessKey: storageConfig.secretAccessKey } });
  await client.send(new DeleteObjectCommand({ Bucket: storageConfig.bucket, Key: `uploads/products/${expectedName}` }));
}
