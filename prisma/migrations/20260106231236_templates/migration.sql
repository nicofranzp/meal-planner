/*
  Warnings:

  - You are about to drop the column `periodLengthDays` on the `Template` table. All the data in the column will be lost.
  - You are about to drop the column `allowedTags` on the `TemplateSlot` table. All the data in the column will be lost.
  - You are about to drop the column `dayIndex` on the `TemplateSlot` table. All the data in the column will be lost.
  - Added the required column `durationDays` to the `Template` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Template` table without a default value. This is not possible if the table is not empty.
  - Added the required column `dayNumber` to the `TemplateSlot` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `TemplateSlot` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_MealPlanItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dayId" TEXT NOT NULL,
    "recipeId" TEXT,
    "mealType" TEXT NOT NULL,
    "servings" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MealPlanItem_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "MealPlanDay" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MealPlanItem_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_MealPlanItem" ("createdAt", "dayId", "id", "mealType", "recipeId", "servings", "updatedAt") SELECT "createdAt", "dayId", "id", "mealType", "recipeId", "servings", "updatedAt" FROM "MealPlanItem";
DROP TABLE "MealPlanItem";
ALTER TABLE "new_MealPlanItem" RENAME TO "MealPlanItem";
CREATE INDEX "MealPlanItem_dayId_idx" ON "MealPlanItem"("dayId");
CREATE INDEX "MealPlanItem_recipeId_idx" ON "MealPlanItem"("recipeId");
CREATE TABLE "new_Template" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "householdId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "durationDays" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Template_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Template" ("householdId", "id", "name") SELECT "householdId", "id", "name" FROM "Template";
DROP TABLE "Template";
ALTER TABLE "new_Template" RENAME TO "Template";
CREATE INDEX "Template_householdId_idx" ON "Template"("householdId");
CREATE TABLE "new_TemplateSlot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateId" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "mealType" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TemplateSlot_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_TemplateSlot" ("id", "mealType", "templateId") SELECT "id", "mealType", "templateId" FROM "TemplateSlot";
DROP TABLE "TemplateSlot";
ALTER TABLE "new_TemplateSlot" RENAME TO "TemplateSlot";
CREATE INDEX "TemplateSlot_templateId_idx" ON "TemplateSlot"("templateId");
CREATE UNIQUE INDEX "TemplateSlot_templateId_dayNumber_mealType_key" ON "TemplateSlot"("templateId", "dayNumber", "mealType");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
