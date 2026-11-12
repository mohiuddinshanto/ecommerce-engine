import "dotenv/config";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";
import sharp from "sharp";
import { prisma } from "../api/lib/prisma.js";
import { getLocalProductsDirectory, loadStorageConfig } from "../api/lib/storage.js";

async function main() {
const dryRun = process.argv.includes("--dry-run");
const config = await loadStorageConfig();
if (!config || config.provider !== "local") throw new Error("This script only supports configured local image storage; remote object storage was found or storage is not configured.");

const targetDir = await getLocalProductsDirectory();
const baseUrl = config.publicBaseUrl.replace(/\/+$/, "");
const configs = await prisma.storeConfig.findMany({ select: { id: true, logoUrl: true, marketingPixels: true, chatConfig: true, themeSettings: true, homePageConfig: true, heroBannerConfig: true, navigationConfig: true } });
const products = await prisma.product.findMany({ select: { id: true, images: true, productAttributes: true, variants: true, variationImages: true } });
const variations = await prisma.productVariation.findMany({ select: { id: true, image: true, gallery: true } });
const heroUrls = new Set<string>();
const collect = (value: unknown, out: Set<string>) => {
  if (typeof value === "string" && /^https?:\/\//.test(value)) out.add(value);
  else if (Array.isArray(value)) value.forEach((item) => collect(item, out));
  else if (value && typeof value === "object") Object.values(value).forEach((item) => collect(item, out));
};
for (const row of configs) collect(row.heroBannerConfig, heroUrls);

const replace = (value: any, from: string, to: string): any =>
  value === from ? to : Array.isArray(value) ? value.map((item) => replace(item, from, to)) : value && typeof value === "object" ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, replace(item, from, to)])) : value;

for (const name of readdirSync(targetDir)) {
  const path = join(targetDir, name);
  if (!statSync(path).isFile() || statSync(path).size <= 100 * 1024 || [".gif", ".svg"].includes(extname(name).toLowerCase())) continue;
  const oldUrl = `${baseUrl}/${encodeURIComponent(name)}`;
  const isHero = heroUrls.has(oldUrl);
  const logo = configs.some((row) => row.logoUrl === oldUrl);
  const maxWidth = logo ? 162 : isHero ? 1600 : 1000;
  const output = await sharp(readFileSync(path)).resize({ width: maxWidth, withoutEnlargement: true }).webp({ quality: isHero ? 70 : 78 }).toBuffer();
  const newName = `${createHash("sha256").update(output).digest("hex")}.webp`;
  const newPath = join(targetDir, newName);
  const newUrl = `${baseUrl}/${newName}`;
  console.log(`${dryRun ? "Would convert" : "Converting"} ${name} (${statSync(path).size} bytes) -> ${newName} (${output.length} bytes); ${isHero ? "hero" : logo ? "logo" : "product/general"}`);
  if (dryRun) continue;
  if (!existsSync(newPath)) writeFileSync(newPath, output);

  const asset = await prisma.mediaAsset.findUnique({ where: { url: oldUrl } });
  if (asset) {
    await prisma.mediaAsset.upsert({ where: { url: newUrl }, create: { url: newUrl, altText: asset.altText, title: asset.title, description: asset.description }, update: {} });
    await prisma.mediaAsset.delete({ where: { url: oldUrl } });
  }
  await prisma.productImage.updateMany({ where: { url: oldUrl }, data: { url: newUrl } });
  for (const product of products) {
    const data = Object.fromEntries(["images", "productAttributes", "variants", "variationImages"].flatMap((key) => {
      const value = (product as any)[key];
      return JSON.stringify(value).includes(oldUrl) ? [[key, replace(value, oldUrl, newUrl)]] : [];
    }));
    if (Object.keys(data).length) await prisma.product.update({ where: { id: product.id }, data });
  }
  await prisma.category.updateMany({ where: { image: oldUrl }, data: { image: newUrl } });
  await prisma.productVariation.updateMany({ where: { image: oldUrl }, data: { image: newUrl } });
  await prisma.attributeValue.updateMany({ where: { image: oldUrl }, data: { image: newUrl } });
  for (const variation of variations) {
    if (JSON.stringify(variation.gallery).includes(oldUrl)) await prisma.productVariation.update({ where: { id: variation.id }, data: { gallery: replace(variation.gallery, oldUrl, newUrl) } });
  }
  for (const row of configs) {
    const data = {
      ...(row.logoUrl === oldUrl ? { logoUrl: newUrl } : {}),
      ...(JSON.stringify(row.marketingPixels).includes(oldUrl) ? { marketingPixels: replace(row.marketingPixels, oldUrl, newUrl) } : {}),
      ...(JSON.stringify(row.chatConfig).includes(oldUrl) ? { chatConfig: replace(row.chatConfig, oldUrl, newUrl) } : {}),
      ...(JSON.stringify(row.themeSettings).includes(oldUrl) ? { themeSettings: replace(row.themeSettings, oldUrl, newUrl) } : {}),
      ...(JSON.stringify(row.homePageConfig).includes(oldUrl) ? { homePageConfig: replace(row.homePageConfig, oldUrl, newUrl) } : {}),
      ...(JSON.stringify(row.heroBannerConfig).includes(oldUrl) ? { heroBannerConfig: replace(row.heroBannerConfig, oldUrl, newUrl) } : {}),
      ...(JSON.stringify(row.navigationConfig).includes(oldUrl) ? { navigationConfig: replace(row.navigationConfig, oldUrl, newUrl) } : {}),
    };
    if (Object.keys(data).length) await prisma.storeConfig.update({ where: { id: row.id }, data: data as any });
  }
}
await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
