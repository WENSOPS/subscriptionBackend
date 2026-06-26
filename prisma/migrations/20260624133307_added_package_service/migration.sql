/*
  Warnings:

  - You are about to drop the `_packageservices` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `_packageservices` DROP FOREIGN KEY `_PackageServices_A_fkey`;

-- DropForeignKey
ALTER TABLE `_packageservices` DROP FOREIGN KEY `_PackageServices_B_fkey`;

-- DropTable
DROP TABLE `_packageservices`;
