-- AlterTable
ALTER TABLE `Booking` MODIFY `status` ENUM('initiated', 'pending', 'active', 'cancelled', 'completed') NOT NULL DEFAULT 'initiated';
