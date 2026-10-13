-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatarColor" TEXT NOT NULL DEFAULT 'volt',
ADD COLUMN     "avatarIcon" TEXT,
ADD COLUMN     "nickname" TEXT;
