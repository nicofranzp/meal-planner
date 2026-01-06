import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { prisma } from '$lib/server/prisma'
import { getOrCreateDefaultHousehold } from '$lib/server/household'

type ReplaceBody = {
	ingredients?: unknown
}

type ReplaceIngredientBody = {
	ingredientId?: unknown
	quantity?: unknown
	unit?: unknown
}

export const PATCH: RequestHandler = async ({ params, request }) => {
	const household = await getOrCreateDefaultHousehold()

	const recipe = await prisma.recipe.findFirst({
		where: { id: params.id, householdId: household.id },
		select: { id: true }
	})
	if (!recipe) return json({ message: 'Recipe not found' }, { status: 404 })

	let body: unknown
	try {
		body = await request.json()
	} catch {
		return json({ message: 'Invalid JSON body' }, { status: 400 })
	}

	if (!body || typeof body !== 'object') {
		return json({ message: 'Body must be an object' }, { status: 400 })
	}

	const { ingredients } = body as ReplaceBody
	if (!Array.isArray(ingredients)) {
		return json({ message: 'ingredients must be an array' }, { status: 400 })
	}

	const parsedIngredients = ingredients.map((i) => i as ReplaceIngredientBody)
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

	const updated = await prisma.$transaction(async (tx) => {
		await tx.recipeIngredient.deleteMany({ where: { recipeId: recipe.id } })

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

	return json({
		id: updated.id,
		name: updated.name,
		description: updated.description,
		servings: updated.servings,
		instructions: updated.instructions,
		notes: updated.notes,
		createdAt: updated.createdAt.toISOString(),
		updatedAt: updated.updatedAt.toISOString(),
		ingredients: updated.ingredients.map((ri) => ({
			id: ri.id,
			ingredientId: ri.ingredientId,
			quantity: ri.quantity,
			unit: ri.unit,
			ingredient: ri.ingredient
		}))
	})
}
