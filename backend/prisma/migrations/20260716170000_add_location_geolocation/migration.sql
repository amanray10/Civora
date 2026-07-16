-- AlterTable
ALTER TABLE `Complaint`
    ADD COLUMN `latitude` DOUBLE NULL,
    ADD COLUMN `longitude` DOUBLE NULL,
    ADD COLUMN `nearbyFacilities` JSON NULL;
