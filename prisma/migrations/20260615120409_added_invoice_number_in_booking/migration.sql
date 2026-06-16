/*
  Warnings:

  - A unique constraint covering the columns `[invoiceNumber]` on the table `Booking` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `booking` ADD COLUMN `invoiceNumber` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Booking_invoiceNumber_key` ON `Booking`(`invoiceNumber`);
