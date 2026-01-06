# Templates — Specification & Architecture

_Last updated: now_

This document defines the **Template System** for the Meal Planning App.
Templates allow users to define a weekly or biweekly meal pattern (e.g., “Dinner every night”, “Lunch only on weekdays”), and later generate a **Meal Plan skeleton** automatically.

This is a **No-AI deterministic** phase.
AI assistance comes later.

---

## 1. Purpose of Templates

A Template represents a **time structure** that tells the system:

- How long the plan should be (7 days, 14 days, custom)
- What **meal types** should appear on each day
- Optional notes/constraints (future expansion)

Templates enable:

- One-click generation of a MealPlan skeleton
- Reusable planning patterns
- Consistent weekly structure for families
- Reducing daily cognitive load

---

## 2. Domain Concepts

### Template
A reusable blueprint for creating MealPlans.

### TemplateSlot
Defines one scheduled meal (e.g., “Dinner on Day 3”).

TemplateSlot does **not** specify any recipe.
It only defines *that a meal should exist in that position*.

---

## 3. Template Data Model

### Template fields

- id (cuid)
- householdId (FK → Household)
- name (string)
- description (string?, optional)
- durationDays (int, required — ex: 7, 14)
- createdAt (datetime)
- updatedAt (datetime)

### TemplateSlot fields

- id (cuid)
- templateId (FK → Template)
- dayNumber (int, 1…durationDays)
- mealType (enum MealType)
- notes (string?, optional)
- createdAt
- updatedAt

### Relationships

- Template has many TemplateSlots
- TemplateSlot belongs to Template
- Template belongs to Household

---

## 4. Template → MealPlan Generation (Deterministic)

Given a Template and **startDate**, the app will:

1. Create a new MealPlan with:
   - name
   - status = "draft"
   - startDate
   - endDate = startDate + durationDays − 1

2. Generate MealPlanDay objects (1 per day).

3. Generate MealPlanItem placeholders:
   - mealType from templateSlot.mealType
   - recipeId = null
   - servings = null

Result:
A MealPlan skeleton containing all scheduled meals with no recipes assigned.

---

## 5. API Requirements

### /api/templates

#### GET
Returns all templates for the household.

#### POST
Creates a template.
Body:
- name
- description?
- durationDays

---

### /api/templates/[templateId]

#### GET
Returns:
- template
- templateSlots[]

#### PATCH
Updates name, description, durationDays.

#### DELETE
Deletes template + all slots.

---

### /api/templates/[templateId]/slots

#### POST
Creates a TemplateSlot.
Body:
- dayNumber
- mealType
- notes?

---

### /api/templates/[templateId]/slots/[slotId]

#### PATCH
Updates a slot.

#### DELETE
Deletes a slot.

---

## 6. UI Requirements (Svelte 5)

### Templates List Page

- Lists templates with:
  - Name
  - Duration (N days)
- Button: “Add Template”
- Each template is clickable → detail page

---

### Template Detail Page

Sections:

1. Template metadata
   - Name
   - Description
   - Duration

2. Slot list (grouped by day)
   - Show mealType + notes
   - Edit/delete buttons

3. Add slot form
   - dayNumber input
   - mealType select
   - notes (optional)

4. Generate MealPlan button
   - Navigates to generation screen

---

### MealPlan Generation Form

Fields:
- MealPlan name
- Start date (date picker)

Actions:
- “Generate” → creates the skeleton
- Redirect to MealPlan detail page

---

## 7. Validation Rules

### Template

- name required
- durationDays ≥ 1
- On durationDays update:
  - All slots must satisfy dayNumber ≤ durationDays

### TemplateSlot

- dayNumber must be:
  - 1 ≤ dayNumber ≤ durationDays
- mealType valid
- Only **one slot per (dayNumber, mealType)**

---

## 8. Out of Scope (Phase 2)

Deferred features:

- AI-driven recipe suggestions
- Avoid dislikedIngredientIds
- Pantry-based auto filling
- Nutritional constraints
- Rotation / repetition rules
- Recipe frequency limits

---

## 9. Summary

Templates allow users to:

- Define reusable weekly/biweekly scheduling patterns
- Generate MealPlan structures instantly
- Maintain consistency
- Reduce planning effort
- Build a foundation for AI automation later

This is the correct step after MealPlans.

---