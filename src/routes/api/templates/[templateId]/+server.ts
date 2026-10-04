import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { prisma } from '$lib/server/prisma'
import { getOrCreateDefaultHousehold } from '$lib/server/household'

type MealType = 'breakfast' | 'lunch' | 'dinner'

type TemplateSlotDto = {
	id: string
	templateId: string
	dayNumber: number
	mealType: MealType
	notes: string | null
	createdAt: string
	updatedAt: string
}

type TemplateDto = {
	id: string
	householdId: string
	name: string
	description: string | null
	durationDays: number
	createdAt: string
	updatedAt: string
	slots: TemplateSlotDto[]
}

function toSlotDto(row: {
	id: string
	templateId: string
	dayNumber: number
	mealType: MealType
	notes: string | null
	createdAt: Date
	updatedAt: Date
}): TemplateSlotDto {
	return {
		id: row.id,
		templateId: row.templateId,
		dayNumber: row.dayNumber,
		mealType: row.mealType,
		notes: row.notes,
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt.toISOString()
	}
}

function toTemplateDto(row: {
	id: string
	householdId: string
	name: string
	description: string | null
	durationDays: number
	createdAt: Date
	updatedAt: Date
	slots: Array<{
		id: string
		templateId: string
		dayNumber: number
		mealType: MealType
		notes: string | null
		createdAt: Date
		updatedAt: Date
	}>
}): TemplateDto {
	return {
		id: row.id,
		householdId: row.householdId,
		name: row.name,
		description: row.description,
		durationDays: row.durationDays,
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt.toISOString(),
		slots: row.slots.map(toSlotDto)
	}
}

async function getTemplateOr404(templateId: string, householdId: string) {
	return prisma.template.findFirst({
		where: { id: templateId, householdId },
		select: {
			id: true,
			householdId: true,
			name: true,
			description: true,
			durationDays: true,
			createdAt: true,
			updatedAt: true,
			slots: {
				select: {
					id: true,
					templateId: true,
					dayNumber: true,
					mealType: true,
					notes: true,
					createdAt: true,
					updatedAt: true
				},
				orderBy: [{ dayNumber: 'asc' }, { mealType: 'asc' }]
			}
		}
	})
}

export const GET: RequestHandler = async ({ params }) => {
	const household = await getOrCreateDefaultHousehold()
	const template = await getTemplateOr404(params.templateId, household.id)
	if (!template) return json({ message: 'Template not found' }, { status: 404 })
	return json(toTemplateDto(template))
}

type PatchBody = {
	name?: unknown
	description?: unknown
	durationDays?: unknown
}

export const PATCH: RequestHandler = async ({ params, request }) => {
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

	const { name, description, durationDays } = body as PatchBody

	const data: {
		name?: string
		description?: string | null
		durationDays?: number
	} = {}

	if (name !== undefined) {
		if (typeof name !== 'string') return json({ message: 'name must be a string' }, { status: 400 })
		const trimmed = name.trim()
		if (trimmed.length === 0) return json({ message: 'name cannot be empty' }, { status: 400 })
		data.name = trimmed
	}

	if (description !== undefined) {
		if (description !== null && typeof description !== 'string') {
			return json({ message: 'description must be a string' }, { status: 400 })
		}
		data.description = description === null ? null : description.trim() || null
	}

	let newDurationDays: number | null = null
	if (durationDays !== undefined) {
		if (typeof durationDays !== 'number' || !Number.isFinite(durationDays) || durationDays < 1) {
			return json({ message: 'durationDays must be a finite number >= 1' }, { status: 400 })
		}
		const intVal = Math.floor(durationDays)
		if (intVal !== durationDays) {
			return json({ message: 'durationDays must be an integer' }, { status: 400 })
		}
		newDurationDays = intVal
		data.durationDays = intVal
	}

	if (Object.keys(data).length === 0) {
		return json({ message: 'No updatable fields provided' }, { status: 400 })
	}

	const existing = await prisma.template.findFirst({
		where: { id: params.templateId, householdId: household.id },
		select: { id: true, durationDays: true }
	})
	if (!existing) return json({ message: 'Template not found' }, { status: 404 })

	if (newDurationDays !== null && newDurationDays < existing.durationDays) {
		const maxSlot = await prisma.templateSlot.findFirst({
			where: { templateId: params.templateId },
			select: { dayNumber: true },
			orderBy: { dayNumber: 'desc' }
		})

		if (maxSlot && maxSlot.dayNumber > newDurationDays) {
			return json(
				{ message: 'durationDays cannot be reduced below the max existing slot dayNumber' },
				{ status: 400 }
			)
		}
	}

	const updated = await prisma.template.update({
		where: { id: params.templateId },
		data,
		select: {
			id: true,
			householdId: true,
			name: true,
			description: true,
			durationDays: true,
			createdAt: true,
			updatedAt: true,
			slots: {
				select: {
					id: true,
					templateId: true,
					dayNumber: true,
					mealType: true,
					notes: true,
					createdAt: true,
					updatedAt: true
				},
				orderBy: [{ dayNumber: 'asc' }, { mealType: 'asc' }]
			}
		}
	})

	return json(toTemplateDto(updated))
}

export const DELETE: RequestHandler = async ({ params }) => {
	const household = await getOrCreateDefaultHousehold()
	const existing = await prisma.template.findFirst({
		where: { id: params.templateId, householdId: household.id },
		select: { id: true }
	})
	if (!existing) return json({ message: 'Template not found' }, { status: 404 })

	await prisma.template.delete({ where: { id: params.templateId } })
	return json({ ok: true })
}
