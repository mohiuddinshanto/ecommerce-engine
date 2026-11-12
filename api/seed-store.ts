import { readFileSync } from "node:fs";
import { join } from "node:path";
import "dotenv/config";
import { prisma } from "./lib/prisma.js";

type SeedVariation = {
  name: string;
  sku: string | null;
  price: string;
  salePrice: string | null;
  stock: number;
  manageStock: boolean;
  weight: string | null;
  image: string | null;
  gallery: unknown;
  description: string | null;
  status: string;
  attributes: { attribute: string; value: string }[];
};

type SeedProduct = {
  name: string;
  slug: string;
  description: string;
  longDescription: string | null;
  categorySlug: string;
  categorySlugs?: string[];
  price: string;
  salePrice: string | null;
  stock: number;
  sku: string | null;
  productType: string;
  images: unknown;
  productAttributes: unknown;
  variants: unknown;
  variationImages: unknown;
  isPerishable: boolean;
  isActive: boolean;
  showOnHome: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  imagesDetails: { url: string; altText: string | null; title: string | null; sortOrder: number; isFeatured: boolean }[];
  attributes: { name: string; values: { value: string; colorSwatch: string | null; image: string | null }[] }[];
  variations: SeedVariation[];
};

type SeedFile = {
  categories: { name: string; slug: string; image: string | null; parentSlug: string | null; attributeSchema: unknown }[];
  products: SeedProduct[];
};

const seedPath = join(__dirname, "..", "prisma", "storefront-seed.json");
const blank = (value: string | null | undefined) => (value && value.trim() ? value.trim() : null);

async function main() {
  const ifEmpty = process.argv.slice(2).includes("--if-empty");

  if (ifEmpty) {
    const existingProducts = await prisma.product.count();
    if (existingProducts > 0) {
      console.log(`skipped (--if-empty): catalog already has ${existingProducts} products.`);
      console.log("Run `npm run seed:store:prod` without --if-empty to overwrite the catalog.");
      return;
    }
    console.log(`--if-empty: catalog is empty, seeding now.`);
  }

  const seed = JSON.parse(readFileSync(seedPath, "utf8")) as SeedFile;
  console.log(`loaded ${seed.products.length} products from ${seedPath}`);

  for (const category of seed.categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name, image: category.image, attributeSchema: (category.attributeSchema ?? undefined) as never },
      create: { name: category.name, slug: category.slug, image: category.image, attributeSchema: (category.attributeSchema ?? undefined) as never },
    });
  }
  for (const category of seed.categories) {
    if (!category.parentSlug) continue;
    const parent = await prisma.category.findUnique({ where: { slug: category.parentSlug }, select: { id: true } });
    if (!parent) continue;
    await prisma.category.update({ where: { slug: category.slug }, data: { parentId: parent.id } });
  }
  console.log(`categories ready: ${seed.categories.length}`);

  let variationCount = 0;

  for (const item of seed.products) {
    const categorySlugs = [...new Set([item.categorySlug, ...(item.categorySlugs ?? [])])];
    const importedCategories = await prisma.category.findMany({ where: { slug: { in: categorySlugs } }, select: { id: true, slug: true } });
    const category = importedCategories.find((candidate) => candidate.slug === item.categorySlug);
    if (!category) {
      console.warn(`  ! skipped ${item.slug}: category "${item.categorySlug}" not found`);
      continue;
    }

    const product = await prisma.product.upsert({
      where: { slug: item.slug },
      update: {
        name: item.name,
        description: item.description,
        longDescription: item.longDescription,
        categoryId: category.id,
        price: item.price,
        salePrice: item.salePrice,
        stock: item.stock,
        sku: blank(item.sku),
        productType: item.productType as never,
        images: (item.images ?? []) as never,
        productAttributes: (item.productAttributes ?? undefined) as never,
        variants: (item.variants ?? undefined) as never,
        variationImages: (item.variationImages ?? undefined) as never,
        isPerishable: item.isPerishable,
        isActive: item.isActive,
        showOnHome: item.showOnHome,
        seoTitle: item.seoTitle,
        seoDescription: item.seoDescription,
      },
      create: {
        name: item.name,
        slug: item.slug,
        description: item.description,
        longDescription: item.longDescription,
        categoryId: category.id,
        price: item.price,
        salePrice: item.salePrice,
        stock: item.stock,
        sku: blank(item.sku),
        productType: item.productType as never,
        images: (item.images ?? []) as never,
        productAttributes: (item.productAttributes ?? undefined) as never,
        variants: (item.variants ?? undefined) as never,
        variationImages: (item.variationImages ?? undefined) as never,
        isPerishable: item.isPerishable,
        isActive: item.isActive,
        showOnHome: item.showOnHome,
        seoTitle: item.seoTitle,
        seoDescription: item.seoDescription,
      },
    });

    await prisma.productCategory.deleteMany({ where: { productId: product.id } });
    await prisma.productCategory.createMany({ data: importedCategories.map((itemCategory) => ({ productId: product.id, categoryId: itemCategory.id })), skipDuplicates: true });

    await prisma.productImage.deleteMany({ where: { productId: product.id } });
    if (item.imagesDetails.length) {
      await prisma.productImage.createMany({
        data: item.imagesDetails.map((image) => ({
          productId: product.id,
          url: image.url,
          altText: image.altText,
          title: image.title,
          sortOrder: image.sortOrder,
          isFeatured: image.isFeatured,
        })),
      });
    }

    await prisma.productAttribute.deleteMany({ where: { productId: product.id } });
    await prisma.productVariation.deleteMany({ where: { productId: product.id } });

    const attributeIds = new Map<string, string>();
    const valueIds = new Map<string, string>();
    for (const attribute of item.attributes) {
      const created = await prisma.productAttribute.create({
        data: { productId: product.id, name: attribute.name },
      });
      attributeIds.set(attribute.name, created.id);
      for (const value of attribute.values) {
        const createdValue = await prisma.attributeValue.create({
          data: { attributeId: created.id, value: value.value, colorSwatch: value.colorSwatch, image: value.image },
        });
        valueIds.set(`${attribute.name}=${value.value}`, createdValue.id);
      }
    }

    let defaultVariationId: string | null = null;
    const createdVariationIds = new Set<string>();
    for (const variation of item.variations) {
      const created = await prisma.productVariation.create({
        data: {
          productId: product.id,
          name: variation.name,
          sku: blank(variation.sku),
          price: variation.price,
          salePrice: variation.salePrice,
          stock: variation.stock,
          manageStock: variation.manageStock,
          weight: variation.weight,
          image: variation.image,
          gallery: (variation.gallery ?? undefined) as never,
          description: variation.description,
          status: variation.status,
        },
      });
      variationCount += 1;
      createdVariationIds.add(created.id);
      if (!defaultVariationId) defaultVariationId = created.id;

      for (const link of variation.attributes) {
        const attributeId = attributeIds.get(link.attribute);
        const valueId = valueIds.get(`${link.attribute}=${link.value}`);
        if (!attributeId || !valueId) continue;
        await prisma.variationAttribute.create({ data: { variationId: created.id, attributeId, valueId } });
      }
    }

    const storedDefault = product.defaultVariationId;
    const storedDefaultStillExists = storedDefault ? createdVariationIds.has(storedDefault) : false;
    if (defaultVariationId && !storedDefaultStillExists) {
      await prisma.product.update({ where: { id: product.id }, data: { defaultVariationId } });
    }

    console.log(`  + ${item.slug} (${item.variations.length} variations)`);
  }

  const [products, variations, categories] = await Promise.all([
    prisma.product.count(),
    prisma.productVariation.count(),
    prisma.category.count(),
  ]);
  console.log("");
  console.log(`done -> categories: ${categories}, products: ${products}, variations: ${variations}`);
  console.log(`(this run wrote ${variationCount} variations)`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
