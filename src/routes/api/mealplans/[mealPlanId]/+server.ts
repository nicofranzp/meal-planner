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
}

export const GET: RequestHandler = async ({ params }) => {
	const household = await getOrCreateDefaultHousehold()

	const plan = await prisma.mealPlan.findFirst({
		where: { id: params.mealPlanId, householdId: household.id },
		select: {
			id: true,
			householdId: true,
			name: true,
			status: true,
			createdAt: true,
			updatedAt: true
		}
	})

	if (!plan) return json({ message: 'MealPlan not found' }, { status: 404 })

	const dto: MealPlanDto = {
		id: plan.id,
		householdId: plan.householdId,
		name: plan.name,
		status: plan.status,
		createdAt: plan.createdAt.toISOString(),
		updatedAt: plan.updatedAt.toISOString()
	}

	return json(dto)
}
