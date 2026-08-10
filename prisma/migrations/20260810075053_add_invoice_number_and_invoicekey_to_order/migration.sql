/*
  Warnings:

  - A unique constraint covering the columns `[invoiceNumber]` on the table `orders` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `orders` ADD COLUMN `invoiceKey` VARCHAR(191) NULL,
    ADD COLUMN `invoiceNumber` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `orders_invoiceNumber_key` ON `orders`(`invoiceNumber`);
