import { PrismaClient } from '@prisma/client'
import { env } from '$env/dynamic/private'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'

const globalForPrisma = globalThis as unknown as {
	prisma?: PrismaClient
}

function toBetterSqlite3Url(databaseUrl: string): string {
	if (databaseUrl === ':memory:') return ':memory:'
	if (databaseUrl.startsWith('file:')) return databaseUrl.slice('file:'.length)
	return databaseUrl
}

const databaseUrl = env.DATABASE_URL

if (!databaseUrl || databaseUrl.trim().length === 0) {
	throw new Error('DATABASE_URL is not set. Define it in .env (e.g. DATABASE_URL="file:./dev.db").')
}

export const prisma =
	globalForPrisma.prisma ??
	new PrismaClient({
		adapter: new PrismaBetterSqlite3({
			url: toBetterSqlite3Url(databaseUrl)
		})
	})

if (process.env.NODE_ENV !== 'production') {
	globalForPrisma.prisma = prisma
}
