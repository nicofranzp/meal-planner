import { prisma } from '$lib/server/prisma'

export type HouseholdDto = {
	id: string
	name: string
}

export async function getOrCreateDefaultHousehold(): Promise<HouseholdDto> {
	const existing = await prisma.household.findFirst({
		select: { id: true, name: true }
	})

	if (existing) return existing

	return prisma.household.create({
		data: { name: 'Household' },
		select: { id: true, name: true }
	})
}
