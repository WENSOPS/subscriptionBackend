/*
  Warnings:

  - Added the required column `packageName` to the `orders` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `orders` ADD COLUMN `packageName` VARCHAR(191) NOT NULL;
