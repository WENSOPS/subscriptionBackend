-- DropIndex
DROP INDEX `Service_title_key` ON `services`;

-- AlterTable
ALTER TABLE `package_services` ADD COLUMN `description` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `packages` MODIFY `sequence` INTEGER NULL;