-- AlterTable
ALTER TABLE `booking` MODIFY `status` ENUM('initiated', 'pending', 'active', 'cancelled', 'completed') NOT NULL DEFAULT 'initiated';
