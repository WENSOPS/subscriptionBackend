/*
  Warnings:

  - You are about to drop the column `carType` on the `subscription` table. All the data in the column will be lost.
  - You are about to alter the column `verifiedBy` on the `subscription` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.

*/
-- AlterTable
ALTER TABLE `Subscription` DROP COLUMN `carType`,
    ADD COLUMN `vehicleType` VARCHAR(191) NULL,
    MODIFY `verifiedBy` INTEGER NULL;
