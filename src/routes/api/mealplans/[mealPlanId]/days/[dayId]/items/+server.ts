import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { prisma } from '$lib/server/prisma'
import { getOrCreateDefaultHousehold } from '$lib/server/household'

type MealPlanItemMealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

async function assertMealPlanAccess(mealPlanId: string, householdId: string) {
	return prisma.mealPlan.findFirst({
		where: { id: mealPlanId, householdId },
		select: { id: true }
	})
}

async function assertDayAccess(mealPlanId: string, dayId: string) {
	return prisma.mealPlanDay.findFirst({
		where: { id: dayId, mealPlanId },
		select: { id: true }
	})
}

type CreateItemBody = {
	recipeId?: unknown
	mealType?: unknown
	servings?: unknown
}

export const POST: RequestHandler = async ({ params, request }) => {
	const household = await getOrCreateDefaultHousehold()
	const plan = await assertMealPlanAccess(params.mealPlanId, household.id)
	if (!plan) return json({ message: 'MealPlan not found' }, { status: 404 })

	const day = await assertDayAccess(params.mealPlanId, params.dayId)
	if (!day) return json({ message: 'Day not found' }, { status: 404 })

	let body: unknown
	try {
		body = await request.json()
	} catch {
		return json({ message: 'Invalid JSON body' }, { status: 400 })
	}

	if (!body || typeof body !== 'object') {
		return json({ message: 'Body must be an object' }, { status: 400 })
	}

	const { recipeId, mealType, servings } = body as CreateItemBody
	if (typeof recipeId !== 'string') return json({ message: 'recipeId must be a string' }, { status: 400 })
	if (mealType !== 'breakfast' && mealType !== 'lunch' && mealType !== 'dinner' && mealType !== 'snack') {
		return json({ message: 'mealType must be one of: breakfast, lunch, dinner, snack' }, { status: 400 })
	}
	if (typeof servings !== 'number' || !Number.isFinite(servings) || servings <= 0) {
		return json({ message: 'servings must be a finite number > 0' }, { status: 400 })
	}

	const recipe = await prisma.recipe.findFirst({
		where: { id: recipeId, householdId: household.id },
		select: { id: true, name: true }
	})
	if (!recipe) return json({ message: 'Recipe not found' }, { status: 404 })

	const created = await prisma.mealPlanItem.create({
		data: {
			dayId: params.dayId,
			recipeId: recipeId,
			mealType,
			servings
		},
		select: {
			id: true,
			dayId: true,
			recipeId: true,
			mealType: true,
			servings: true,
			createdAt: true,
			updatedAt: true,
			recipe: { select: { id: true, name: true } }
		}
	})

	return json(
		{
			id: created.id,
			dayId: created.dayId,
			recipeId: created.recipeId,
			mealType: created.mealType as MealPlanItemMealType,
			servings: created.servings,
			createdAt: created.createdAt.toISOString(),
			updatedAt: created.updatedAt.toISOString(),
			recipe: created.recipe
		},
		{ status: 201 }
	)
}
