-- AlterTable
ALTER TABLE `review` MODIFY `like` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `user` MODIFY `scoreGiven` DOUBLE NOT NULL DEFAULT 0,
    MODIFY `scoreRecived` DOUBLE NOT NULL DEFAULT 0;