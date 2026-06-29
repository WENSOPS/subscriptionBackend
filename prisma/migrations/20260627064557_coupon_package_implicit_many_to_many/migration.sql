/*
  Warnings:

  - You are about to drop the `couponpackage` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `couponpackage` DROP FOREIGN KEY `CouponPackage_couponId_fkey`;

-- DropForeignKey
ALTER TABLE `couponpackage` DROP FOREIGN KEY `CouponPackage_packageId_fkey`;

-- DropTable
DROP TABLE `couponpackage`;

-- CreateTable
CREATE TABLE `_CouponToPackage` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_CouponToPackage_AB_unique`(`A`, `B`),
    INDEX `_CouponToPackage_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `_CouponToPackage` ADD CONSTRAINT `_CouponToPackage_A_fkey` FOREIGN KEY (`A`) REFERENCES `Coupon`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_CouponToPackage` ADD CONSTRAINT `_CouponToPackage_B_fkey` FOREIGN KEY (`B`) REFERENCES `Package`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
