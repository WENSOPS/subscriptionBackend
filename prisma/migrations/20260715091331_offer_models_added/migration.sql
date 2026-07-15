-- CreateTable
CREATE TABLE `offers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `slug` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `startDate` DATETIME(3) NULL,
    `endDate` DATETIME(3) NOT NULL,
    `alertText` VARCHAR(191) NOT NULL DEFAULT 'Access Closes {date} — 11:59 PM IST',
    `eyebrow` VARCHAR(191) NULL,
    `title` VARCHAR(191) NOT NULL,
    `titleAccent` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `countdownLabel` VARCHAR(191) NULL,
    `pricingLabel` VARCHAR(191) NULL,
    `benefitsHeading` VARCHAR(191) NULL,
    `deadlineNoteStrong` VARCHAR(191) NULL,
    `deadlineNoteBody` TEXT NULL,
    `ctaPrimaryText` VARCHAR(191) NULL,
    `ctaPrimaryHref` VARCHAR(191) NULL,
    `featuredPackageId` INTEGER NULL,
    `ctaSecondaryText` VARCHAR(191) NULL,
    `footerNote` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `offers_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `offer_benefits` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `offerId` INTEGER NOT NULL,
    `icon` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `order` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `offers` ADD CONSTRAINT `offers_featuredPackageId_fkey` FOREIGN KEY (`featuredPackageId`) REFERENCES `packages`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `offer_benefits` ADD CONSTRAINT `offer_benefits_offerId_fkey` FOREIGN KEY (`offerId`) REFERENCES `offers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
