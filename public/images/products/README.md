# Demo product photos

These local photos replace the seed catalog's generic placeholder. They are representative demo imagery, not photos of the exact products sold. Replace them with the store's own product photography before treating the catalog as a real inventory listing.

The photos are downloaded locally from Unsplash and served from `/images/products/`, so storefront image loading does not depend on Unsplash at runtime. Unsplash license: <https://unsplash.com/license>.

Photo IDs are the filenames. The local seed catalog maps each demo product to a representative photo; new installs use the paths in `prisma/storefront-seed.json`.
