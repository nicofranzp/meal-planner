import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { prisma } from '$lib/server/prisma'
import { getOrCreateDefaultHousehold } from '$lib/server/household'

type PersonDto = {
	id: string
	householdId: string
	name: string
	portionFactor: number
}

export const GET: RequestHandler = async () => {
	const household = await getOrCreateDefaultHousehold()

	const people = await prisma.person.findMany({
		where: { householdId: household.id },
		select: { id: true, householdId: true, name: true, portionFactor: true },
		orderBy: { name: 'asc' }
	})

	return json({
		householdId: household.id,
		people
	})
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

	const name = (body as { name?: unknown }).name
	const portionFactorRaw = (body as { portionFactor?: unknown }).portionFactor

	if (typeof name !== 'string') {
		return json({ message: 'name must be a string' }, { status: 400 })
	}

	const trimmed = name.trim()
	if (trimmed.length === 0) {
		return json({ message: 'name cannot be empty' }, { status: 400 })
	}

	let portionFactor = 1.0
	if (portionFactorRaw !== undefined) {
		if (typeof portionFactorRaw !== 'number' || !Number.isFinite(portionFactorRaw)) {
			return json({ message: 'portionFactor must be a finite number' }, { status: 400 })
		}
		if (portionFactorRaw <= 0) {
			return json({ message: 'portionFactor must be > 0' }, { status: 400 })
		}
		portionFactor = portionFactorRaw
	}

	const created = await prisma.person.create({
		data: {
			householdId: household.id,
			name: trimmed,
			portionFactor,
			dislikedIngredientIds: []
		},
		select: { id: true, householdId: true, name: true, portionFactor: true }
	})

	return json(created satisfies PersonDto, { status: 201 })
}
