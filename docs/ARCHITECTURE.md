# Meal Planning App — Architecture Overview

_Last updated: now_

This document describes the current architecture of the Meal Planning App, what has been implemented, what remains, and how the system fits together across UI, API, and data models.

## 1. High-Level System Overview

The app is a No-AI MVP Meal Planning System, built with:

- SvelteKit + Svelte 5 Runes
- Node.js + REST API
- Prisma ORM + SQLite
- A single default household
- AI folder structure exists, but AI logic is disabled

The system currently supports:

- Household
- People
- Ingredients
- Pantry
- Recipes
- MealPlans with Days and Items

## 2. Implemented Domains (Fully Functional)

### Household

- Auto-seeded default household
- All entities scoped to this household

### People

- Name
- Portion factor
- dislikedIngredientIds stored (UI editing pending)

### Ingredients

- Ingredient model with unit support
- Unique name validation (UI + API)

### Pantry

- PantryItem model
- Three availability levels
- CRUD implemented
- Ingredient enrichment via joins

### Recipes (Hybrid Model)

- Structured ingredient list
- Free-text instructions and notes
- Servings support
- RecipeIngredient relational table
- Full CRUD implemented
- Detail page with rendered instructions

### Meal Plans

- MealPlan, MealPlanDay, MealPlanItem all implemented
- Nested REST API:
  - /api/mealplans
  - /api/mealplans/[mealPlanId]
  - /api/mealplans/[mealPlanId]/days
  - /api/mealplans/[mealPlanId]/days/[dayId]/items
- UI pages:
  - List
  - Detail (days, items, flattened items)
  - Human-friendly date formatting
  - Weekly grid (UI-only)

## 3. Not Yet Implemented (Future Phases)

### Template System

- Templates
- TemplateSlots
- Weekly/biweekly pattern modeling

### Automated Meal Planning

- Recipe selection logic
- Serving calculations
- Repetition avoidance
- Slot-by-slot deterministic planning

### Shopping List

- Ingredient aggregation
- Unit conversion
- Pantry deduction
- Export (PDF / WhatsApp)

### Person Dietary Preferences

- UI for dislikedIngredientIds
- Filters during planning

### Pantry Integration With Planning

- Planner does not check pantry stock
- Pantry is informational only

### AI Logic (Phase 2)

- AI stubs exist but return deterministic null
- No ranking, suggestions, or explanations

## 4. Project Structure Overview

The following shows the key folders in the project:

    src/
      lib/
        db/
          household.ts
      routes/
        api/
          people/
          ingredients/
          pantry/
          recipes/
          mealplans/
            [mealPlanId]/
              days/
                ...
        people/
        ingredients/
        pantry/
        recipes/
        mealplans/
          [mealPlanId]/
      ai/
        config.ts
        future modules (disabled)
    prisma/
      schema.prisma
      migrations/

## 5. Data Model Overview

### Fully Implemented Models

- Household
- Person
- Ingredient
- PantryItem
- Recipe
- RecipeIngredient
- MealPlan
- MealPlanDay
- MealPlanItem

### Not Implemented Yet

- Template
- TemplateSlot
- Guest
- ShoppingList
- RecipeCategory

## 6. Business Rules Implemented

- Deterministic CRUD behavior
- Hybrid structured + free-text recipes
- Unique ingredient names enforced
- Portion factor stored for each person
- Pantry availability tracked
- MealPlans support Days + Items
- UI pages render all entities correctly
- Svelte 5 Runes used everywhere

## 7. Business Rules Missing

- No serving scaling logic
- No household portion adjustment
- No meal repetition rules
- No weekly/biweekly template logic
- No shopping list generation
- No pantry-based ingredient deduction
- No AI-driven ranking or selection

## 8. REST API Status

| Domain | API | UI | Status |
|--------|------|------|--------|
| Household | implicit | yes | done |
| People | CRUD | yes | done |
| Ingredients | GET/POST | yes | done |
| Pantry | GET/POST/PATCH | yes | done |
| Recipes | CRUD | yes | done |
| Meal Plans | CRUD | yes | done |
| MealPlanDay | CRUD | yes | done |
| MealPlanItem | CRUD | yes | done |
| Templates | no | no | pending |
| Shopping List | no | no | pending |
| AI | stub only | no | pending |

## 9. UI Status

All UI pages use Svelte 5 Runes:

- $state
- $effect
- $derived.by

No legacy $: syntax.

Implemented UI pages:

- People
- Ingredients
- Pantry
- Recipes (list, detail, editor)
- MealPlans (list, detail)
- Weekly grid (basic placeholder)

## 10. Architecture Status Assessment

The project is at the correct pivot point:

- CRUD foundation is complete
- MealPlan engine is functional
- Data model is complete for Phase 1
- System is ready for smart logic (templates, scaling, shopping list, AI)

This is the intended stopping point before implementing advanced features.

## 11. Recommended Next Steps

### Step 1 — Template System

- Template model
- TemplateSlot model
- Template CRUD pages
- Template → MealPlan generation (deterministic)

### Step 2 — Serving Calculation Engine

- Based on Person portionFactor
- Guest handling
- Meal-type scaling rules

### Step 3 — Shopping List Engine

- Aggregate recipe ingredients
- Apply scaling
- Apply pantry subtraction
- Produce final list for week / biweekly

### Step 4 — Optional AI Logic

- Recipe ranking
- Suggested alternatives
- Natural-language explanations

## 12. Conclusion

The current system is stable, consistent, and extensible.
You are ready for Phase 2: Templates → Shopping List → AI.
