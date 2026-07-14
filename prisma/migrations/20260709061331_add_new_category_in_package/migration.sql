/*
  Warnings:

  - You are about to drop the `_packageservices` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `_packageservices` DROP FOREIGN KEY `_PackageServices_A_fkey`;

-- DropForeignKey
ALTER TABLE `_packageservices` DROP FOREIGN KEY `_PackageServices_B_fkey`;

-- DropForeignKey
ALTER TABLE `bookings` DROP FOREIGN KEY `Booking_userId_fkey`;

-- DropForeignKey
ALTER TABLE `orders` DROP FOREIGN KEY `Order_packageId_fkey`;

-- DropForeignKey
ALTER TABLE `orders` DROP FOREIGN KEY `Order_userId_fkey`;

-- DropForeignKey
ALTER TABLE `package_services` DROP FOREIGN KEY `PackageService_packageId_fkey`;

-- DropForeignKey
ALTER TABLE `package_services` DROP FOREIGN KEY `PackageService_serviceId_fkey`;

-- DropForeignKey
ALTER TABLE `subscriptions` DROP FOREIGN KEY `Subscription_packageId_fkey`;

-- DropForeignKey
ALTER TABLE `subscriptions` DROP FOREIGN KEY `Subscription_userId_fkey`;

-- DropForeignKey
ALTER TABLE `trips` DROP FOREIGN KEY `Trip_subscriptionId_fkey`;

-- DropForeignKey
ALTER TABLE `trips` DROP FOREIGN KEY `Trip_userId_fkey`;

-- AlterTable
ALTER TABLE `subscriptions` ADD COLUMN `category` VARCHAR(191) NULL;

-- DropTable
DROP TABLE `_packageservices`;

-- AddForeignKey
ALTER TABLE `package_services` ADD CONSTRAINT `package_services_packageId_fkey` FOREIGN KEY (`packageId`) REFERENCES `packages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `package_services` ADD CONSTRAINT `package_services_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `services`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_packageId_fkey` FOREIGN KEY (`packageId`) REFERENCES `packages`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_packageId_fkey` FOREIGN KEY (`packageId`) REFERENCES `packages`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trips` ADD CONSTRAINT `trips_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trips` ADD CONSTRAINT `trips_subscriptionId_fkey` FOREIGN KEY (`subscriptionId`) REFERENCES `subscriptions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `bookings` RENAME INDEX `Booking_cashfreeOrderId_key` TO `bookings_cashfreeOrderId_key`;

-- RenameIndex
ALTER TABLE `bookings` RENAME INDEX `Booking_invoiceNumber_key` TO `bookings_invoiceNumber_key`;

-- RenameIndex
ALTER TABLE `coupons` RENAME INDEX `Coupon_code_key` TO `coupons_code_key`;

-- RenameIndex
ALTER TABLE `orders` RENAME INDEX `Order_cashfreeOrderId_key` TO `orders_cashfreeOrderId_key`;

-- RenameIndex
ALTER TABLE `package_services` RENAME INDEX `PackageService_packageId_serviceId_key` TO `package_services_packageId_serviceId_key`;

-- RenameIndex
ALTER TABLE `packages` RENAME INDEX `Package_name_key` TO `packages_name_key`;

-- RenameIndex
ALTER TABLE `services` RENAME INDEX `Service_title_key` TO `services_title_key`;

-- RenameIndex
ALTER TABLE `users` RENAME INDEX `User_email_key` TO `users_email_key`;

-- RenameIndex
ALTER TABLE `users` RENAME INDEX `User_mobileNumber_key` TO `users_mobileNumber_key`;
