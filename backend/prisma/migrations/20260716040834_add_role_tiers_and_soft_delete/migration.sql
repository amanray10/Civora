-- AlterTable
ALTER TABLE `user` ADD COLUMN `deletedAt` DATETIME(3) NULL,
    ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT true,
    MODIFY `role` ENUM('citizen', 'department', 'admin', 'superadmin') NOT NULL DEFAULT 'citizen';

-- DataMigration: promote existing global admins to superadmin (the `admin` role is repurposed as department-scoped)
UPDATE `user` SET `role` = 'superadmin' WHERE `role` = 'admin';
