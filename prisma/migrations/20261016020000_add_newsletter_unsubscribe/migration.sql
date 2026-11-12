-- AlterTable
ALTER TABLE `NewsletterSubscriber` ADD COLUMN `unsubscribeToken` VARCHAR(191) NULL;
UPDATE `NewsletterSubscriber` SET `unsubscribeToken` = UUID() WHERE `unsubscribeToken` IS NULL;
ALTER TABLE `NewsletterSubscriber` MODIFY `unsubscribeToken` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `NewsletterSubscriber` ADD COLUMN `unsubscribedAt` DATETIME(3) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `NewsletterSubscriber_unsubscribeToken_key` ON `NewsletterSubscriber`(`unsubscribeToken`);
