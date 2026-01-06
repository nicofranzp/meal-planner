<script lang="ts">
	type MealPlanStatus = 'draft' | 'active' | 'completed'
	type MealPlanItemMealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

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
		mealType: MealPlanItemMealType
		servings: number
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

	const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const

	let mealPlan = $state<MealPlanDto | null>(null)
	let days = $state<DayDto[]>([])
	let recipes = $state<RecipeListItem[]>([])

	let loading = $state(true)
	let error = $state<string | null>(null)

	let addingDay = $state(false)
	let showAddDayForm = $state(false)
	let newDayDate = $state('')

	let deletingDayId = $state<string | null>(null)
	let deletingItemId = $state<string | null>(null)

	let addItemStateByDayId = $state<Record<string, { recipeId: string; mealType: MealPlanItemMealType; servings: string }>>({})
	let addingItemForDayId = $state<string | null>(null)
	let openAddItemDayId = $state<string | null>(null)

	function ensureDayItemState(dayId: string) {
		if (addItemStateByDayId[dayId]) return
		addItemStateByDayId = {
			...addItemStateByDayId,
			[dayId]: { recipeId: '', mealType: 'dinner', servings: '1' }
		}
	}

	async function loadAll() {
		loading = true
		error = null

		try {
			const [planRes, daysRes, recipesRes] = await Promise.all([
				fetch(`/api/mealplans/${params.mealPlanId}`),
				fetch(`/api/mealplans/${params.mealPlanId}/days`),
				fetch('/api/recipes')
			])

			if (planRes.status === 404) {
				mealPlan = null
				days = []
				error = 'Meal plan not found'
				return
			}
			if (!planRes.ok) {
				throw new Error(`Failed to load meal plan (${planRes.status})`)
			}

			if (!daysRes.ok) {
				throw new Error(`Failed to load days (${daysRes.status})`)
			}

			if (!recipesRes.ok) {
				throw new Error(`Failed to load recipes (${recipesRes.status})`)
			}

			mealPlan = (await planRes.json()) as MealPlanDto
			const daysData = (await daysRes.json()) as { mealPlanId: string; days: DayDto[] }
			days = daysData.days
			const recipesData = (await recipesRes.json()) as { recipes: RecipeListItem[] }
			recipes = recipesData.recipes

			for (const d of days) ensureDayItemState(d.id)
		} catch (e) {
			mealPlan = null
			days = []
			recipes = []
			error = e instanceof Error ? e.message : 'Failed to load'
		} finally {
			loading = false
		}
	}

	async function addDay() {
		addingDay = true
		error = null

		try {
			const date = newDayDate.trim()
			if (date.length === 0) {
				error = 'Date is required'
				return
			}

			const res = await fetch(`/api/mealplans/${params.mealPlanId}/days`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ date })
			})

			if (!res.ok) {
				const payload = (await res.json().catch(() => null)) as { message?: string } | null
				error = payload?.message ?? `Failed to add day (${res.status})`
				return
			}

			newDayDate = ''
			showAddDayForm = false
			await loadAll()
		} catch {
			error = 'Failed to add day'
		} finally {
			addingDay = false
		}
	}

	async function deleteDay(dayId: string) {
		if (!confirm('Delete this day?')) return
		deletingDayId = dayId
		error = null

		try {
			const res = await fetch(`/api/mealplans/${params.mealPlanId}/days/${dayId}`, { method: 'DELETE' })
			if (!res.ok) {
				const payload = (await res.json().catch(() => null)) as { message?: string } | null
				error = payload?.message ?? `Failed to delete day (${res.status})`
				return
			}

			await loadAll()
		} catch {
			error = 'Failed to delete day'
		} finally {
			deletingDayId = null
		}
	}

	async function addItem(dayId: string) {
		addingItemForDayId = dayId
		error = null

		try {
			ensureDayItemState(dayId)
			const state = addItemStateByDayId[dayId]

			const recipeId = state.recipeId
			if (!recipeId) {
				error = 'Recipe is required'
				return
			}

			const servings = Number(state.servings)
			if (!Number.isFinite(servings) || servings <= 0) {
				error = 'Servings must be a number > 0'
				return
			}

			const res = await fetch(`/api/mealplans/${params.mealPlanId}/days/${dayId}/items`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					recipeId,
					mealType: state.mealType,
					servings
				})
			})

			if (!res.ok) {
				const payload = (await res.json().catch(() => null)) as { message?: string } | null
				error = payload?.message ?? `Failed to add item (${res.status})`
				return
			}

			addItemStateByDayId = {
				...addItemStateByDayId,
				[dayId]: { recipeId: '', mealType: 'dinner', servings: '1' }
			}
			openAddItemDayId = null
			await loadAll()
		} catch {
			error = 'Failed to add item'
		} finally {
			addingItemForDayId = null
		}
	}

	async function deleteItem(dayId: string, itemId: string) {
		if (!confirm('Delete this item?')) return
		deletingItemId = itemId
		error = null

		try {
			const res = await fetch(`/api/mealplans/${params.mealPlanId}/days/${dayId}/items/${itemId}`, {
				method: 'DELETE'
			})
			if (!res.ok) {
				const payload = (await res.json().catch(() => null)) as { message?: string } | null
				error = payload?.message ?? `Failed to delete item (${res.status})`
				return
			}

			await loadAll()
		} catch {
			error = 'Failed to delete item'
		} finally {
			deletingItemId = null
		}
	}

	$effect(() => {
		void loadAll()
	})
</script>

<main class="mx-auto max-w-xl p-6">
	<div class="flex items-center justify-between gap-4">
		<h1 class="text-2xl font-semibold">Meal Plan</h1>
		<a class="text-sm underline" href="/mealplans">Back</a>
	</div>

	{#if loading}
		<p class="mt-4">Loading…</p>
	{:else if error}
		<p class="mt-4 text-red-600">{error}</p>
	{:else if mealPlan}
		<div class="mt-4 space-y-8">
			<section>
				<h2 class="text-xl font-semibold">{mealPlan.name}</h2>
				<p class="mt-1 text-sm text-gray-700">Status: {mealPlan.status}</p>
			</section>

			<section>
				<div class="flex items-center justify-between gap-4">
					<h3 class="text-lg font-semibold">Days</h3>
					<button
						class="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-60"
						type="button"
						onclick={() => {
							showAddDayForm = !showAddDayForm
						}}
						disabled={addingDay}
					>
						Add Day
					</button>
				</div>

				{#if showAddDayForm}
					<form
						class="mt-3 flex items-end gap-3"
						onsubmit={(e) => {
							e.preventDefault()
							void addDay()
						}}
					>
						<label class="block flex-1">
							<span class="block text-sm font-medium">Date</span>
							<input
								class="mt-1 w-full rounded border border-gray-300 px-3 py-2"
								type="date"
								value={newDayDate}
								oninput={(e) => {
									newDayDate = (e.currentTarget as HTMLInputElement).value
								}}
								disabled={addingDay}
							/>
						</label>
						<button
							class="rounded border border-gray-300 px-4 py-2 text-sm disabled:opacity-60"
							type="button"
							onclick={() => {
								showAddDayForm = false
							}}
							disabled={addingDay}
						>
							Cancel
						</button>
						<button class="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-60" type="submit" disabled={addingDay}>
							{addingDay ? 'Adding…' : 'Add Day'}
						</button>
					</form>
				{/if}
			</section>

			<section>
				{#if days.length === 0}
					<p class="mt-2 text-sm">No days yet.</p>
				{:else}
					<div class="mt-3 space-y-4">
						{#each days as day (day.id)}
							<div class="rounded border border-gray-200 p-3">
								<div class="flex items-start justify-between gap-4">
									<div>
										<p class="font-medium">{day.date}</p>
										<p class="mt-1 text-xs text-gray-700">{day.items.length} items</p>
									</div>
									<button
										class="rounded border border-gray-300 px-3 py-2 text-sm disabled:opacity-60"
										type="button"
										onclick={() => {
											void deleteDay(day.id)
										}}
										disabled={deletingDayId === day.id}
									>
										{deletingDayId === day.id ? 'Deleting…' : 'Delete day'}
									</button>
								</div>

								{#if day.items.length > 0}
									<ul class="mt-3 space-y-2">
										{#each day.items as item (item.id)}
											<li class="flex items-center justify-between gap-4 rounded border border-gray-100 px-3 py-2">
												<div class="text-sm">
													<span class="font-medium">{item.recipe.name}</span>
													<span class="text-gray-700"> — {item.mealType}, {item.servings} servings</span>
												</div>
												<button
													class="rounded border border-gray-300 px-3 py-1 text-sm disabled:opacity-60"
													type="button"
													onclick={() => {
														void deleteItem(day.id, item.id)
													}}
													disabled={deletingItemId === item.id}
												>
													{deletingItemId === item.id ? 'Deleting…' : 'Delete'}
												</button>
											</li>
										{/each}
									</ul>
								{/if}

								<div class="mt-4 rounded border border-gray-100 p-3">
									<div class="flex items-center justify-between gap-4">
										<h4 class="text-sm font-medium">Items</h4>
										<button
											class="rounded border border-gray-300 px-3 py-2 text-sm disabled:opacity-60"
											type="button"
											onclick={() => {
												openAddItemDayId = openAddItemDayId === day.id ? null : day.id
												ensureDayItemState(day.id)
											}}
										>
											Add Item
										</button>
									</div>

									{#if openAddItemDayId === day.id}
										<form
											class="mt-3 grid gap-3"
											onsubmit={(e) => {
												e.preventDefault()
												void addItem(day.id)
											}}
										>
										<label class="block">
											<span class="block text-sm font-medium">Recipe</span>
											<select
												class="mt-1 w-full rounded border border-gray-300 px-3 py-2"
												value={addItemStateByDayId[day.id]?.recipeId ?? ''}
												onchange={(e) => {
													ensureDayItemState(day.id)
													addItemStateByDayId = {
														...addItemStateByDayId,
														[day.id]: {
															...addItemStateByDayId[day.id],
															recipeId: (e.currentTarget as HTMLSelectElement).value
														}
													}
												}}
												disabled={addingItemForDayId === day.id || recipes.length === 0}
											>
												<option value="">Select…</option>
												{#each recipes as r (r.id)}
													<option value={r.id}>{r.name}</option>
												{/each}
											</select>
										</label>

										<label class="block">
											<span class="block text-sm font-medium">Meal type</span>
											<select
												class="mt-1 w-full rounded border border-gray-300 px-3 py-2"
												value={addItemStateByDayId[day.id]?.mealType ?? 'dinner'}
												onchange={(e) => {
													ensureDayItemState(day.id)
													addItemStateByDayId = {
														...addItemStateByDayId,
														[day.id]: {
															...addItemStateByDayId[day.id],
															mealType: (e.currentTarget as HTMLSelectElement).value as MealPlanItemMealType
														}
													}
												}}
												disabled={addingItemForDayId === day.id}
											>
												{#each MEAL_TYPES as mt (mt)}
													<option value={mt}>{mt}</option>
												{/each}
											</select>
										</label>

										<label class="block">
											<span class="block text-sm font-medium">Servings</span>
											<input
												class="mt-1 w-full rounded border border-gray-300 px-3 py-2"
												type="number"
												min="0"
												step="0.5"
												value={addItemStateByDayId[day.id]?.servings ?? '1'}
												oninput={(e) => {
													ensureDayItemState(day.id)
													addItemStateByDayId = {
														...addItemStateByDayId,
														[day.id]: {
															...addItemStateByDayId[day.id],
															servings: (e.currentTarget as HTMLInputElement).value
														}
													}
												}}
												disabled={addingItemForDayId === day.id}
											/>
										</label>

										<button
											class="rounded bg-black px-4 py-2 text-white disabled:opacity-60"
											type="submit"
											disabled={addingItemForDayId === day.id}
										>
											{addingItemForDayId === day.id ? 'Adding…' : 'Add item'}
										</button>
									</form>
									<div class="mt-2">
										<button
											class="text-sm underline disabled:opacity-60"
											type="button"
											onclick={() => {
												openAddItemDayId = null
											}}
											disabled={addingItemForDayId === day.id}
										>
											Cancel
										</button>
									</div>
								{/if}
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</section>
		</div>
	{/if}
</main>
