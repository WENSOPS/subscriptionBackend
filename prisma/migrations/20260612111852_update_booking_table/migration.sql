/*
  Warnings:

  - You are about to drop the column `expiryDate` on the `booking` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `Booking` DROP COLUMN `expiryDate`,
    ADD COLUMN `validity` VARCHAR(191) NULL;
