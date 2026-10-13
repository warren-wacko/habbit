-- AlterTable
ALTER TABLE "Habit" ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "timeOfDay" TEXT NOT NULL DEFAULT 'anytime';
