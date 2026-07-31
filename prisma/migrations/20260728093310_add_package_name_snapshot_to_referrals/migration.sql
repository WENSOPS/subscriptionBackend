/*
  Warnings:

  - You are about to alter the column `referralCode` on the `users` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Json`.

*/
-- DropIndex
ALTER TABLE `users` DROP INDEX `users_referralCode_key`;

-- AlterTable
ALTER TABLE `ReferralProgramRefereePackage` ADD COLUMN `packageNameSnapshot` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `ReferralProgramReferrerPackage` ADD COLUMN `packageNameSnapshot` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `ReferralTriggerPackage` ADD COLUMN `packageNameSnapshot` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `users` MODIFY `referralCode` JSON NULL;