import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { prisma } from '$lib/server/prisma'
import { getOrCreateDefaultHousehold } from '$lib/server/household'

type MealType = 'breakfast' | 'lunch' | 'dinner'

type CreateBody = {
	dayNumber?: unknown
	mealType?: unknown
	notes?: unknown
}

export const POST: RequestHandler = async ({ params, request }) => {
	const household = await getOrCreateDefaultHousehold()

	const template = await prisma.template.findFirst({
		where: { id: params.templateId, householdId: household.id },
		select: { id: true, durationDays: true }
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

	const { dayNumber, mealType, notes } = body as CreateBody

	if (typeof dayNumber !== 'number' || !Number.isFinite(dayNumber)) {
		return json({ message: 'dayNumber must be a number' }, { status: 400 })
	}
	const dayNumberInt = Math.floor(dayNumber)
	if (dayNumberInt !== dayNumber || dayNumberInt < 1) {
		return json({ message: 'dayNumber must be an integer >= 1' }, { status: 400 })
	}
	if (dayNumberInt > template.durationDays) {
		return json({ message: 'dayNumber must be <= template.durationDays' }, { status: 400 })
	}

	if (mealType !== 'breakfast' && mealType !== 'lunch' && mealType !== 'dinner') {
		return json({ message: 'mealType must be one of: breakfast, lunch, dinner' }, { status: 400 })
	}

	let normalizedNotes: string | null = null
	if (notes !== undefined) {
		if (notes !== null && typeof notes !== 'string') {
			return json({ message: 'notes must be a string' }, { status: 400 })
		}
		normalizedNotes = notes === null ? null : notes.trim() || null
	}

	try {
		const created = await prisma.templateSlot.create({
			data: {
				templateId: params.templateId,
				dayNumber: dayNumberInt,
				mealType,
				notes: normalizedNotes
			},
			select: {
				id: true,
				templateId: true,
				dayNumber: true,
				mealType: true,
				notes: true,
				createdAt: true,
				updatedAt: true
			}
		})

		return json(
			{
				id: created.id,
				templateId: created.templateId,
				dayNumber: created.dayNumber,
				mealType: created.mealType as MealType,
				notes: created.notes,
				createdAt: created.createdAt.toISOString(),
				updatedAt: created.updatedAt.toISOString()
			},
			{ status: 201 }
		)
	} catch {
		return json({ message: 'Slot already exists for that dayNumber and mealType' }, { status: 409 })
	}
}
