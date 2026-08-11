-- AlterTable
ALTER TABLE `users` ADD COLUMN `termsAccepted` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `termsAcceptedAt` DATETIME(3) NULL;
