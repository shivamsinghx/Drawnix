/*
  Warnings:

  - You are about to drop the `BoardComment` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[token]` on the table `VerificationToken` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Board" DROP CONSTRAINT "Board_createdBy_fkey";

-- DropForeignKey
ALTER TABLE "BoardComment" DROP CONSTRAINT "BoardComment_boardId_fkey";

-- DropForeignKey
ALTER TABLE "BoardComment" DROP CONSTRAINT "BoardComment_userId_fkey";

-- DropTable
DROP TABLE "BoardComment";

-- CreateTable
CREATE TABLE "BoardContent" (
    "id" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BoardContent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- AddForeignKey
ALTER TABLE "BoardContent" ADD CONSTRAINT "BoardContent_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardContent" ADD CONSTRAINT "BoardContent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
