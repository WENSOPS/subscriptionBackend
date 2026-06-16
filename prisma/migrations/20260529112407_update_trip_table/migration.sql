-- AlterTable
ALTER TABLE `Trip` ADD COLUMN `createdBy` INTEGER NULL,
    MODIFY `assignmentId` VARCHAR(191) NULL;
