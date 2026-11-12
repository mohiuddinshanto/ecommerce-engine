import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "./lib/prisma.js";

async function main() {
  const categories = await prisma.category.findMany({
    orderBy: { createdAt: "asc" },
    include: { parent: { select: { slug: true } } },
  });

  const products = await prisma.product.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      category: { select: { slug: true } },
      categoryLinks: { select: { category: { select: { slug: true } } } },
      imagesDetails: { orderBy: { sortOrder: "asc" } },
      attributes: {
        include: {
          values: true,
          variations: { include: { value: true } },
        },
      },
      variations: { orderBy: { createdAt: "asc" }, include: { attributes: { include: { value: true, attribute: true } } } },
    },
  });

  const payload = {
    generatedAt: new Date().toISOString(),
    categories: categories.map((c) => ({
      name: c.name,
      slug: c.slug,
      image: c.image,
      parentSlug: c.parent?.slug ?? null,
      attributeSchema: c.attributeSchema ?? null,
    })),
    products: products.map((p) => ({
      name: p.name,
      slug: p.slug,
      description: p.description,
      longDescription: p.longDescription,
      categorySlug: p.category.slug,
      categorySlugs: p.categoryLinks.map((link) => link.category.slug),
      price: p.price.toString(),
      salePrice: p.salePrice ? p.salePrice.toString() : null,
      stock: p.stock,
      sku: p.sku,
      productType: p.productType,
      images: p.images,
      productAttributes: p.productAttributes,
      variants: p.variants,
      variationImages: p.variationImages,
      isPerishable: p.isPerishable,
      isActive: p.isActive,
      showOnHome: p.showOnHome,
      seoTitle: p.seoTitle,
      seoDescription: p.seoDescription,
      imagesDetails: p.imagesDetails.map((i) => ({
        url: i.url,
        altText: i.altText,
        title: i.title,
        sortOrder: i.sortOrder,
        isFeatured: i.isFeatured,
      })),
      attributes: p.attributes.map((a) => ({
        name: a.name,
        values: a.values.map((v) => ({
          value: v.value,
          colorSwatch: v.colorSwatch,
          image: v.image,
        })),
      })),
      variations: p.variations.map((v) => ({
        name: v.name,
        sku: v.sku,
        price: v.price.toString(),
        salePrice: v.salePrice ? v.salePrice.toString() : null,
        stock: v.stock,
        manageStock: v.manageStock,
        weight: v.weight ? v.weight.toString() : null,
        image: v.image,
        gallery: v.gallery,
        description: v.description,
        status: v.status,
        attributes: v.attributes.map((va) => ({ attribute: va.attribute.name, value: va.value.value })),
      })),
    })),
  };

  const out = join(process.cwd(), "prisma", "storefront-seed.json");
  writeFileSync(out, JSON.stringify(payload, null, 2), "utf8");

  console.log(`categories: ${payload.categories.length}`);
  console.log(`products  : ${payload.products.length}`);
  console.log(`variations: ${payload.products.reduce((sum, p) => sum + p.variations.length, 0)}`);
  console.log(`written   : ${out}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
