import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { prisma } from '$lib/server/prisma'
import { getOrCreateDefaultHousehold } from '$lib/server/household'

type TemplateListItemDto = {
	id: string
	householdId: string
	name: string
	description: string | null
	durationDays: number
	createdAt: string
	updatedAt: string
}

function toDto(row: {
	id: string
	householdId: string
	name: string
	description: string | null
	durationDays: number
	createdAt: Date
	updatedAt: Date
}): TemplateListItemDto {
	return {
		id: row.id,
		householdId: row.householdId,
		name: row.name,
		description: row.description,
		durationDays: row.durationDays,
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt.toISOString()
	}
}

export const GET: RequestHandler = async () => {
	const household = await getOrCreateDefaultHousehold()

	const templates = await prisma.template.findMany({
		where: { householdId: household.id },
		select: {
			id: true,
			householdId: true,
			name: true,
			description: true,
			durationDays: true,
			createdAt: true,
			updatedAt: true
		},
		orderBy: { createdAt: 'desc' }
	})

	return json({ householdId: household.id, templates: templates.map(toDto) })
}

type CreateBody = {
	name?: unknown
	description?: unknown
	durationDays?: unknown
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

	const { name, description, durationDays } = body as CreateBody

	if (typeof name !== 'string') return json({ message: 'name must be a string' }, { status: 400 })
	const trimmedName = name.trim()
	if (trimmedName.length === 0) return json({ message: 'name cannot be empty' }, { status: 400 })

	let normalizedDescription: string | null = null
	if (description !== undefined) {
		if (description !== null && typeof description !== 'string') {
			return json({ message: 'description must be a string' }, { status: 400 })
		}
		normalizedDescription = description === null ? null : description.trim() || null
	}

	if (typeof durationDays !== 'number' || !Number.isFinite(durationDays) || durationDays < 1) {
		return json({ message: 'durationDays must be a finite number >= 1' }, { status: 400 })
	}
	const durationDaysInt = Math.floor(durationDays)
	if (durationDaysInt !== durationDays) {
		return json({ message: 'durationDays must be an integer' }, { status: 400 })
	}

	const created = await prisma.template.create({
		data: {
			householdId: household.id,
			name: trimmedName,
			description: normalizedDescription,
			durationDays: durationDaysInt
		},
		select: {
			id: true,
			householdId: true,
			name: true,
			description: true,
			durationDays: true,
			createdAt: true,
			updatedAt: true
		}
	})

	return json(toDto(created), { status: 201 })
}
