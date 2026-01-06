import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { prisma } from '$lib/server/prisma'
import { getOrCreateDefaultHousehold } from '$lib/server/household'

type MealPlanItemMealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

type PatchBody = {
	mealType?: unknown
	servings?: unknown
}

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

async function getItem(mealPlanId: string, dayId: string, itemId: string) {
	return prisma.mealPlanItem.findFirst({
		where: {
			id: itemId,
			dayId,
			day: { id: dayId, mealPlanId }
		},
		select: { id: true }
	})
}

export const PATCH: RequestHandler = async ({ params, request }) => {
	const household = await getOrCreateDefaultHousehold()
	const plan = await assertMealPlanAccess(params.mealPlanId, household.id)
	if (!plan) return json({ message: 'MealPlan not found' }, { status: 404 })

	const day = await assertDayAccess(params.mealPlanId, params.dayId)
	if (!day) return json({ message: 'Day not found' }, { status: 404 })

	const existing = await getItem(params.mealPlanId, params.dayId, params.itemId)
	if (!existing) return json({ message: 'Item not found' }, { status: 404 })

	let body: unknown
	try {
		body = await request.json()
	} catch {
		return json({ message: 'Invalid JSON body' }, { status: 400 })
	}

	if (!body || typeof body !== 'object') {
		return json({ message: 'Body must be an object' }, { status: 400 })
	}

	const { mealType, servings } = body as PatchBody

	const data: { mealType?: MealPlanItemMealType; servings?: number } = {}

	if (mealType !== undefined) {
		if (mealType !== 'breakfast' && mealType !== 'lunch' && mealType !== 'dinner' && mealType !== 'snack') {
			return json({ message: 'mealType must be one of: breakfast, lunch, dinner, snack' }, { status: 400 })
		}
		data.mealType = mealType
	}

	if (servings !== undefined) {
		if (typeof servings !== 'number' || !Number.isFinite(servings) || servings <= 0) {
			return json({ message: 'servings must be a finite number > 0' }, { status: 400 })
		}
		data.servings = servings
	}

	if (Object.keys(data).length === 0) {
		return json({ message: 'No updatable fields provided' }, { status: 400 })
	}

	const updated = await prisma.mealPlanItem.update({
		where: { id: params.itemId },
		data,
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

	return json({
		id: updated.id,
		dayId: updated.dayId,
		recipeId: updated.recipeId,
		mealType: updated.mealType as MealPlanItemMealType,
		servings: updated.servings,
		createdAt: updated.createdAt.toISOString(),
		updatedAt: updated.updatedAt.toISOString(),
		recipe: updated.recipe
	})
}

export const DELETE: RequestHandler = async ({ params }) => {
	const household = await getOrCreateDefaultHousehold()
	const plan = await assertMealPlanAccess(params.mealPlanId, household.id)
	if (!plan) return json({ message: 'MealPlan not found' }, { status: 404 })

	const day = await assertDayAccess(params.mealPlanId, params.dayId)
	if (!day) return json({ message: 'Day not found' }, { status: 404 })

	const existing = await getItem(params.mealPlanId, params.dayId, params.itemId)
	if (!existing) return json({ message: 'Item not found' }, { status: 404 })

	await prisma.mealPlanItem.delete({ where: { id: params.itemId } })
	return json({ ok: true })
}
