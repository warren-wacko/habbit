-- CreateTable
CREATE TABLE "HabitSkip" (
    "id" SERIAL NOT NULL,
    "habitId" INTEGER NOT NULL,
    "date" DATE NOT NULL,

    CONSTRAINT "HabitSkip_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HabitSkip_habitId_date_key" ON "HabitSkip"("habitId", "date");

-- AddForeignKey
ALTER TABLE "HabitSkip" ADD CONSTRAINT "HabitSkip_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "Habit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
