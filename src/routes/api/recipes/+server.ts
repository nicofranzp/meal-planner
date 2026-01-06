import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { prisma } from '$lib/server/prisma'
import { getOrCreateDefaultHousehold } from '$lib/server/household'

type RecipeIngredientItemDto = {
	id: string
	ingredientId: string
	quantity: number
	unit: string
	ingredient: {
		id: string
		name: string
		unit: string
	}
}

type RecipeDto = {
	id: string
	householdId: string
	name: string
	description: string | null
	servings: number
	instructions: string
	notes: string | null
	createdAt: string
	updatedAt: string
	ingredients: RecipeIngredientItemDto[]
}

function recipeToDto(recipe: {
	id: string
	householdId: string
	name: string
	description: string | null
	servings: number
	instructions: string
	notes: string | null
	createdAt: Date
	updatedAt: Date
	ingredients: Array<{
		id: string
		ingredientId: string
		quantity: number
		unit: string
		ingredient: { id: string; name: string; unit: string }
	}>
}): RecipeDto {
	return {
		id: recipe.id,
		householdId: recipe.householdId,
		name: recipe.name,
		description: recipe.description,
		servings: recipe.servings,
		instructions: recipe.instructions,
		notes: recipe.notes,
		createdAt: recipe.createdAt.toISOString(),
		updatedAt: recipe.updatedAt.toISOString(),
		ingredients: recipe.ingredients.map((ri) => ({
			id: ri.id,
			ingredientId: ri.ingredientId,
			quantity: ri.quantity,
			unit: ri.unit,
			ingredient: ri.ingredient
		}))
	}
}

export const GET: RequestHandler = async () => {
	const household = await getOrCreateDefaultHousehold()

	const recipes = await prisma.recipe.findMany({
		where: { householdId: household.id },
		select: {
			id: true,
			householdId: true,
			name: true,
			description: true,
			servings: true,
			instructions: true,
			notes: true,
			createdAt: true,
			updatedAt: true,
			ingredients: {
				select: {
					id: true,
					ingredientId: true,
					quantity: true,
					unit: true,
					ingredient: { select: { id: true, name: true, unit: true } }
				},
				orderBy: { ingredient: { name: 'asc' } }
			}
		},
		orderBy: { name: 'asc' }
	})

	return json({ recipes: recipes.map(recipeToDto) })
}

type CreateBody = {
	name?: unknown
	description?: unknown
	servings?: unknown
	instructions?: unknown
	notes?: unknown
	ingredients?: unknown
}

type CreateIngredientBody = {
	ingredientId?: unknown
	quantity?: unknown
	unit?: unknown
}

export const POST: RequestHandler = async ({ request }) => {
	const household = await getOrCreateDefaultHousehold()

	let body: unknown
	try {
		body = await request.json()
	} catch {
		return json({ message: 'Invalid JSON body' }, { status: 400 })
	}

	if (!body || typeof body !== 'object') {
		return json({ message: 'Body must be an object' }, { status: 400 })
	}

	const { name, description, servings, instructions, notes, ingredients } = body as CreateBody

	if (typeof name !== 'string') return json({ message: 'name must be a string' }, { status: 400 })
	if (typeof servings !== 'number' || !Number.isFinite(servings) || servings <= 0) {
		return json({ message: 'servings must be a finite number > 0' }, { status: 400 })
	}
	if (typeof instructions !== 'string') {
		return json({ message: 'instructions must be a string' }, { status: 400 })
	}
	if (description !== undefined && description !== null && typeof description !== 'string') {
		return json({ message: 'description must be a string' }, { status: 400 })
	}
	if (notes !== undefined && notes !== null && typeof notes !== 'string') {
		return json({ message: 'notes must be a string' }, { status: 400 })
	}
	if (!Array.isArray(ingredients)) {
		return json({ message: 'ingredients must be an array' }, { status: 400 })
	}

	const trimmedName = name.trim()
	if (trimmedName.length === 0) return json({ message: 'name cannot be empty' }, { status: 400 })

	const trimmedInstructions = instructions.trim()
	if (trimmedInstructions.length === 0) {
		return json({ message: 'instructions cannot be empty' }, { status: 400 })
	}

	const parsedIngredients = ingredients.map((i) => i as CreateIngredientBody)

	for (const item of parsedIngredients) {
		if (typeof item.ingredientId !== 'string') {
			return json({ message: 'ingredients[].ingredientId must be a string' }, { status: 400 })
		}
		if (typeof item.quantity !== 'number' || !Number.isFinite(item.quantity) || item.quantity <= 0) {
			return json({ message: 'ingredients[].quantity must be a finite number > 0' }, { status: 400 })
		}
		if (item.unit !== undefined && item.unit !== null && typeof item.unit !== 'string') {
			return json({ message: 'ingredients[].unit must be a string' }, { status: 400 })
		}
	}

	const ingredientIds = parsedIngredients.map((i) => i.ingredientId as string)
	const uniqueIngredientIds = new Set(ingredientIds)
	if (uniqueIngredientIds.size !== ingredientIds.length) {
		return json({ message: 'Duplicate ingredientId in ingredients list' }, { status: 400 })
	}

	const ingredientsFound = await prisma.ingredient.findMany({
		where: { id: { in: ingredientIds } },
		select: { id: true, unit: true }
	})
	if (ingredientsFound.length !== ingredientIds.length) {
		return json({ message: 'One or more ingredientId are invalid' }, { status: 400 })
	}
	const unitByIngredientId = new Map(ingredientsFound.map((i) => [i.id, i.unit]))

	const created = await prisma.$transaction(async (tx) => {
		const recipe = await tx.recipe.create({
			data: {
				householdId: household.id,
				name: trimmedName,
				description: description === undefined ? null : description === null ? null : description.trim() || null,
				servings,
				instructions: trimmedInstructions,
				notes: notes === undefined ? null : notes === null ? null : notes.trim() || null
			},
			select: {
				id: true,
				householdId: true,
				name: true,
				description: true,
				servings: true,
				instructions: true,
				notes: true,
				createdAt: true,
				updatedAt: true
			}
		})

		for (const item of parsedIngredients) {
			const ingredientId = item.ingredientId as string
			const quantity = item.quantity as number
			const unit = typeof item.unit === 'string' && item.unit.trim().length > 0 ? item.unit.trim() : unitByIngredientId.get(ingredientId)
			if (!unit) throw new Error('Ingredient unit missing')

			await tx.recipeIngredient.create({
				data: {
					recipeId: recipe.id,
					ingredientId,
					quantity,
					unit
				}
			})
		}

		const full = await tx.recipe.findUniqueOrThrow({
			where: { id: recipe.id },
			select: {
				id: true,
				householdId: true,
				name: true,
				description: true,
				servings: true,
				instructions: true,
				notes: true,
				createdAt: true,
				updatedAt: true,
				ingredients: {
					select: {
						id: true,
						ingredientId: true,
						quantity: true,
						unit: true,
						ingredient: { select: { id: true, name: true, unit: true } }
					},
					orderBy: { ingredient: { name: 'asc' } }
				}
			}
		})

		return full
	})

	return json(recipeToDto(created), { status: 201 })
}
