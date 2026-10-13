-- AlterTable
ALTER TABLE "Habit" ADD COLUMN     "color" TEXT NOT NULL DEFAULT 'yellow',
ADD COLUMN     "icon" TEXT,
ADD COLUMN     "scheduleDays" INTEGER NOT NULL DEFAULT 127;
