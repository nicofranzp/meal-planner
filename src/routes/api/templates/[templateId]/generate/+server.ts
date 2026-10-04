import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { prisma } from '$lib/server/prisma'
import { getOrCreateDefaultHousehold } from '$lib/server/household'

type TemplateMealType = 'breakfast' | 'lunch' | 'dinner'

type MealPlanItemMealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

type GenerateBody = {
	name?: unknown
	startDate?: unknown
}

function isIsoDateOnly(value: string): boolean {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
	const d = new Date(`${value}T00:00:00.000Z`)
	return Number.isFinite(d.getTime())
}

function addDaysIsoDateOnly(startIso: string, daysToAdd: number): string {
	const d = new Date(`${startIso}T00:00:00.000Z`)
	d.setUTCDate(d.getUTCDate() + daysToAdd)
	const year = d.getUTCFullYear()
	const month = String(d.getUTCMonth() + 1).padStart(2, '0')
	const day = String(d.getUTCDate()).padStart(2, '0')
	return `${year}-${month}-${day}`
}

type MealPlanItemDto = {
	id: string
	dayId: string
	mealType: string
	recipeId: string | null
	servings: number | null
}

type MealPlanDayDto = {
	id: string
	date: string
	items: MealPlanItemDto[]
}

type MealPlanDto = {
	id: string
	name: string
	status: string
	templateId: string | null
	startDate: string
	endDate: string
	days: MealPlanDayDto[]
	items: MealPlanItemDto[]
}

export const POST: RequestHandler = async ({ params, request }) => {
	const household = await getOrCreateDefaultHousehold()

	const template = await prisma.template.findFirst({
		where: { id: params.templateId, householdId: household.id },
		select: {
			id: true,
			householdId: true,
			name: true,
			durationDays: true,
			slots: {
				select: { id: true, dayNumber: true, mealType: true },
				orderBy: [{ dayNumber: 'asc' }, { mealType: 'asc' }]
			}
		}
	})

	if (!template) return json({ message: 'Template not found' }, { status: 404 })

	let body: unknown
	try {
		body = await request.json()
	} catch {
		return json({ message: 'Invalid JSON body' }, { status: 400 })
	}

	if (!body || typeof body !== 'object') {
		return json({ message: 'Body must be an object' }, { status: 400 })
	}

	const { name, startDate } = body as GenerateBody
	if (typeof name !== 'string') return json({ message: 'name must be a string' }, { status: 400 })
	const trimmedName = name.trim()
	if (trimmedName.length === 0) return json({ message: 'name cannot be empty' }, { status: 400 })

	if (typeof startDate !== 'string') return json({ message: 'startDate must be a string' }, { status: 400 })
	const trimmedStart = startDate.trim()
	if (!isIsoDateOnly(trimmedStart)) return json({ message: 'startDate must be YYYY-MM-DD' }, { status: 400 })

	const endDate = addDaysIsoDateOnly(trimmedStart, template.durationDays - 1)

	const created = await prisma.$transaction(async (tx) => {
		const mealPlan = await tx.mealPlan.create({
			data: {
				householdId: template.householdId,
				templateId: template.id,
				name: trimmedName,
				status: 'draft',
				startDate: trimmedStart,
				endDate
			},
			select: {
				id: true,
				name: true,
				status: true,
				templateId: true,
				startDate: true,
				endDate: true
			}
		})

		const dayDates = Array.from({ length: template.durationDays }, (_, i) => addDaysIsoDateOnly(trimmedStart, i))

		await tx.mealPlanDay.createMany({
			data: dayDates.map((date) => ({ mealPlanId: mealPlan.id, date }))
		})

		const days = await tx.mealPlanDay.findMany({
			where: { mealPlanId: mealPlan.id },
			select: { id: true, date: true },
			orderBy: { date: 'asc' }
		})

		const dayIdByDate = new Map(days.map((d) => [d.date, d.id]))

		if (template.slots.length > 0) {
			const itemsToCreate: Array<{
				dayId: string
				mealType: MealPlanItemMealType
				recipeId: null
				servings: null
			}> = []

			for (const slot of template.slots) {
				const date = addDaysIsoDateOnly(trimmedStart, slot.dayNumber - 1)
				const dayId = dayIdByDate.get(date)
				if (!dayId) continue
				itemsToCreate.push({
					dayId,
					mealType: slot.mealType as unknown as MealPlanItemMealType,
					recipeId: null,
					servings: null
				})
			}

			if (itemsToCreate.length > 0) {
				await tx.mealPlanItem.createMany({
					data: itemsToCreate
				})
			}
		}

		const daysWithItems = await tx.mealPlanDay.findMany({
			where: { mealPlanId: mealPlan.id },
			select: {
				id: true,
				date: true,
				items: {
					select: {
						id: true,
						dayId: true,
						recipeId: true,
						mealType: true,
						servings: true
					},
					orderBy: { createdAt: 'asc' }
				}
			},
			orderBy: { date: 'asc' }
		})

		const daysDto: MealPlanDayDto[] = daysWithItems.map((d) => ({
			id: d.id,
			date: d.date,
			items: d.items.map((i) => ({
				id: i.id,
				dayId: i.dayId,
				mealType: i.mealType,
				recipeId: i.recipeId,
				servings: i.servings
			}))
		}))

		const itemsDto = daysDto.flatMap((d) => d.items)

		const dto: MealPlanDto = {
			id: mealPlan.id,
			name: mealPlan.name,
			status: mealPlan.status,
			templateId: mealPlan.templateId,
			startDate: mealPlan.startDate,
			endDate: mealPlan.endDate,
			days: daysDto,
			items: itemsDto
		}

		return dto
	})

	return json(created, { status: 201 })
}
