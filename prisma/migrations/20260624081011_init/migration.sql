/*
  Warnings:

  - You are about to drop the column `thumbnailUrl` on the `package` table. All the data in the column will be lost.
  - You are about to drop the column `thumbnailUrl` on the `service` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[name]` on the table `Package` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[title]` on the table `Service` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `package` DROP COLUMN `thumbnailUrl`,
    ADD COLUMN `thumbnailUrlKey` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `service` DROP COLUMN `thumbnailUrl`,
    ADD COLUMN `thumbnailUrlKey` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Package_name_key` ON `Package`(`name`);

-- CreateIndex
CREATE UNIQUE INDEX `Service_title_key` ON `Service`(`title`);
