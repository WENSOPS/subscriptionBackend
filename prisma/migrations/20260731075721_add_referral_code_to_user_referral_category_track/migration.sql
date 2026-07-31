/*
  Warnings:

  - A unique constraint covering the columns `[referralCode]` on the table `user_referral_category_track` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `referralCode` to the `user_referral_category_track` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `user_referral_category_track` ADD COLUMN `referralCode` VARCHAR(191) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `user_referral_category_track_referralCode_key` ON `user_referral_category_track`(`referralCode`);
