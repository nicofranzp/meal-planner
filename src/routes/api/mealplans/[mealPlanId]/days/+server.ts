import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { prisma } from '$lib/server/prisma'
import { getOrCreateDefaultHousehold } from '$lib/server/household'

type MealPlanItemMealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

type DayItemDto = {
	id: string
	dayId: string
	recipeId: string
	mealType: MealPlanItemMealType
	servings: number
	createdAt: string
	updatedAt: string
	recipe: {
		id: string
		name: string
	}
}

type DayDto = {
	id: string
	mealPlanId: string
	date: string
	createdAt: string
	updatedAt: string
	items: DayItemDto[]
}

function isIsoDateOnly(value: string): boolean {
	// Matches the value produced by <input type="date">: YYYY-MM-DD
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
	const d = new Date(`${value}T00:00:00.000Z`)
	return Number.isFinite(d.getTime())
}

async function getMealPlanOr404(mealPlanId: string, householdId: string) {
	return prisma.mealPlan.findFirst({
		where: { id: mealPlanId, householdId },
		select: { id: true }
	})
}

export const GET: RequestHandler = async ({ params }) => {
	const household = await getOrCreateDefaultHousehold()
	const plan = await getMealPlanOr404(params.mealPlanId, household.id)
	if (!plan) return json({ message: 'MealPlan not found' }, { status: 404 })

	const days = await prisma.mealPlanDay.findMany({
		where: { mealPlanId: params.mealPlanId },
		select: {
			id: true,
			mealPlanId: true,
			date: true,
			createdAt: true,
			updatedAt: true,
			items: {
				select: {
					id: true,
					dayId: true,
					recipeId: true,
					mealType: true,
					servings: true,
					createdAt: true,
					updatedAt: true,
					recipe: { select: { id: true, name: true } }
				},
				orderBy: { createdAt: 'asc' }
			}
		},
		orderBy: { date: 'asc' }
	})

	const dto: DayDto[] = days.map((d) => ({
		id: d.id,
		mealPlanId: d.mealPlanId,
		date: d.date,
		createdAt: d.createdAt.toISOString(),
		updatedAt: d.updatedAt.toISOString(),
		items: d.items.map((i) => ({
			id: i.id,
			dayId: i.dayId,
			recipeId: i.recipeId,
			mealType: i.mealType as MealPlanItemMealType,
			servings: i.servings,
			createdAt: i.createdAt.toISOString(),
			updatedAt: i.updatedAt.toISOString(),
			recipe: i.recipe
		}))
	}))

	return json({ mealPlanId: params.mealPlanId, days: dto })
}

type CreateDayBody = {
	date?: unknown
}

export const POST: RequestHandler = async ({ params, request }) => {
	const household = await getOrCreateDefaultHousehold()
	const plan = await getMealPlanOr404(params.mealPlanId, household.id)
	if (!plan) return json({ message: 'MealPlan not found' }, { status: 404 })

	let body: unknown
	try {
		body = await request.json()
	} catch {
		return json({ message: 'Invalid JSON body' }, { status: 400 })
	}

	if (!body || typeof body !== 'object') {
		return json({ message: 'Body must be an object' }, { status: 400 })
	}

	const { date } = body as CreateDayBody
	if (typeof date !== 'string') return json({ message: 'date must be a string' }, { status: 400 })
	const trimmed = date.trim()
	if (trimmed.length === 0) return json({ message: 'date cannot be empty' }, { status: 400 })
	if (!isIsoDateOnly(trimmed)) return json({ message: 'date must be an ISO date (YYYY-MM-DD)' }, { status: 400 })

	const created = await prisma.mealPlanDay.create({
		data: {
			mealPlanId: params.mealPlanId,
			date: trimmed
		},
		select: {
			id: true,
			mealPlanId: true,
			date: true,
			createdAt: true,
			updatedAt: true,
			items: {
				select: {
					id: true,
					dayId: true,
					recipeId: true,
					mealType: true,
					servings: true,
					createdAt: true,
					updatedAt: true,
					recipe: { select: { id: true, name: true } }
				},
				orderBy: { createdAt: 'asc' }
			}
		}
	})

	return json(
		{
			id: created.id,
			mealPlanId: created.mealPlanId,
			date: created.date,
			createdAt: created.createdAt.toISOString(),
			updatedAt: created.updatedAt.toISOString(),
			items: created.items.map((i) => ({
				id: i.id,
				dayId: i.dayId,
				recipeId: i.recipeId,
				mealType: i.mealType as MealPlanItemMealType,
				servings: i.servings,
				createdAt: i.createdAt.toISOString(),
				updatedAt: i.updatedAt.toISOString(),
				recipe: i.recipe
			}))
		},
		{ status: 201 }
	)
}
