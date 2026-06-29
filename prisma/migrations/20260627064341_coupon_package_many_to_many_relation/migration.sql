ALTER TABLE `Coupon` DROP COLUMN `packageId`;

CREATE TABLE `CouponPackage` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `packageId` INTEGER NOT NULL,
    `couponId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CouponPackage_packageId_couponId_key`(`packageId`, `couponId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `CouponPackage` ADD CONSTRAINT `CouponPackage_packageId_fkey` FOREIGN KEY (`packageId`) REFERENCES `Package`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `CouponPackage` ADD CONSTRAINT `CouponPackage_couponId_fkey` FOREIGN KEY (`couponId`) REFERENCES `Coupon`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;