/*
  Warnings:

  - A unique constraint covering the columns `[shareCode]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN "shareCode" TEXT;

-- CreateTable
CREATE TABLE "FriendLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "peerId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FriendLink_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FriendLink_peerId_fkey" FOREIGN KEY ("peerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "FriendLink_ownerId_peerId_key" ON "FriendLink"("ownerId", "peerId");

-- CreateIndex
CREATE UNIQUE INDEX "User_shareCode_key" ON "User"("shareCode");
