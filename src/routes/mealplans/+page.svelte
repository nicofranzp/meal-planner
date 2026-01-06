<script lang="ts">
	type MealPlanStatus = 'draft' | 'active' | 'completed'

	type MealPlanDto = {
		id: string
		householdId: string
		name: string
		status: MealPlanStatus
		createdAt: string
		updatedAt: string
		items: []
	}

	const MEAL_PLAN_STATUSES = ['draft', 'active', 'completed'] as const

	let mealPlans = $state<MealPlanDto[]>([])
	let loading = $state(true)
	let error = $state<string | null>(null)

	let name = $state('')
	let status = $state<MealPlanStatus>('draft')
	let creating = $state(false)

	async function loadMealPlans() {
		loading = true
		error = null

		try {
			const res = await fetch('/api/mealplans')
			if (!res.ok) {
				error = `Failed to load meal plans (${res.status})`
				mealPlans = []
				return
			}

			const data = (await res.json()) as { householdId: string; mealPlans: MealPlanDto[] }
			mealPlans = data.mealPlans
		} catch {
			error = 'Failed to load meal plans'
			mealPlans = []
		} finally {
			loading = false
		}
	}

	async function createMealPlan() {
		creating = true
		error = null

		try {
			const trimmedName = name.trim()
			if (trimmedName.length === 0) {
				error = 'Name is required'
				return
			}

			const res = await fetch('/api/mealplans', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ name: trimmedName, status })
			})

			if (!res.ok) {
				const payload = (await res.json().catch(() => null)) as { message?: string } | null
				error = payload?.message ?? `Failed to create (${res.status})`
				return
			}

			name = ''
			status = 'draft'
			await loadMealPlans()
		} catch {
			error = 'Failed to create meal plan'
		} finally {
			creating = false
		}
	}

	$effect(() => {
		void loadMealPlans()
	})
</script>

<main class="mx-auto max-w-xl p-6">
	<div class="flex items-center justify-between gap-4">
		<h1 class="text-2xl font-semibold">Meal Plans</h1>
		<a class="text-sm underline" href="/">Back to dashboard</a>
	</div>

	{#if error}
		<p class="mt-4 text-red-600">{error}</p>
	{/if}

	<section class="mt-6">
		<h2 class="text-xl font-semibold">Create</h2>
		<form
			class="mt-4 grid gap-3"
			onsubmit={(e) => {
				e.preventDefault()
				void createMealPlan()
			}}
		>
			<label class="block">
				<span class="block text-sm font-medium">Name</span>
				<input
					class="mt-1 w-full rounded border border-gray-300 px-3 py-2"
					type="text"
					value={name}
					oninput={(e) => {
						name = (e.currentTarget as HTMLInputElement).value
					}}
					disabled={creating}
					autocomplete="off"
				/>
			</label>

			<label class="block">
				<span class="block text-sm font-medium">Status</span>
				<select
					class="mt-1 w-full rounded border border-gray-300 px-3 py-2"
					value={status}
					onchange={(e) => {
						status = (e.currentTarget as HTMLSelectElement).value as MealPlanStatus
					}}
					disabled={creating}
				>
					{#each MEAL_PLAN_STATUSES as s (s)}
						<option value={s}>{s}</option>
					{/each}
				</select>
			</label>

			<button class="rounded bg-black px-4 py-2 text-white disabled:opacity-60" type="submit" disabled={creating}>
				{creating ? 'Creating…' : 'Create'}
			</button>
		</form>
	</section>

	<section class="mt-10">
		<h2 class="text-xl font-semibold">List</h2>

		{#if loading}
			<p class="mt-3">Loading…</p>
		{:else if mealPlans.length === 0}
			<p class="mt-3">No meal plans yet.</p>
		{:else}
			<ul class="mt-4 space-y-3">
				{#each mealPlans as mp (mp.id)}
					<li class="rounded border border-gray-200 p-3">
						<div class="flex items-baseline justify-between gap-3">
							<span class="font-medium">{mp.name}</span>
							<span class="text-sm text-gray-700">{mp.status}</span>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</main>
