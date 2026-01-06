# COPILOT_INSTRUCTIONS.md

## Meal Planning App — No-AI MVP (AI-Ready Architecture, Svelte 5)

---

## Purpose

This document instructs GitHub Copilot to generate code for a meal planning application using **Svelte 5 (Runes)** and a **No-AI MVP architecture**.

Copilot must behave like a disciplined junior engineer and must not invent features, logic, or architecture.

---

## 1. Global constraints (READ FIRST)

Copilot MUST:

- Build a No-AI MVP
- Use TypeScript everywhere
- Use Svelte 5 with Runes
- Use deterministic, rule-based logic
- Keep the architecture AI-ready but AI-disabled
- Prefer clarity and simplicity over abstraction

Copilot MUST NOT:

- Use Svelte 3 or Svelte 4 syntax
- Use `$:` reactive statements
- Use legacy stores (`writable`, `readable`) by default
- Add OpenAI, LLM, or ML calls
- Add nutrition, calories, prices, or budget optimization
- Add complex authentication
- Store pantry quantities

---

## 2. Tech stack (MANDATORY)

### Frontend

- Svelte 5
- Runes API:
  - `$state`
  - `$derived`
  - `$effect`
- TypeScript
- SvelteKit routing
- TailwindCSS
- Native HTML elements only

Copilot MUST NOT:

- Use `export let`
- Use `$:` reactive blocks
- Use class-based components
- Use component libraries (MUI, Shadcn, etc.)

---

### Backend

- Node.js
- TypeScript
- REST API
- Prisma ORM
- PostgreSQL-compatible database

---

## 3. Svelte 5 coding rules

### State management

Use `$state`:

~~~ts
let mealPlan = $state<MealPlan | null>(null)
~~~

Derived state:

~~~ts
let totalServings = $derived(
  persons.reduce((sum, p) => sum + p.portionFactor, 0)
)
~~~

Side effects:

~~~ts
$effect(() => {
  if (mealPlan) {
    console.log("MealPlan updated")
  }
})
~~~

Copilot MUST NOT:

- Use `$:` reactive syntax
- Use Svelte stores unless explicitly requested
- Use `onMount` unless unavoidable

---

### Props

Props must be destructured explicitly:

~~~ts
let { recipe, onSelect } = $props<{
  recipe: Recipe
  onSelect: (id: string) => void
}>()
~~~

---

## 4. Domain model (SOURCE OF TRUTH)

### Household

~~~ts
Household {
  id: string
  name: string
}
~~~

---

### Person

~~~ts
Person {
  id: string
  householdId: string
  name: string
  portionFactor: number
  dislikedIngredientIds: string[]
}
~~~

- Portion factor is a float
- No kid/adult categories

---

### Ingredient

~~~ts
Ingredient {
  id: string
  name: string
  category: string
}
~~~

---

### Recipe

~~~ts
Recipe {
  id: string
  householdId: string
  name: string
  baseServings: number
  tags: string[]
  steps: string
}
~~~

---

### RecipeIngredient

~~~ts
RecipeIngredient {
  recipeId: string
  ingredientId: string
  quantity: number
  unit: string
}
~~~

- Quantities correspond to baseServings
- Units are display-only

---

### Template

~~~ts
Template {
  id: string
  householdId: string
  name: string
  periodLengthDays: number
}
~~~

---

### TemplateSlot

~~~ts
TemplateSlot {
  id: string
  templateId: string
  dayIndex: number
  mealType: "breakfast" | "lunch" | "dinner"
  allowedTags: string[]
}
~~~

---

### MealPlan

~~~ts
MealPlan {
  id: string
  householdId: string
  templateId?: string
  startDate: string
  endDate: string
  status: "draft" | "active" | "completed"
}
~~~

---

### Meal

~~~ts
Meal {
  id: string
  mealPlanId: string
  date: string
  mealType: "breakfast" | "lunch" | "dinner"
  recipeId?: string
  servings: number
  locked: boolean
  notes?: string
}
~~~

---

### Guest

~~~ts
Guest {
  mealId: string
  portionFactor: number
}
~~~

---

### PantryItem

~~~ts
PantryItem {
  householdId: string
  ingredientId: string
  availability: "none" | "low" | "medium" | "high" | "unknown"
}
~~~

Pantry items never store quantities.

---

## 5. Core business rules

### Servings calculation

~~~ts
servings =
  sum(person.portionFactor)
+ sum(guest.portionFactor)
~~~

---

### Recipe scaling

~~~ts
scaledQuantity =
  recipeIngredient.quantity
* (meal.servings / recipe.baseServings)
~~~

---

## 6. Template to MealPlan generation (NO AI)

Use deterministic logic only:

1. Iterate template slots in order
2. Filter recipes by allowedTags
3. Avoid consecutive repetition
4. Pick the first valid recipe
5. Leave slot empty if no match

No scoring, ranking, or ML.

---

## 7. Pantry behavior

- Pantry updates are explicit only
- No decay
- No inference
- No automatic changes

---

## 8. Shopping list behavior

Shopping list is:

- Derived
- Not persisted
- Recomputed on demand

Item shape:

~~~ts
{
  ingredientId: string
  name: string
  totalQuantity: number
  unit: string
  pantryOffset: "none" | "partial" | "full"
}
~~~

---

## 9. AI package (STUB ONLY)

Copilot must generate:

~~~text
src/ai/
  config.ts
  types.ts
  context/
  ranking/
  generation/
  explain/
  guards/
  stubs/
~~~

AI must be hard-disabled:

~~~ts
export const AI_CONFIG = {
  enabled: false
}
~~~

All AI functions return deterministic stub values.

---

## 10. Final rule

If a feature is not explicitly defined here:

Leave a TODO or ask the developer.

Copilot must never assume product behavior.

---

## FEATURE: Ingredient

Implement the Ingredient entity.

### Domain rules

- Ingredient is global (not household-specific)
- One canonical ingredient list for the entire app
- Ingredient names must be unique (case-insensitive)

### Ingredient fields

- id: string (cuid, primary key)
- name: string (required)
- unit: string (required, e.g. g, ml, unit)
- createdAt
- updatedAt

### MVP API

- GET /api/ingredients → list all ingredients
- POST /api/ingredients → create ingredient

### MVP UI

- List all ingredients
- Form to add ingredient:
  - name (text)
  - unit (text)
- Prevent duplicate names
- Persist across reloads

### Tech constraints

- SvelteKit
- Svelte 5 runes
- Prisma + SQLite
- Prisma Client only (no raw SQL)

---

## FEATURE: Pantry (Household Inventory)

Implement the household Pantry and PantryItem features.

### Domain rules

- Each Household has exactly one Pantry.
- A Pantry stores PantryItems.
- A PantryItem links:
  - householdId
  - ingredientId
  - availability
- Ingredient remains global.
- Availability is coarse (no quantities yet).

### PantryItem fields

- id: string (cuid, primary key)
- householdId: string (FK to Household)
- ingredientId: string (FK to Ingredient)
- availability: enum PantryAvailability (HAVE | LOW | OUT)
- createdAt
- updatedAt

### Enum

Create enum `PantryAvailability`:

- HAVE
- LOW
- OUT

### API Requirements

Create REST API endpoints under `/api/pantry`:

1. **GET /api/pantry**
   - Returns all PantryItems for the current household
   - Includes Ingredient info

2. **POST /api/pantry**
   - Creates a PantryItem for the current household
   - Body: ingredientId, availability (default HAVE)
   - Prevent duplicate ingredient entries in pantry

3. **PATCH /api/pantry/:id**
   - Up

---

## FEATURE: Recipe (Hybrid Model)

Implement the Recipe feature using a hybrid structured + free-text design.

### Domain Rules

- Recipes belong to the Household (each household manages its own recipes).
- A Recipe contains:
  - Structured, machine-actionable ingredient list
  - Free-text instructions
  - Optional free-text notes
- Recipe servings determine how quantities scale for households of different sizes.

### Recipe fields

- id: string (cuid, primary key)
- householdId: string (FK → Household)
- name: string
- description: string? (optional short description)
- servings: number (base servings for the recipe)
- instructions: string (free-text, markdown allowed)
- notes: string? (free-text, optional)
- createdAt
- updatedAt

### RecipeIngredient fields

- id: string (cuid, primary key)
- recipeId: string (FK → Recipe)
- ingredientId: string (FK → Ingredient)
- quantity: number (required; float)
- unit: string (optional; defaults to Ingredient.unit if not provided)
- createdAt
- updatedAt

### Relationships

- Recipe has many RecipeIngredients
- RecipeIngredient belongs to Ingredient
- Recipe belongs to Household

### API Requirements (REST)

Create endpoints under `/api/recipes`:

1. **GET /api/recipes**
   - Returns all recipes for the current household
   - Include recipeIngredients with Ingredient info

2. **POST /api/recipes**
   - Create a recipe
   - Body:
     - name (required)
     - description (optional)
     - servings (required)
     - instructions (required)
     - notes (optional)
     - ingredients: array of `{ ingredientId, quantity, unit? }`

3. **GET /api/recipes/:id**
   - Returns a single recipe with full ingredient list

4. **PATCH /api/recipes/:id**
   - Updates recipe fields (name, description, servings, instructions, notes)

5. **PATCH /api/recipes/:id/ingredients**
   - Replaces the full ingredient list for the recipe
   - Prevent duplicates
   - Enforces ingredientId validity

6. **DELETE /api/recipes/:id**
   - Deletes the recipe
   - Cascades to RecipeIngredients

### UI Requirements (SvelteKit)

Add a “Recipes” page with:

#### Recipe List

- List all recipes
- Each item: name + servings + small description
- Button: “Add Recipe”
- Click on a recipe → open detail page

#### Recipe Form (Create/Edit)

Fields:

- name (text)
- description (optional)
- servings (number)
- instructions (textarea or markdown input)
- notes (optional textarea)
- Ingredient list editor:
  - Add ingredient row: select ingredient + quantity + unit
  - Remove ingredient row
  - Persist all via POST/PATCH

#### Recipe Detail Page

- Name, description, servings
- Instructions (rendered as text)
- Notes
- Ingredient list with quantities and units
- Buttons:
  - “Edit”
  - “Delete”
  - “Scale servings” (UI only, optional for MVP)

### Technical Requirements

- Use Prisma + SQLite
- Cascade deletes (Recipe → RecipeIngredients)
- Use Svelte 5 runes throughout
- Keep API + UI consistent with Household, Person, Ingredient, and Pantry features
- No AI logic yet (this will come later after Meal Plans)

---

## FEATURE: MealPlans (MVP)

Implement a minimal MealPlans feature.

### Domain Rules

- MealPlans belong to the Household.
- A MealPlan has a `name` and a `status`.
- MealPlan items/days are not implemented yet.

### API Requirements (REST)

Create endpoints under `/api/mealplans`:

1. **GET /api/mealplans**
  - Returns all meal plans for the current household.

2. **POST /api/mealplans**
  - Creates a new meal plan.
  - Body: `{ name, status }`
  - Response includes `items: []` (empty for now).

### UI Requirements (SvelteKit)

Add a “Meal Plans” page:

- `src/routes/mealplans/+page.svelte`
- Form: create meal plan (name + status select).
- List: show meal plan name + status.

### Technical Requirements

- Use Prisma + SQLite.
- Reuse the default household helper.
- Prepare code structure for MealPlanDay but do not implement it.

