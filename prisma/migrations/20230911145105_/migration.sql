/*
  Warnings:

  - You are about to alter the column `score` on the `review` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Double`.

*/
-- AlterTable
ALTER TABLE `review` MODIFY `score` DOUBLE NOT NULL;

-- CreateTable
CREATE TABLE `_like` (
    `A` INTEGER NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_like_AB_unique`(`A`, `B`),
    INDEX `_like_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `_like` ADD CONSTRAINT `_like_A_fkey` FOREIGN KEY (`A`) REFERENCES `Review`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_like` ADD CONSTRAINT `_like_B_fkey` FOREIGN KEY (`B`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
