import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { prisma } from '$lib/server/prisma'
import { getOrCreateDefaultHousehold } from '$lib/server/household'
import type { PantryAvailability } from '@prisma/client'

type PatchBody = {
	availability?: unknown
}

function isPantryAvailability(value: unknown): value is PantryAvailability {
	return value === 'HAVE' || value === 'LOW' || value === 'OUT'
}

export const PATCH: RequestHandler = async ({ params, request }) => {
	const household = await getOrCreateDefaultHousehold()
	const id = params.id

	let body: unknown
	try {
		body = await request.json()
	} catch {
		return json({ message: 'Invalid JSON body' }, { status: 400 })
	}

	if (!body || typeof body !== 'object') {
		return json({ message: 'Body must be an object' }, { status: 400 })
	}

	const availabilityRaw = (body as PatchBody).availability
	if (!isPantryAvailability(availabilityRaw)) {
		return json({ message: 'availability must be HAVE, LOW, or OUT' }, { status: 400 })
	}

	const existing = await prisma.pantryItem.findFirst({
		where: { id, householdId: household.id },
		select: {
			id: true,
			householdId: true,
			ingredientId: true,
			availability: true,
			createdAt: true,
			updatedAt: true,
			ingredient: { select: { id: true, name: true, unit: true } }
		}
	})

	if (!existing) {
		return json({ message: 'Pantry item not found' }, { status: 404 })
	}

	const updated = await prisma.pantryItem.update({
		where: { id: existing.id },
		data: { availability: availabilityRaw },
		select: {
			id: true,
			householdId: true,
			ingredientId: true,
			availability: true,
			createdAt: true,
			updatedAt: true,
			ingredient: { select: { id: true, name: true, unit: true } }
		}
	})

	return json({
		id: updated.id,
		householdId: updated.householdId,
		ingredientId: updated.ingredientId,
		availability: updated.availability,
		createdAt: updated.createdAt.toISOString(),
		updatedAt: updated.updatedAt.toISOString(),
		ingredient: updated.ingredient
	})
}
