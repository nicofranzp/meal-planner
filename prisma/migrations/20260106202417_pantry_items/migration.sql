/*
  Warnings:

  - The primary key for the `PantryItem` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The required column `id` was added to the `PantryItem` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Added the required column `updatedAt` to the `PantryItem` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PantryItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "householdId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "availability" TEXT NOT NULL DEFAULT 'HAVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PantryItem_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PantryItem_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_PantryItem" ("availability", "householdId", "ingredientId") SELECT "availability", "householdId", "ingredientId" FROM "PantryItem";
DROP TABLE "PantryItem";
ALTER TABLE "new_PantryItem" RENAME TO "PantryItem";
CREATE INDEX "PantryItem_householdId_idx" ON "PantryItem"("householdId");
CREATE INDEX "PantryItem_ingredientId_idx" ON "PantryItem"("ingredientId");
CREATE UNIQUE INDEX "PantryItem_householdId_ingredientId_key" ON "PantryItem"("householdId", "ingredientId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
