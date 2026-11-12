ALTER TABLE `Order`
  ADD COLUMN `deletedAt` DATETIME(3) NULL,
  ADD INDEX `Order_deletedAt_createdAt_idx` (`deletedAt`, `createdAt`);

CREATE TABLE `OrderDeletionAudit` (
  `id` VARCHAR(191) NOT NULL,
  `orderId` VARCHAR(191) NOT NULL,
  `actorId` VARCHAR(191) NOT NULL,
  `action` VARCHAR(24) NOT NULL,
  `snapshot` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `OrderDeletionAudit_orderId_createdAt_idx` (`orderId`, `createdAt`),
  INDEX `OrderDeletionAudit_actorId_createdAt_idx` (`actorId`, `createdAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
