-- CreateTable
CREATE TABLE `Trips` (
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
ALTER TABLE `Trips` ADD CONSTRAINT `Trips_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Trips` ADD CONSTRAINT `Trips_subscriptionId_fkey` FOREIGN KEY (`subscriptionId`) REFERENCES `Subscription`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
