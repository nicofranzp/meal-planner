import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { prisma } from '$lib/server/prisma'
import { getOrCreateDefaultHousehold } from '$lib/server/household'

async function assertMealPlanAccess(mealPlanId: string, householdId: string) {
	const plan = await prisma.mealPlan.findFirst({
		where: { id: mealPlanId, householdId },
		select: { id: true }
	})
	return plan
}

export const DELETE: RequestHandler = async ({ params }) => {
	const household = await getOrCreateDefaultHousehold()
	const plan = await assertMealPlanAccess(params.mealPlanId, household.id)
	if (!plan) return json({ message: 'MealPlan not found' }, { status: 404 })

	const day = await prisma.mealPlanDay.findFirst({
		where: { id: params.dayId, mealPlanId: params.mealPlanId },
		select: { id: true }
	})
	if (!day) return json({ message: 'Day not found' }, { status: 404 })

	await prisma.mealPlanDay.delete({ where: { id: params.dayId } })
	return json({ ok: true })
}
