-- AlterTable
ALTER TABLE "User" ADD COLUMN     "onboardedAt" TIMESTAMP(3);

-- people who already have an account have seen the app: they do not get the tour
UPDATE "User" SET "onboardedAt" = NOW();
