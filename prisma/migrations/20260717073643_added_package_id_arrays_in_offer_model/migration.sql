/*
  Warnings:

  - You are about to drop the column `featuredPackageId` on the `offers` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `offers` DROP FOREIGN KEY `offers_featuredPackageId_fkey`;

-- DropIndex
DROP INDEX `offers_featuredPackageId_fkey` ON `offers`;

-- AlterTable
ALTER TABLE `offers` DROP COLUMN `featuredPackageId`;

-- CreateTable
CREATE TABLE `_OfferToPackage` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_OfferToPackage_AB_unique`(`A`, `B`),
    INDEX `_OfferToPackage_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `_OfferToPackage` ADD CONSTRAINT `_OfferToPackage_A_fkey` FOREIGN KEY (`A`) REFERENCES `offers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_OfferToPackage` ADD CONSTRAINT `_OfferToPackage_B_fkey` FOREIGN KEY (`B`) REFERENCES `packages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
