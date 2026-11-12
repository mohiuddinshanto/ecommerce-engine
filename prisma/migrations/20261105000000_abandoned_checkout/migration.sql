CREATE TABLE `AbandonedCheckout` (
  `sessionId` VARCHAR(64) NOT NULL,
  `name` VARCHAR(191) NULL,
  `phone` VARCHAR(32) NULL,
  `email` VARCHAR(191) NULL,
  `address` TEXT NULL,
  `items` JSON NOT NULL,
  `total` DECIMAL(10,2) NOT NULL,
  `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  `convertedAt` DATETIME(3) NULL,
  PRIMARY KEY (`sessionId`),
  INDEX `AbandonedCheckout_convertedAt_updatedAt_idx` (`convertedAt`, `updatedAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
