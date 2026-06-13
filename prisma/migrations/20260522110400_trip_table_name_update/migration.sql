/*
  Warnings:

  - You are about to drop the `trips` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `trips` DROP FOREIGN KEY `Trips_subscriptionId_fkey`;

-- DropForeignKey
ALTER TABLE `trips` DROP FOREIGN KEY `Trips_userId_fkey`;

-- DropTable
DROP TABLE `trips`;

-- CreateTable
CREATE TABLE `Trip` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `subscriptionId` INTEGER NOT NULL,
    `assignmentId` VARCHAR(191) NOT NULL,
    `pickupLocation` VARCHAR(191) NOT NULL,
    `dropLocation` VARCHAR(191) NOT NULL,
    `tripDate` DATETIME(3) NOT NULL,
    `tripType` VARCHAR(191) NOT NULL,
    `status` ENUM('requested', 'confirmed', 'completed', 'cancelled') NOT NULL DEFAULT 'requested',
    `cancelledBy` VARCHAR(191) NULL,
    `cancellationReason` VARCHAR(191) NULL,
    `services` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Trip` ADD CONSTRAINT `Trip_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Trip` ADD CONSTRAINT `Trip_subscriptionId_fkey` FOREIGN KEY (`subscriptionId`) REFERENCES `Subscription`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
