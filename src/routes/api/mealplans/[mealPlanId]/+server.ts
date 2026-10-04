import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { prisma } from '$lib/server/prisma'
import { getOrCreateDefaultHousehold } from '$lib/server/household'

type MealPlanStatus = 'draft' | 'active' | 'completed'

type MealPlanDto = {
	id: string
	name: string
	status: MealPlanStatus
	days: Array<{
		id: string
		date: string
		items: Array<{
			id: string
			dayId: string
			recipeId: string | null
			recipeName: string
			mealType: string
			servings: number | null
		}>
	}>
	items: Array<{
		id: string
		dayId: string
		recipeId: string | null
		recipeName: string
		mealType: string
		servings: number | null
	}>
}

export const GET: RequestHandler = async ({ params }) => {
	const household = await getOrCreateDefaultHousehold()

	const plan = await prisma.mealPlan.findFirst({
		where: { id: params.mealPlanId, householdId: household.id },
		select: {
			id: true,
			name: true,
			status: true,
			days: {
				select: {
					id: true,
					date: true,
					items: {
						select: {
							id: true,
							dayId: true,
							recipeId: true,
							mealType: true,
							servings: true,
							recipe: { select: { name: true } }
						},
						orderBy: { createdAt: 'asc' }
					}
				},
				orderBy: { date: 'asc' }
			}
		}
	})

	if (!plan) return json({ message: 'MealPlan not found' }, { status: 404 })

	const days = plan.days.map((d) => ({
		id: d.id,
		date: d.date,
		items: d.items.map((i) => ({
			id: i.id,
			dayId: i.dayId,
			recipeId: i.recipeId,
			recipeName: i.recipe?.name ?? '(unassigned)',
			mealType: i.mealType,
			servings: i.servings
		}))
	}))

	const items = days.flatMap((d) => d.items)

	const dto: MealPlanDto = {
		id: plan.id,
		name: plan.name,
		status: plan.status,
		days,
		items
	}

	return json(dto)
}
