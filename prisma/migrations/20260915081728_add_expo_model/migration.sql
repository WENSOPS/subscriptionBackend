-- CreateTable
CREATE TABLE `expos` (
    `id` VARCHAR(50) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `shortName` VARCHAR(191) NULL,
    `city` VARCHAR(191) NOT NULL,
    `venue` VARCHAR(191) NOT NULL,
    `eventStart` DATETIME(3) NOT NULL,
    `eventEnd` DATETIME(3) NOT NULL,
    `serviceStart` DATETIME(3) NOT NULL,
    `serviceEnd` DATETIME(3) NOT NULL,
    `status` ENUM('upcoming', 'ongoing', 'completed', 'cancelled') NOT NULL DEFAULT 'upcoming',
    `featured` BOOLEAN NOT NULL DEFAULT false,
    `heroImages` JSON NULL,
    `cardImage` VARCHAR(191) NULL,
    `bannerImage` VARCHAR(191) NULL,
    `eventImages` JSON NULL,
    `airportCode` VARCHAR(191) NULL,
    `airportName` VARCHAR(191) NULL,
    `airportDistance` VARCHAR(191) NULL,
    `airportTravelTime` VARCHAR(191) NULL,
    `pickupPoints` JSON NULL,
    `dropLocation` VARCHAR(191) NULL,
    `serviceArea` VARCHAR(191) NULL,
    `amenities` JSON NULL,
    `faqOverrides` JSON NULL,
    `testimonialIds` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `expos_slug_key`(`slug`),
    INDEX `expos_city_idx`(`city`),
    INDEX `expos_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_ExpoToPackage` (
    `A` VARCHAR(50) NOT NULL,
    `B` VARCHAR(50) NOT NULL,

    UNIQUE INDEX `_ExpoToPackage_AB_unique`(`A`, `B`),
    INDEX `_ExpoToPackage_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `_ExpoToPackage` ADD CONSTRAINT `_ExpoToPackage_A_fkey` FOREIGN KEY (`A`) REFERENCES `expos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_ExpoToPackage` ADD CONSTRAINT `_ExpoToPackage_B_fkey` FOREIGN KEY (`B`) REFERENCES `packages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
