/*
  Warnings:

  - You are about to alter the column `packageId` on the `bookings` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.

*/
-- AlterTable
ALTER TABLE `bookings` MODIFY `packageId` INTEGER NOT NULL;
