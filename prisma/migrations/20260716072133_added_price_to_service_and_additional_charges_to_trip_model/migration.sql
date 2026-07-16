-- AlterTable
ALTER TABLE `services` ADD COLUMN `price` DOUBLE NOT NULL DEFAULT 100;

-- AlterTable
ALTER TABLE `trips` ADD COLUMN `additionalAmount` DOUBLE NOT NULL DEFAULT 0;
