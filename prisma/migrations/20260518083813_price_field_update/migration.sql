/*
  Warnings:

  - You are about to drop the column `price` on the `package` table. All the data in the column will be lost.
  - Added the required column `discountedPrice` to the `Package` table without a default value. This is not possible if the table is not empty.
  - Added the required column `regularPrice` to the `Package` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Package` DROP COLUMN `price`,
    ADD COLUMN `discountedPrice` DOUBLE NOT NULL,
    ADD COLUMN `regularPrice` DOUBLE NOT NULL;
