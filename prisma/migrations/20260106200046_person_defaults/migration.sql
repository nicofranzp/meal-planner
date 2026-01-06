-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Person" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "householdId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "portionFactor" REAL NOT NULL DEFAULT 1.0,
    "dislikedIngredientIds" JSONB NOT NULL,
    CONSTRAINT "Person_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Person" ("dislikedIngredientIds", "householdId", "id", "name", "portionFactor") SELECT "dislikedIngredientIds", "householdId", "id", "name", "portionFactor" FROM "Person";
DROP TABLE "Person";
ALTER TABLE "new_Person" RENAME TO "Person";
CREATE INDEX "Person_householdId_idx" ON "Person"("householdId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
