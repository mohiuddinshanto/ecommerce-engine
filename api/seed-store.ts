import { readFileSync } from "node:fs";
import { join } from "node:path";
import "dotenv/config";
import bcrypt from "bcryptjs";
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
      return;
    }
  }

  const seed = JSON.parse(readFileSync(seedPath, "utf8")) as SeedFile;
  console.log(`loaded ${seed.products.length} products from ${seedPath}`);

  for (const category of seed.categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {},
      create: { name: category.name, slug: category.slug, image: category.image, attributeSchema: (category.attributeSchema ?? undefined) as never },
    });
  }

  let variationCount = 0;
  for (const item of seed.products) {
    const existing = await prisma.product.findUnique({ where: { slug: item.slug }, select: { id: true } });
    if (existing) {
      console.log(`  = preserved ${item.slug}`);
      continue;
    }
    const categorySlugs = [...new Set([item.categorySlug, ...(item.categorySlugs ?? [])])];
    const categories = await prisma.category.findMany({ where: { slug: { in: categorySlugs } }, select: { id: true, slug: true } });
    const category = categories.find((candidate) => candidate.slug === item.categorySlug);
    if (!category) {
      console.warn(`  ! skipped ${item.slug}: category "${item.categorySlug}" not found`);
      continue;
    }

    const product = await prisma.product.create({
      data: {
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

    await prisma.productCategory.createMany({ data: categories.map((entry) => ({ productId: product.id, categoryId: entry.id })), skipDuplicates: true });
    if (item.imagesDetails.length) {
      await prisma.productImage.createMany({ data: item.imagesDetails.map((image) => ({ productId: product.id, ...image })) });
    }
    const attributeIds = new Map<string, string>();
    const valueIds = new Map<string, string>();
    for (const attribute of item.attributes) {
      const createdAttribute = await prisma.productAttribute.create({ data: { productId: product.id, name: attribute.name } });
      attributeIds.set(attribute.name, createdAttribute.id);
      for (const value of attribute.values) {
        const createdValue = await prisma.attributeValue.create({ data: { attributeId: createdAttribute.id, ...value } });
        valueIds.set(`${attribute.name}=${value.value}`, createdValue.id);
      }
    }
    let defaultVariationId: string | null = null;
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
      if (!defaultVariationId) defaultVariationId = created.id;
      for (const link of variation.attributes) {
        const attributeId = attributeIds.get(link.attribute);
        const valueId = valueIds.get(`${link.attribute}=${link.value}`);
        if (attributeId && valueId) await prisma.variationAttribute.create({ data: { variationId: created.id, attributeId, valueId } });
      }
    }
    if (defaultVariationId) await prisma.product.update({ where: { id: product.id }, data: { defaultVariationId } });
    console.log(`  + ${item.slug} (${item.variations.length} variations)`);
  }

  const seedUser = async (email: string | undefined, password: string | undefined, name: string, role: "ADMIN" | "CUSTOMER") => {
    if (!email || !password) return null;
    return prisma.user.upsert({
      where: { email: email.toLowerCase() },
      update: {},
      create: { name, email: email.toLowerCase(), passwordHash: await bcrypt.hash(password, 12), role },
      select: { id: true },
    });
  };
  const admin = await seedUser(process.env.SEED_ADMIN_EMAIL, process.env.SEED_ADMIN_PASSWORD, "Store Admin", "ADMIN");
  const customer = await seedUser(process.env.SEED_DEMO_CUSTOMER_EMAIL, process.env.SEED_DEMO_CUSTOMER_PASSWORD, "Demo Customer", "CUSTOMER");
  if (!admin) console.warn("SEED_ADMIN_EMAIL/PASSWORD not set; no admin account was created.");
  if (!customer) console.warn("SEED_DEMO_CUSTOMER_EMAIL/PASSWORD not set; no demo customer account was created.");

  if (customer) {
    const demoProducts = await prisma.product.findMany({ where: { slug: { in: seed.products.slice(0, 4).map((item) => item.slug) } }, select: { id: true, name: true, price: true } });
    if (demoProducts.length) {
      const samples = [
        { id: "d0000000-0000-4000-8000-000000000001", paymentMethod: "COD", paymentStatus: "PAID" as const, status: "DELIVERED" as const },
        { id: "d0000000-0000-4000-8000-000000000002", paymentMethod: "COD", paymentStatus: "UNPAID" as const, status: "PENDING" as const },
        { id: "d0000000-0000-4000-8000-000000000003", paymentMethod: "STRIPE", paymentStatus: "PAID" as const, status: "CONFIRMED" as const },
        { id: "d0000000-0000-4000-8000-000000000004", paymentMethod: "COD", paymentStatus: "UNPAID" as const, status: "CANCELLED" as const },
      ];
      for (const [index, sample] of samples.entries()) {
        if (await prisma.order.findUnique({ where: { id: sample.id }, select: { id: true } })) continue;
        const product = demoProducts[index % demoProducts.length];
        const price = Number(product.price);
        await prisma.order.create({ data: {
          ...sample,
          customerId: customer.id,
          ipAddress: "127.0.0.1",
          subtotal: price,
          shippingCharge: 8,
          totalAmount: price + 8,
          shippingDetails: { name: "Demo Customer", email: process.env.SEED_DEMO_CUSTOMER_EMAIL, addressLine1: "100 Market Street", city: "Springfield", state: "CA", postalCode: "90001", country: "United States" },
          orderItems: [{ productId: product.id, name: product.name, qty: 1, price }] as never,
        } });
      }
    }
  }

  const [products, variations, categories] = await Promise.all([prisma.product.count(), prisma.productVariation.count(), prisma.category.count()]);
  console.log(`done -> categories: ${categories}, products: ${products}, variations: ${variations}`);
  console.log(`(this run wrote ${variationCount} variations)`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
