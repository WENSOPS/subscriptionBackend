-- AlterTable
ALTER TABLE `trip` ADD COLUMN `createdBy` INTEGER NULL,
    MODIFY `assignmentId` VARCHAR(191) NULL;
