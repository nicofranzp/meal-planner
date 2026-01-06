import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { prisma } from '$lib/server/prisma'

type IngredientDto = {
	id: string
	name: string
	unit: string
	createdAt: string
	updatedAt: string
}

function toIngredientDto(row: {
	id: string
	name: string
	unit: string
	createdAt: Date
	updatedAt: Date
}): IngredientDto {
	return {
		id: row.id,
		name: row.name,
		unit: row.unit,
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt.toISOString()
	}
}

export const GET: RequestHandler = async () => {
	const ingredients = await prisma.ingredient.findMany({
		select: { id: true, name: true, unit: true, createdAt: true, updatedAt: true },
		orderBy: { name: 'asc' }
	})

	return json({
		ingredients: ingredients.map(toIngredientDto)
	})
}

export const POST: RequestHandler = async ({ request }) => {
	let body: unknown
	try {
		body = await request.json()
	} catch {
		return json({ message: 'Invalid JSON body' }, { status: 400 })
	}

	if (!body || typeof body !== 'object') {
		return json({ message: 'Body must be an object' }, { status: 400 })
	}

	const nameRaw = (body as { name?: unknown }).name
	const unitRaw = (body as { unit?: unknown }).unit

	if (typeof nameRaw !== 'string') {
		return json({ message: 'name must be a string' }, { status: 400 })
	}
	if (typeof unitRaw !== 'string') {
		return json({ message: 'unit must be a string' }, { status: 400 })
	}

	const name = nameRaw.trim()
	const unit = unitRaw.trim()

	if (name.length === 0) {
		return json({ message: 'name cannot be empty' }, { status: 400 })
	}
	if (unit.length === 0) {
		return json({ message: 'unit cannot be empty' }, { status: 400 })
	}

	// MVP: enforce case-insensitive uniqueness in application logic.
	// (SQLite + Prisma does not guarantee case-insensitive uniqueness by default.)
	const existing = await prisma.ingredient.findMany({
		select: { id: true, name: true }
	})
	const nameLower = name.toLowerCase()
	if (existing.some((i) => i.name.toLowerCase() === nameLower)) {
		return json({ message: 'Ingredient name already exists' }, { status: 409 })
	}

	try {
		const created = await prisma.ingredient.create({
			data: { name, unit },
			select: { id: true, name: true, unit: true, createdAt: true, updatedAt: true }
		})

		return json(toIngredientDto(created), { status: 201 })
	} catch {
		// Fallback for exact-case duplicates hitting the DB unique constraint.
		return json({ message: 'Ingredient name already exists' }, { status: 409 })
	}
}
