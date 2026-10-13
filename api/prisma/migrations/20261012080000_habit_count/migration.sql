-- AlterTable
ALTER TABLE "Habit" ADD COLUMN     "target" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "unit" TEXT;

-- CreateTable
CREATE TABLE "HabitProgress" (
    "id" SERIAL NOT NULL,
    "habitId" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "amount" INTEGER NOT NULL,
    "target" INTEGER NOT NULL,

    CONSTRAINT "HabitProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HabitProgress_habitId_date_key" ON "HabitProgress"("habitId", "date");

-- AddForeignKey
ALTER TABLE "HabitProgress" ADD CONSTRAINT "HabitProgress_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "Habit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
