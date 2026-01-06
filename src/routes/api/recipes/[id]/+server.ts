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

async function getRecipeOr404(params: { id: string }, householdId: string) {
	const recipe = await prisma.recipe.findFirst({
		where: { id: params.id, householdId },
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
	return recipe
}

export const GET: RequestHandler = async ({ params }) => {
	const household = await getOrCreateDefaultHousehold()
	const recipe = await getRecipeOr404({ id: params.id }, household.id)
	if (!recipe) return json({ message: 'Recipe not found' }, { status: 404 })
	return json(recipeToDto(recipe))
}

type PatchBody = {
	name?: unknown
	description?: unknown
	servings?: unknown
	instructions?: unknown
	notes?: unknown
}

export const PATCH: RequestHandler = async ({ params, request }) => {
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

	const { name, description, servings, instructions, notes } = body as PatchBody

	const data: {
		name?: string
		description?: string | null
		servings?: number
		instructions?: string
		notes?: string | null
	} = {}

	if (name !== undefined) {
		if (typeof name !== 'string') return json({ message: 'name must be a string' }, { status: 400 })
		const trimmed = name.trim()
		if (trimmed.length === 0) return json({ message: 'name cannot be empty' }, { status: 400 })
		data.name = trimmed
	}

	if (description !== undefined) {
		if (description !== null && typeof description !== 'string') {
			return json({ message: 'description must be a string' }, { status: 400 })
		}
		data.description = description === null ? null : description.trim() || null
	}

	if (servings !== undefined) {
		if (typeof servings !== 'number' || !Number.isFinite(servings) || servings <= 0) {
			return json({ message: 'servings must be a finite number > 0' }, { status: 400 })
		}
		data.servings = servings
	}

	if (instructions !== undefined) {
		if (typeof instructions !== 'string') {
			return json({ message: 'instructions must be a string' }, { status: 400 })
		}
		const trimmed = instructions.trim()
		if (trimmed.length === 0) {
			return json({ message: 'instructions cannot be empty' }, { status: 400 })
		}
		data.instructions = trimmed
	}

	if (notes !== undefined) {
		if (notes !== null && typeof notes !== 'string') {
			return json({ message: 'notes must be a string' }, { status: 400 })
		}
		data.notes = notes === null ? null : notes.trim() || null
	}

	if (Object.keys(data).length === 0) {
		return json({ message: 'No updatable fields provided' }, { status: 400 })
	}

	const existing = await prisma.recipe.findFirst({ where: { id: params.id, householdId: household.id }, select: { id: true } })
	if (!existing) return json({ message: 'Recipe not found' }, { status: 404 })

	const updated = await prisma.recipe.update({
		where: { id: params.id },
		data,
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

	return json(recipeToDto(updated))
}

export const DELETE: RequestHandler = async ({ params }) => {
	const household = await getOrCreateDefaultHousehold()
	const existing = await prisma.recipe.findFirst({ where: { id: params.id, householdId: household.id }, select: { id: true } })
	if (!existing) return json({ message: 'Recipe not found' }, { status: 404 })

	await prisma.recipe.delete({ where: { id: params.id } })
	return json({ ok: true })
}
