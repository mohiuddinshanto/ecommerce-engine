-- AlterTable
ALTER TABLE `User`
  ADD COLUMN `emailVerificationToken` VARCHAR(191) NULL,
  ADD COLUMN `emailVerificationExpiry` DATETIME(3) NULL,
  ADD COLUMN `passwordResetToken` VARCHAR(191) NULL,
  ADD COLUMN `passwordResetExpiry` DATETIME(3) NULL;
