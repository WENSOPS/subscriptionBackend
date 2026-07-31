/*
  Warnings:

  - You are about to drop the column `referralCode` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `users` DROP COLUMN `referralCode`;

-- CreateTable
CREATE TABLE `user_referral_category_track` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `referralProgramId` INTEGER NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `redemptions` INTEGER NOT NULL DEFAULT 0,
    `maxRedemptions` INTEGER NULL,
    `lastRedeemedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `user_referral_category_track_category_idx`(`category`),
    UNIQUE INDEX `user_referral_category_track_userId_referralProgramId_key`(`userId`, `referralProgramId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user_referral_category_track` ADD CONSTRAINT `user_referral_category_track_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_referral_category_track` ADD CONSTRAINT `user_referral_category_track_referralProgramId_fkey` FOREIGN KEY (`referralProgramId`) REFERENCES `ReferralProgram`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
