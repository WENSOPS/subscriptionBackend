/*
  Warnings:

  - You are about to drop the `track_referrals` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `track_referrals` DROP FOREIGN KEY `track_referrals_refereeUserId_fkey`;

-- DropForeignKey
ALTER TABLE `track_referrals` DROP FOREIGN KEY `track_referrals_referralProgramId_fkey`;

-- DropForeignKey
ALTER TABLE `track_referrals` DROP FOREIGN KEY `track_referrals_referrerUserId_fkey`;

-- DropTable
DROP TABLE `track_referrals`;

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

    INDEX `TrackReferral_referrerUserId_idx`(`referrerUserId`),
    INDEX `TrackReferral_refereeUserId_idx`(`refereeUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `TrackReferral` ADD CONSTRAINT `TrackReferral_referralProgramId_fkey` FOREIGN KEY (`referralProgramId`) REFERENCES `ReferralProgram`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TrackReferral` ADD CONSTRAINT `TrackReferral_referrerUserId_fkey` FOREIGN KEY (`referrerUserId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TrackReferral` ADD CONSTRAINT `TrackReferral_refereeUserId_fkey` FOREIGN KEY (`refereeUserId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
