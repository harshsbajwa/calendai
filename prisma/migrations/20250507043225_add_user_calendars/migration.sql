-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "userCalendarId" TEXT;

-- CreateTable
CREATE TABLE "UserCalendar" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT 'bg-blue-600',
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserCalendar_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserCalendar_userId_idx" ON "UserCalendar"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserCalendar_userId_name_key" ON "UserCalendar"("userId", "name");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_userCalendarId_fkey" FOREIGN KEY ("userCalendarId") REFERENCES "UserCalendar"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCalendar" ADD CONSTRAINT "UserCalendar_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
