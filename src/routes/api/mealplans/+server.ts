import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { prisma } from '$lib/server/prisma'
import { getOrCreateDefaultHousehold } from '$lib/server/household'

type MealPlanStatus = 'draft' | 'active' | 'completed'

type MealPlanDto = {
	id: string
	householdId: string
	name: string
	status: MealPlanStatus
	createdAt: string
	updatedAt: string
	items: []
}

function toDto(plan: {
	id: string
	householdId: string
	name: string
	status: MealPlanStatus
	createdAt: Date
	updatedAt: Date
}): MealPlanDto {
	return {
		id: plan.id,
		householdId: plan.householdId,
		name: plan.name,
		status: plan.status,
		createdAt: plan.createdAt.toISOString(),
		updatedAt: plan.updatedAt.toISOString(),
		items: []
	}
}

export const GET: RequestHandler = async () => {
	const household = await getOrCreateDefaultHousehold()

	const mealPlans = await prisma.mealPlan.findMany({
		where: { householdId: household.id },
		select: {
			id: true,
			householdId: true,
			name: true,
			status: true,
			createdAt: true,
			updatedAt: true
		},
		orderBy: { createdAt: 'desc' }
	})

	return json({ householdId: household.id, mealPlans: mealPlans.map(toDto) })
}

type CreateBody = {
	name?: unknown
	status?: unknown
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

	const { name, status } = body as CreateBody

	if (typeof name !== 'string') return json({ message: 'name must be a string' }, { status: 400 })
	const trimmedName = name.trim()
	if (trimmedName.length === 0) return json({ message: 'name cannot be empty' }, { status: 400 })

	if (status !== 'draft' && status !== 'active' && status !== 'completed') {
		return json({ message: 'status must be one of: draft, active, completed' }, { status: 400 })
	}

	const created = await prisma.mealPlan.create({
		data: {
			householdId: household.id,
			name: trimmedName,
			status
		},
		select: {
			id: true,
			householdId: true,
			name: true,
			status: true,
			createdAt: true,
			updatedAt: true
		}
	})

	return json(toDto(created), { status: 201 })
}
