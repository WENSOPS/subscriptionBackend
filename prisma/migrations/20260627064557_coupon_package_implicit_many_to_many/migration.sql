ALTER TABLE `CouponPackage` DROP FOREIGN KEY `CouponPackage_couponId_fkey`;
ALTER TABLE `CouponPackage` DROP FOREIGN KEY `CouponPackage_packageId_fkey`;

DROP TABLE `CouponPackage`;

CREATE TABLE `_CouponToPackage` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_CouponToPackage_AB_unique`(`A`, `B`),
    INDEX `_CouponToPackage_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `_CouponToPackage` ADD CONSTRAINT `_CouponToPackage_A_fkey` FOREIGN KEY (`A`) REFERENCES `Coupon`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `_CouponToPackage` ADD CONSTRAINT `_CouponToPackage_B_fkey` FOREIGN KEY (`B`) REFERENCES `Package`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;