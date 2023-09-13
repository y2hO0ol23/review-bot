/*
  Warnings:

  - You are about to drop the column `scoreGiven` on the `user` table. All the data in the column will be lost.
  - You are about to drop the column `scoreRecived` on the `user` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `user` DROP COLUMN `scoreGiven`,
    DROP COLUMN `scoreRecived`;
