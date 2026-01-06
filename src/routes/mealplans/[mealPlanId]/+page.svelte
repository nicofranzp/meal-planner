<script lang="ts">
	type MealPlanStatus = 'draft' | 'active' | 'completed'

	type MealPlanDto = {
		id: string
		householdId: string
		name: string
		status: MealPlanStatus
		createdAt: string
		updatedAt: string
	}

	type DayItemDto = {
		id: string
		dayId: string
		recipeId: string
		recipe: { id: string; name: string }
	}

	type DayDto = {
		id: string
		mealPlanId: string
		date: string
		items: DayItemDto[]
	}

	type RecipeListItem = {
		id: string
		name: string
		servings: number
	}

	let { params } = $props<{ params: { mealPlanId: string } }>()

	const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const

	let mealPlan = $state<MealPlanDto | null>(null)
	let days = $state<DayDto[]>([])
	let recipes = $state<RecipeListItem[]>([])

	let loading = $state(true)
	let error = $state<string | null>(null)

	let openAddItemDate = $state<string | null>(null)
	let recipeNameByDate = $state<Record<string, string>>({})
	let creatingDayForDate = $state<string | null>(null)
	let addingItemForDate = $state<string | null>(null)

	function isoDateOnlyLocal(d: Date): string {
		const year = d.getFullYear()
		const month = String(d.getMonth() + 1).padStart(2, '0')
		const day = String(d.getDate()).padStart(2, '0')
		return `${year}-${month}-${day}`
	}

	function startOfWeekMonday(today: Date): Date {
		const d = new Date(today)
		const dow = d.getDay() // 0 Sun .. 6 Sat
		const daysSinceMonday = (dow + 6) % 7
		d.setDate(d.getDate() - daysSinceMonday)
		d.setHours(0, 0, 0, 0)
		return d
	}

	const weekDates = $derived.by(() => {
		const start = startOfWeekMonday(new Date())
		return Array.from({ length: 7 }, (_, i) => {
			const d = new Date(start)
			d.setDate(start.getDate() + i)
			return isoDateOnlyLocal(d)
		})
	})

	const dayByDate = $derived.by(() => {
		const map = new Map<string, DayDto>()
		for (const d of days) map.set(d.date, d)
		return map
	})

	function findRecipeIdByName(name: string): string | null {
		const trimmed = name.trim()
		if (!trimmed) return null
		const lower = trimmed.toLowerCase()
		const exact = recipes.find((r) => r.name.trim().toLowerCase() === lower)
		if (exact) return exact.id
		const prefix = recipes.find((r) => r.name.trim().toLowerCase().startsWith(lower))
		return prefix?.id ?? null
	}

	async function loadMealPlan() {
		const res = await fetch(`/api/mealplans/${params.mealPlanId}`)
		if (res.status === 404) {
			mealPlan = null
			days = []
			error = 'Meal plan not found'
			return
		}
		if (!res.ok) throw new Error(`Failed to load meal plan (${res.status})`)
		mealPlan = (await res.json()) as MealPlanDto
	}

	async function loadDays() {
		const res = await fetch(`/api/mealplans/${params.mealPlanId}/days`)
		if (!res.ok) throw new Error(`Failed to load days (${res.status})`)
		const daysData = (await res.json()) as { mealPlanId: string; days: DayDto[] }
		days = daysData.days
	}

	async function loadRecipes() {
		const res = await fetch('/api/recipes')
		if (!res.ok) throw new Error(`Failed to load recipes (${res.status})`)
		const recipesData = (await res.json()) as { recipes: RecipeListItem[] }
		recipes = recipesData.recipes
	}

	async function refreshDayByDate(date: string) {
		const res = await fetch(`/api/mealplans/${params.mealPlanId}/days`)
		if (!res.ok) throw new Error(`Failed to refresh day (${res.status})`)
		const daysData = (await res.json()) as { mealPlanId: string; days: DayDto[] }
		const refreshed = daysData.days.find((d) => d.date === date)
		if (!refreshed) {
			days = days.filter((d) => d.date !== date)
			return
		}
		days = days.map((d) => (d.date === date ? refreshed : d))
	}

	async function ensureDayExists(date: string): Promise<DayDto> {
		const existing = dayByDate.get(date)
		if (existing) return existing

		creatingDayForDate = date
		try {
			const res = await fetch(`/api/mealplans/${params.mealPlanId}/days`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ date })
			})
			if (!res.ok) {
				const payload = (await res.json().catch(() => null)) as { message?: string } | null
				throw new Error(payload?.message ?? `Failed to create day (${res.status})`)
			}
			const created = (await res.json()) as DayDto
			days = [...days, created]
			return created
		} finally {
			creatingDayForDate = null
		}
	}

	async function openAddItem(date: string) {
		error = null
		try {
			await ensureDayExists(date)
			openAddItemDate = date
			recipeNameByDate = { ...recipeNameByDate, [date]: recipeNameByDate[date] ?? '' }
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to prepare day'
		}
	}

	async function addItem(date: string) {
		error = null
		addingItemForDate = date
		try {
			const day = await ensureDayExists(date)
			const recipeName = recipeNameByDate[date] ?? ''
			const recipeId = findRecipeIdByName(recipeName)
			if (!recipeId) {
				throw new Error('Recipe not found. Create it first on /recipes.')
			}

			const res = await fetch(`/api/mealplans/${params.mealPlanId}/days/${day.id}/items`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ recipeId, mealType: 'dinner', servings: 1 })
			})

			if (!res.ok) {
				const payload = (await res.json().catch(() => null)) as { message?: string } | null
				throw new Error(payload?.message ?? `Failed to add item (${res.status})`)
			}

			recipeNameByDate = { ...recipeNameByDate, [date]: '' }
			openAddItemDate = null
			await refreshDayByDate(date)
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to add item'
		} finally {
			addingItemForDate = null
		}
	}

	$effect(() => {
		loading = true
		error = null
		void (async () => {
			try {
				await Promise.all([loadMealPlan(), loadDays(), loadRecipes()])
			} catch (e) {
				mealPlan = null
				days = []
				recipes = []
				error = e instanceof Error ? e.message : 'Failed to load'
			} finally {
				loading = false
			}
		})()
	})
</script>

<main class="mx-auto max-w-5xl p-6">
	<div class="flex items-center justify-between gap-4">
		<div>
			<h1 class="text-2xl font-semibold">Meal Plan</h1>
			{#if mealPlan}
				<p class="mt-1 text-sm text-gray-700">{mealPlan.name} — {mealPlan.status}</p>
			{/if}
		</div>
		<a class="text-sm underline" href="/mealplans">Back</a>
	</div>

	{#if loading}
		<p class="mt-4">Loading…</p>
	{:else if error}
		<p class="mt-4 text-red-600">{error}</p>
	{:else if mealPlan}
		<section class="mt-6">
			<h2 class="text-lg font-semibold">Weekly planner</h2>
			<div class="mt-3 overflow-x-auto">
				<div class="min-w-[900px]">
					<div class="grid grid-cols-7 gap-3">
						{#each weekDates as date, idx (date)}
							{@const day = dayByDate.get(date) ?? null}
							<div class="rounded border border-gray-200 p-3">
								<div class="flex items-start justify-between gap-3">
									<div>
										<p class="text-sm font-semibold">{WEEKDAYS[idx]}</p>
										<p class="text-xs text-gray-700">{date}</p>
									</div>
									<button
										class="rounded border border-gray-300 px-3 py-1 text-sm disabled:opacity-60"
										type="button"
										onclick={() => {
											void openAddItem(date)
										}}
										disabled={creatingDayForDate === date}
									>
										Add item
									</button>
								</div>

								{#if !day || day.items.length === 0}
									<p class="mt-3 text-sm text-gray-700">No items</p>
								{:else}
									<ul class="mt-3 space-y-2">
										{#each day.items as item (item.id)}
											<li class="rounded border border-gray-100 px-2 py-1 text-sm">{item.recipe.name}</li>
										{/each}
									</ul>
								{/if}

								{#if openAddItemDate === date}
									<form
										class="mt-4 space-y-2"
										onsubmit={(e) => {
											e.preventDefault()
											void addItem(date)
										}}
									>
										<label class="block">
											<span class="block text-sm font-medium">Recipe</span>
											<input
												class="mt-1 w-full rounded border border-gray-300 px-3 py-2"
												type="text"
												list="recipe-names"
												placeholder="Type recipe name…"
												value={recipeNameByDate[date] ?? ''}
												oninput={(e) => {
												recipeNameByDate = {
													...recipeNameByDate,
													[date]: (e.currentTarget as HTMLInputElement).value
												}
											}}
												disabled={addingItemForDate === date}
											/>
										</label>
										<div class="flex items-center gap-3">
											<button
												class="rounded bg-black px-3 py-2 text-sm text-white disabled:opacity-60"
												type="submit"
												disabled={addingItemForDate === date}
											>
												{addingItemForDate === date ? 'Adding…' : 'Add'}
											</button>
											<button
												class="text-sm underline disabled:opacity-60"
												type="button"
												onclick={() => {
												openAddItemDate = null
											}}
												disabled={addingItemForDate === date}
											>
												Cancel
											</button>
										</div>
									</form>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			</div>

			<datalist id="recipe-names">
				{#each recipes as r (r.id)}
					<option value={r.name}></option>
				{/each}
			</datalist>
		</section>
	{/if}
</main>
