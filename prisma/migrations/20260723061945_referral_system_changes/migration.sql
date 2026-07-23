/*
  Warnings:

  - A unique constraint covering the columns `[referralCode]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `orders` ADD COLUMN `appliedReferralCode` VARCHAR(191) NULL,
    ADD COLUMN `appliedReferralRewardId` INTEGER NULL,
    ADD COLUMN `referralDiscountAmount` DOUBLE NULL;

-- AlterTable
ALTER TABLE `users` ADD COLUMN `referralCode` VARCHAR(191) NULL,
    ADD COLUMN `referredByUserId` INTEGER NULL;

-- CreateTable
CREATE TABLE `ReferralProgram` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `packageCategory` VARCHAR(191) NOT NULL,
    `startDate` DATETIME(3) NULL,
    `endDate` DATETIME(3) NULL,
    `programStatus` ENUM('active', 'paused', 'cancelled') NOT NULL DEFAULT 'active',
    `maxTotalRedemptions` INTEGER NULL,
    `totalRedemptionCount` INTEGER NOT NULL DEFAULT 0,
    `maxRedemptionsPerUser` INTEGER NULL,
    `rewardOnSignup` BOOLEAN NOT NULL DEFAULT false,
    `referrerRewardType` ENUM('none', 'discount', 'wallet') NULL,
    `referrerRewardCalcType` ENUM('percentage', 'fixed') NULL,
    `referrerRewardValue` DOUBLE NULL,
    `referrerPackageScope` ENUM('any', 'custom') NULL,
    `refereeRewardType` ENUM('none', 'discount', 'wallet') NULL,
    `refereeRewardCalcType` ENUM('percentage', 'fixed') NULL,
    `refereeRewardValue` DOUBLE NULL,
    `refereePackageScope` ENUM('any', 'custom') NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReferralTriggerPackage` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `referralProgramId` INTEGER NOT NULL,
    `packageId` INTEGER NOT NULL,

    UNIQUE INDEX `ReferralTriggerPackage_referralProgramId_packageId_key`(`referralProgramId`, `packageId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReferralProgramReferrerPackage` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `referralProgramId` INTEGER NOT NULL,
    `packageId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReferralProgramRefereePackage` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `referralProgramId` INTEGER NOT NULL,
    `packageId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TrackReferral` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `referralProgramId` INTEGER NOT NULL,
    `referralProgramNameSnapshot` VARCHAR(191) NOT NULL,
    `referrerUserId` INTEGER NOT NULL,
    `refereeUserId` INTEGER NOT NULL,
    `triggeredBySignup` BOOLEAN NOT NULL,
    `referrerRewardTypeSnapshot` ENUM('none', 'discount', 'wallet') NULL,
    `referrerRewardSnapshot` JSON NULL,
    `refereeRewardTypeSnapshot` ENUM('none', 'discount', 'wallet') NULL,
    `refereeRewardSnapshot` JSON NULL,
    `referrerReferralRewardId` INTEGER NULL,
    `triggeringOrderId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReferralReward` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `rewardCalcType` ENUM('percentage', 'fixed') NOT NULL,
    `rewardValue` DOUBLE NOT NULL,
    `rewardAmountINR` DOUBLE NOT NULL,
    `eligiblePackageIds` JSON NOT NULL,
    `isRedeemed` BOOLEAN NOT NULL DEFAULT false,
    `redemptionDetails` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `users_referralCode_key` ON `users`(`referralCode`);

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_referredByUserId_fkey` FOREIGN KEY (`referredByUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReferralTriggerPackage` ADD CONSTRAINT `ReferralTriggerPackage_referralProgramId_fkey` FOREIGN KEY (`referralProgramId`) REFERENCES `ReferralProgram`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReferralProgramReferrerPackage` ADD CONSTRAINT `ReferralProgramReferrerPackage_referralProgramId_fkey` FOREIGN KEY (`referralProgramId`) REFERENCES `ReferralProgram`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReferralProgramRefereePackage` ADD CONSTRAINT `ReferralProgramRefereePackage_referralProgramId_fkey` FOREIGN KEY (`referralProgramId`) REFERENCES `ReferralProgram`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TrackReferral` ADD CONSTRAINT `TrackReferral_referralProgramId_fkey` FOREIGN KEY (`referralProgramId`) REFERENCES `ReferralProgram`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TrackReferral` ADD CONSTRAINT `TrackReferral_referrerUserId_fkey` FOREIGN KEY (`referrerUserId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReferralReward` ADD CONSTRAINT `ReferralReward_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
