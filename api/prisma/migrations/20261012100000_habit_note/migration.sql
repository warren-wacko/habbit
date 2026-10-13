-- CreateTable
CREATE TABLE "HabitNote" (
    "id" SERIAL NOT NULL,
    "habitId" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "HabitNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HabitNote_habitId_date_key" ON "HabitNote"("habitId", "date");

-- AddForeignKey
ALTER TABLE "HabitNote" ADD CONSTRAINT "HabitNote_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "Habit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
