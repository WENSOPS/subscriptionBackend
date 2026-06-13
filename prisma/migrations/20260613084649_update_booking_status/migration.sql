-- AlterTable
ALTER TABLE `booking` MODIFY `status` ENUM('initiated', 'pending', 'active', 'cancelled', 'completed', 'failed') NOT NULL DEFAULT 'initiated';
