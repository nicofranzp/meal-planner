import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { prisma } from '$lib/server/prisma'
import { getOrCreateDefaultHousehold } from '$lib/server/household'
import type { PantryAvailability } from '@prisma/client'

type PantryItemDto = {
	id: string
	householdId: string
	ingredientId: string
	availability: PantryAvailability
	createdAt: string
	updatedAt: string
	ingredient: {
		id: string
		name: string
		unit: string
	}
}

function isPantryAvailability(value: unknown): value is PantryAvailability {
	return value === 'HAVE' || value === 'LOW' || value === 'OUT'
}

export const GET: RequestHandler = async () => {
	const household = await getOrCreateDefaultHousehold()

	const items = await prisma.pantryItem.findMany({
		where: { householdId: household.id },
		select: {
			id: true,
			householdId: true,
			ingredientId: true,
			availability: true,
			createdAt: true,
			updatedAt: true,
			ingredient: { select: { id: true, name: true, unit: true } }
		},
		orderBy: { ingredient: { name: 'asc' } }
	})

	const dto: PantryItemDto[] = items.map((i) => ({
		id: i.id,
		householdId: i.householdId,
		ingredientId: i.ingredientId,
		availability: i.availability,
		createdAt: i.createdAt.toISOString(),
		updatedAt: i.updatedAt.toISOString(),
		ingredient: i.ingredient
	}))

	return json({ householdId: household.id, items: dto })
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

	const ingredientId = (body as { ingredientId?: unknown }).ingredientId
	const availabilityRaw = (body as { availability?: unknown }).availability

	if (typeof ingredientId !== 'string') {
		return json({ message: 'ingredientId must be a string' }, { status: 400 })
	}

	const availability: PantryAvailability =
		availabilityRaw === undefined
			? 'HAVE'
			: isPantryAvailability(availabilityRaw)
				? availabilityRaw
				: (null as never)

	if (availabilityRaw !== undefined && !isPantryAvailability(availabilityRaw)) {
		return json({ message: 'availability must be HAVE, LOW, or OUT' }, { status: 400 })
	}

	const ingredient = await prisma.ingredient.findUnique({
		where: { id: ingredientId },
		select: { id: true, name: true, unit: true }
	})

	if (!ingredient) {
		return json({ message: 'ingredientId not found' }, { status: 404 })
	}

	try {
		const created = await prisma.pantryItem.create({
			data: {
				householdId: household.id,
				ingredientId,
				availability
			},
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

		return json(
			{
				id: created.id,
				householdId: created.householdId,
				ingredientId: created.ingredientId,
				availability: created.availability,
				createdAt: created.createdAt.toISOString(),
				updatedAt: created.updatedAt.toISOString(),
				ingredient: created.ingredient
			} satisfies PantryItemDto,
			{ status: 201 }
		)
	} catch {
		return json({ message: 'Ingredient already in pantry' }, { status: 409 })
	}
}
