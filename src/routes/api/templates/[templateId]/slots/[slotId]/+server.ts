import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { prisma } from '$lib/server/prisma'
import { getOrCreateDefaultHousehold } from '$lib/server/household'

type MealType = 'breakfast' | 'lunch' | 'dinner'

type PatchBody = {
	dayNumber?: unknown
	mealType?: unknown
	notes?: unknown
}

export const PATCH: RequestHandler = async ({ params, request }) => {
	const household = await getOrCreateDefaultHousehold()

	const template = await prisma.template.findFirst({
		where: { id: params.templateId, householdId: household.id },
		select: { id: true, durationDays: true }
	})
	if (!template) return json({ message: 'Template not found' }, { status: 404 })

	const existingSlot = await prisma.templateSlot.findFirst({
		where: { id: params.slotId, templateId: params.templateId },
		select: { id: true }
	})
	if (!existingSlot) return json({ message: 'Slot not found' }, { status: 404 })

	let body: unknown
	try {
		body = await request.json()
	} catch {
		return json({ message: 'Invalid JSON body' }, { status: 400 })
	}

	if (!body || typeof body !== 'object') {
		return json({ message: 'Body must be an object' }, { status: 400 })
	}

	const { dayNumber, mealType, notes } = body as PatchBody

	const data: {
		dayNumber?: number
		mealType?: MealType
		notes?: string | null
	} = {}

	if (dayNumber !== undefined) {
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
		data.dayNumber = dayNumberInt
	}

	if (mealType !== undefined) {
		if (mealType !== 'breakfast' && mealType !== 'lunch' && mealType !== 'dinner') {
			return json({ message: 'mealType must be one of: breakfast, lunch, dinner' }, { status: 400 })
		}
		data.mealType = mealType
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

	try {
		const updated = await prisma.templateSlot.update({
			where: { id: params.slotId },
			data,
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

		return json({
			id: updated.id,
			templateId: updated.templateId,
			dayNumber: updated.dayNumber,
			mealType: updated.mealType as MealType,
			notes: updated.notes,
			createdAt: updated.createdAt.toISOString(),
			updatedAt: updated.updatedAt.toISOString()
		})
	} catch {
		return json({ message: 'Slot already exists for that dayNumber and mealType' }, { status: 409 })
	}
}

export const DELETE: RequestHandler = async ({ params }) => {
	const household = await getOrCreateDefaultHousehold()

	const template = await prisma.template.findFirst({
		where: { id: params.templateId, householdId: household.id },
		select: { id: true }
	})
	if (!template) return json({ message: 'Template not found' }, { status: 404 })

	const existingSlot = await prisma.templateSlot.findFirst({
		where: { id: params.slotId, templateId: params.templateId },
		select: { id: true }
	})
	if (!existingSlot) return json({ message: 'Slot not found' }, { status: 404 })

	await prisma.templateSlot.delete({ where: { id: params.slotId } })
	return json({ ok: true })
}
