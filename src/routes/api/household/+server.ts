import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { prisma } from '$lib/server/prisma'
import { getOrCreateDefaultHousehold } from '$lib/server/household'

export const GET: RequestHandler = async () => {
	const household = await getOrCreateDefaultHousehold()
	return json(household)
}

export const PUT: RequestHandler = async ({ request }) => {
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
	if (typeof name !== 'string') {
		return json({ message: 'name must be a string' }, { status: 400 })
	}

	const trimmed = name.trim()
	if (trimmed.length === 0) {
		return json({ message: 'name cannot be empty' }, { status: 400 })
	}

	const updated = await prisma.household.update({
		where: { id: household.id },
		data: { name: trimmed },
		select: { id: true, name: true }
	})

	return json(updated)
}
