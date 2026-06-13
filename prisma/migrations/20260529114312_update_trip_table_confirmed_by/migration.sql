/*
  Warnings:

  - You are about to alter the column `cancelledBy` on the `trip` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.

*/
-- AlterTable
ALTER TABLE `trip` ADD COLUMN `confirmedBy` INTEGER NULL,
    MODIFY `cancelledBy` INTEGER NULL;
