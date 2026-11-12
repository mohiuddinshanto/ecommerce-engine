-- CreateIndex
CREATE INDEX `Product_isActive_createdAt_idx` ON `Product`(`isActive`, `createdAt`);

-- CreateIndex
CREATE INDEX `Product_isActive_categoryId_createdAt_idx` ON `Product`(`isActive`, `categoryId`, `createdAt`);

-- CreateIndex
CREATE INDEX `Review_productId_isApproved_idx` ON `Review`(`productId`, `isApproved`);