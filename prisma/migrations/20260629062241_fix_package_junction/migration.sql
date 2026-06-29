ALTER TABLE `Package` DROP COLUMN `thumbnailUrl`,
    ADD COLUMN `thumbnailUrlKey` VARCHAR(191) NULL;

ALTER TABLE `Service` DROP COLUMN `thumbnailUrl`,
    ADD COLUMN `thumbnailUrlKey` VARCHAR(191) NULL;

CREATE UNIQUE INDEX `Package_name_key` ON `Package`(`name`);
CREATE UNIQUE INDEX `Service_title_key` ON `Service`(`title`);