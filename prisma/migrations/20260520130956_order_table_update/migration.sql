/*
  Warnings:

  - A unique constraint covering the columns `[cashfreeOrderId]` on the table `Order` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `Order_cashfreeOrderId_key` ON `Order`(`cashfreeOrderId`);
