<script lang="ts">
	type HouseholdDto = {
		id: string
		name: string
	}

	let household = $state<HouseholdDto | null>(null)
	let name = $state('')
	let loading = $state(true)
	let saving = $state(false)
	let error = $state<string | null>(null)
	let savedMessage = $state<string | null>(null)

	type PersonDto = {
		id: string
		householdId: string
		name: string
		portionFactor: number
	}

	let people = $state<PersonDto[]>([])
	let peopleLoading = $state(true)
	let peopleError = $state<string | null>(null)
	let addingPerson = $state(false)
	let personName = $state('')
	let personPortionFactor = $state('1.0')

	type IngredientDto = {
		id: string
		name: string
		unit: string
		createdAt: string
		updatedAt: string
	}

	let ingredients = $state<IngredientDto[]>([])
	let ingredientsLoading = $state(true)
	let ingredientsError = $state<string | null>(null)
	let addingIngredient = $state(false)
	let ingredientName = $state('')
	let ingredientUnit = $state('')

	type PantryAvailability = 'HAVE' | 'LOW' | 'OUT'

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

	let pantryItems = $state<PantryItemDto[]>([])
	let pantryLoading = $state(true)
	let pantryError = $state<string | null>(null)
	let addingPantryItem = $state(false)
	let pantryIngredientId = $state('')
	let pantryAvailability = $state<PantryAvailability>('HAVE')
	let updatingPantryItemId = $state<string | null>(null)

	async function loadHousehold() {
		loading = true
		error = null
		savedMessage = null

		try {
			const res = await fetch('/api/household')
			if (!res.ok) {
				error = `Failed to load household (${res.status})`
				return
			}

			const data = (await res.json()) as HouseholdDto
			household = data
			name = data.name
		} catch {
			error = 'Failed to load household'
		} finally {
			loading = false
		}
	}

	async function save() {
		if (!household) return

		saving = true
		error = null
		savedMessage = null

		try {
			const res = await fetch('/api/household', {
				method: 'PUT',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ name })
			})

			if (!res.ok) {
				const payload = (await res.json().catch(() => null)) as { message?: string } | null
				error = payload?.message ?? `Failed to save (${res.status})`
				return
			}

			const updated = (await res.json()) as HouseholdDto
			household = updated
			name = updated.name
			savedMessage = 'Saved'
		} catch {
			error = 'Failed to save'
		} finally {
			saving = false
		}
	}

	async function loadPeople() {
		peopleLoading = true
		peopleError = null

		try {
			const res = await fetch('/api/people')
			if (!res.ok) {
				peopleError = `Failed to load people (${res.status})`
				people = []
				return
			}

			const data = (await res.json()) as { householdId: string; people: PersonDto[] }
			people = data.people
		} catch {
			peopleError = 'Failed to load people'
			people = []
		} finally {
			peopleLoading = false
		}
	}

	async function addPerson() {
		addingPerson = true
		peopleError = null
		savedMessage = null

		try {
			const trimmed = personName.trim()
			const portion = Number(personPortionFactor)

			const res = await fetch('/api/people', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					name: trimmed,
					portionFactor: Number.isFinite(portion) ? portion : undefined
				})
			})

			if (!res.ok) {
				const payload = (await res.json().catch(() => null)) as { message?: string } | null
				peopleError = payload?.message ?? `Failed to add (${res.status})`
				return
			}

			personName = ''
			personPortionFactor = '1.0'
			await loadPeople()
		} catch {
			peopleError = 'Failed to add person'
		} finally {
			addingPerson = false
		}
	}

	async function loadIngredients() {
		ingredientsLoading = true
		ingredientsError = null

		try {
			const res = await fetch('/api/ingredients')
			if (!res.ok) {
				ingredientsError = `Failed to load ingredients (${res.status})`
				ingredients = []
				return
			}

			const data = (await res.json()) as { ingredients: IngredientDto[] }
			ingredients = data.ingredients
		} catch {
			ingredientsError = 'Failed to load ingredients'
			ingredients = []
		} finally {
			ingredientsLoading = false
		}
	}

	async function addIngredient() {
		addingIngredient = true
		ingredientsError = null

		try {
			const name = ingredientName.trim()
			const unit = ingredientUnit.trim()

			const res = await fetch('/api/ingredients', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ name, unit })
			})

			if (!res.ok) {
				const payload = (await res.json().catch(() => null)) as { message?: string } | null
				ingredientsError = payload?.message ?? `Failed to add (${res.status})`
				return
			}

			ingredientName = ''
			ingredientUnit = ''
			await loadIngredients()
		} catch {
			ingredientsError = 'Failed to add ingredient'
		} finally {
			addingIngredient = false
		}
	}

	async function loadPantry() {
		pantryLoading = true
		pantryError = null

		try {
			const res = await fetch('/api/pantry')
			if (!res.ok) {
				pantryError = `Failed to load pantry (${res.status})`
				pantryItems = []
				return
			}

			const data = (await res.json()) as { householdId: string; items: PantryItemDto[] }
			pantryItems = data.items
		} catch {
			pantryError = 'Failed to load pantry'
			pantryItems = []
		} finally {
			pantryLoading = false
		}
	}

	async function addPantry() {
		addingPantryItem = true
		pantryError = null

		try {
			if (ingredients.length === 0) {
				pantryError = 'Create an ingredient first'
				return
			}

			const ingredientId = pantryIngredientId || ingredients[0]?.id
			if (!ingredientId) {
				pantryError = 'Select an ingredient'
				return
			}

			const res = await fetch('/api/pantry', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ ingredientId, availability: pantryAvailability })
			})

			if (!res.ok) {
				const payload = (await res.json().catch(() => null)) as { message?: string } | null
				pantryError = payload?.message ?? `Failed to add (${res.status})`
				return
			}

			pantryIngredientId = ''
			pantryAvailability = 'HAVE'
			await loadPantry()
		} catch {
			pantryError = 'Failed to add pantry item'
		} finally {
			addingPantryItem = false
		}
	}

	async function updatePantryAvailability(itemId: string, availability: PantryAvailability) {
		updatingPantryItemId = itemId
		pantryError = null

		try {
			const res = await fetch(`/api/pantry/${itemId}`, {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ availability })
			})

			if (!res.ok) {
				const payload = (await res.json().catch(() => null)) as { message?: string } | null
				pantryError = payload?.message ?? `Failed to update (${res.status})`
				return
			}

			await loadPantry()
		} catch {
			pantryError = 'Failed to update pantry item'
		} finally {
			updatingPantryItemId = null
		}
	}

	$effect(() => {
		void loadHousehold()
		void loadPeople()
		void loadIngredients()
		void loadPantry()
	})
</script>

<main class="mx-auto max-w-xl p-6">
	<h1 class="text-2xl font-semibold">Household</h1>

	{#if loading}
		<p class="mt-4">Loading…</p>
	{:else if error}
		<p class="mt-4 text-red-600">{error}</p>
	{:else if household}
		<form
			class="mt-4 space-y-3"
			onsubmit={(e) => {
				e.preventDefault()
				void save()
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
					disabled={saving}
					autocomplete="off"
				/>
			</label>

			<div class="flex items-center gap-3">
				<button
					class="rounded bg-black px-4 py-2 text-white disabled:opacity-60"
					type="submit"
					disabled={saving}
				>
					{saving ? 'Saving…' : 'Save'}
				</button>
				{#if savedMessage}
					<span class="text-sm">{savedMessage}</span>
				{/if}
			</div>
		</form>

		<section class="mt-10">
			<h2 class="text-xl font-semibold">People</h2>

			{#if peopleLoading}
				<p class="mt-3">Loading…</p>
			{:else if peopleError}
				<p class="mt-3 text-red-600">{peopleError}</p>
			{/if}

			<form
				class="mt-4 grid gap-3"
				onsubmit={(e) => {
					e.preventDefault()
					void addPerson()
				}}
			>
				<label class="block">
					<span class="block text-sm font-medium">Name</span>
					<input
						class="mt-1 w-full rounded border border-gray-300 px-3 py-2"
						type="text"
						value={personName}
						oninput={(e) => {
							personName = (e.currentTarget as HTMLInputElement).value
						}}
						disabled={addingPerson}
						autocomplete="off"
					/>
				</label>

				<label class="block">
					<span class="block text-sm font-medium">Portion factor</span>
					<input
						class="mt-1 w-full rounded border border-gray-300 px-3 py-2"
						type="number"
						step="0.1"
						min="0.1"
						value={personPortionFactor}
						oninput={(e) => {
							personPortionFactor = (e.currentTarget as HTMLInputElement).value
						}}
						disabled={addingPerson}
					/>
				</label>

				<div class="flex items-center gap-3">
					<button
						class="rounded bg-black px-4 py-2 text-white disabled:opacity-60"
						type="submit"
						disabled={addingPerson}
					>
						{addingPerson ? 'Adding…' : 'Add person'}
					</button>
				</div>
			</form>

			{#if !peopleLoading && !peopleError}
				{#if people.length === 0}
					<p class="mt-4 text-sm">No people yet.</p>
				{:else}
					<ul class="mt-4 space-y-2">
						{#each people as person (person.id)}
							<li class="rounded border border-gray-200 px-3 py-2">
								<div class="font-medium">{person.name}</div>
								<div class="text-sm text-gray-600">Portion factor: {person.portionFactor}</div>
							</li>
						{/each}
					</ul>
				{/if}
			{/if}
		</section>

		<section class="mt-10">
			<h2 class="text-xl font-semibold">Ingredients</h2>

			{#if ingredientsLoading}
				<p class="mt-3">Loading…</p>
			{:else if ingredientsError}
				<p class="mt-3 text-red-600">{ingredientsError}</p>
			{/if}

			<form
				class="mt-4 grid gap-3"
				onsubmit={(e) => {
					e.preventDefault()
					void addIngredient()
				}}
			>
				<label class="block">
					<span class="block text-sm font-medium">Name</span>
					<input
						class="mt-1 w-full rounded border border-gray-300 px-3 py-2"
						type="text"
						value={ingredientName}
						oninput={(e) => {
							ingredientName = (e.currentTarget as HTMLInputElement).value
						}}
						disabled={addingIngredient}
						autocomplete="off"
					/>
				</label>

				<label class="block">
					<span class="block text-sm font-medium">Unit</span>
					<input
						class="mt-1 w-full rounded border border-gray-300 px-3 py-2"
						type="text"
						value={ingredientUnit}
						oninput={(e) => {
							ingredientUnit = (e.currentTarget as HTMLInputElement).value
						}}
						disabled={addingIngredient}
						autocomplete="off"
					/>
				</label>

				<div class="flex items-center gap-3">
					<button
						class="rounded bg-black px-4 py-2 text-white disabled:opacity-60"
						type="submit"
						disabled={addingIngredient}
					>
						{addingIngredient ? 'Adding…' : 'Add ingredient'}
					</button>
				</div>
			</form>

			{#if !ingredientsLoading && !ingredientsError}
				{#if ingredients.length === 0}
					<p class="mt-4 text-sm">No ingredients yet.</p>
				{:else}
					<ul class="mt-4 space-y-2">
						{#each ingredients as ingredient (ingredient.id)}
							<li class="rounded border border-gray-200 px-3 py-2">
								<div class="font-medium">{ingredient.name}</div>
								<div class="text-sm text-gray-600">Unit: {ingredient.unit}</div>
							</li>
						{/each}
					</ul>
				{/if}
			{/if}
		</section>

		<section class="mt-10">
			<h2 class="text-xl font-semibold">Pantry</h2>

			{#if pantryLoading}
				<p class="mt-3">Loading…</p>
			{:else if pantryError}
				<p class="mt-3 text-red-600">{pantryError}</p>
			{/if}

			<form
				class="mt-4 grid gap-3"
				onsubmit={(e) => {
					e.preventDefault()
					void addPantry()
				}}
			>
				<label class="block">
					<span class="block text-sm font-medium">Ingredient</span>
					<select
						class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2"
						value={pantryIngredientId}
						onchange={(e) => {
							pantryIngredientId = (e.currentTarget as HTMLSelectElement).value
						}}
						disabled={addingPantryItem || ingredients.length === 0}
					>
						<option value="" disabled selected={pantryIngredientId === ''}>
							{ingredients.length === 0 ? 'No ingredients yet' : 'Select an ingredient'}
						</option>
						{#each ingredients as ingredient (ingredient.id)}
							<option value={ingredient.id}>{ingredient.name} ({ingredient.unit})</option>
						{/each}
					</select>
				</label>

				<label class="block">
					<span class="block text-sm font-medium">Availability</span>
					<select
						class="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2"
						value={pantryAvailability}
						onchange={(e) => {
							pantryAvailability = (e.currentTarget as HTMLSelectElement).value as PantryAvailability
						}}
						disabled={addingPantryItem}
					>
						<option value="HAVE">HAVE</option>
						<option value="LOW">LOW</option>
						<option value="OUT">OUT</option>
					</select>
				</label>

				<div class="flex items-center gap-3">
					<button
						class="rounded bg-black px-4 py-2 text-white disabled:opacity-60"
						type="submit"
						disabled={addingPantryItem || ingredients.length === 0}
					>
						{addingPantryItem ? 'Adding…' : 'Add to pantry'}
					</button>
				</div>
			</form>

			{#if !pantryLoading && !pantryError}
				{#if pantryItems.length === 0}
					<p class="mt-4 text-sm">No pantry items yet.</p>
				{:else}
					<ul class="mt-4 space-y-2">
						{#each pantryItems as item (item.id)}
							<li class="rounded border border-gray-200 px-3 py-2">
								<div class="font-medium">{item.ingredient.name}</div>
								<div class="mt-2 flex items-center gap-3">
									<label class="text-sm text-gray-600" for={`pantry-availability-${item.id}`}>
										Availability
									</label>
									<select
										id={`pantry-availability-${item.id}`}
										class="rounded border border-gray-300 bg-white px-2 py-1"
										value={item.availability}
										onchange={(e) => {
											const value = (e.currentTarget as HTMLSelectElement).value as PantryAvailability
											void updatePantryAvailability(item.id, value)
										}}
										disabled={updatingPantryItemId === item.id}
									>
										<option value="HAVE">HAVE</option>
										<option value="LOW">LOW</option>
										<option value="OUT">OUT</option>
									</select>
								</div>
							</li>
						{/each}
					</ul>
				{/if}
			{/if}
		</section>
	{:else}
		<p class="mt-4">No household found.</p>
	{/if}
</main>
