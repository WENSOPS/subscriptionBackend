/*
  Warnings:

  - A unique constraint covering the columns `[cashfreeOrderId]` on the table `Booking` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `booking` ADD COLUMN `cashfreeOrderId` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Booking_cashfreeOrderId_key` ON `Booking`(`cashfreeOrderId`);
