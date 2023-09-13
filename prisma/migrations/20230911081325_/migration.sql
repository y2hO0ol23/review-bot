/*
  Warnings:

  - Added the required column `scoreGiven` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `scoreRecived` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `user` ADD COLUMN `scoreGiven` DOUBLE NOT NULL,
    ADD COLUMN `scoreRecived` DOUBLE NOT NULL;

-- AddForeignKey
ALTER TABLE `Review` ADD CONSTRAINT `Review_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
