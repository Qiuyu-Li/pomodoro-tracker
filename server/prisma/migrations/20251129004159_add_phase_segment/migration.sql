-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "phase" TEXT NOT NULL DEFAULT 'focus',
    "sourceSegmentId" TEXT,
    "goal" TEXT,
    "project" TEXT,
    "durationMin" INTEGER NOT NULL,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME NOT NULL,
    "progress" INTEGER,
    "focusScore" INTEGER,
    "comment" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Session" ("comment", "createdAt", "durationMin", "endTime", "focusScore", "goal", "id", "progress", "project", "startTime", "updatedAt", "userId") SELECT "comment", "createdAt", "durationMin", "endTime", "focusScore", "goal", "id", "progress", "project", "startTime", "updatedAt", "userId" FROM "Session";
DROP TABLE "Session";
ALTER TABLE "new_Session" RENAME TO "Session";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
