<script lang="ts">
	import { goto } from '$app/navigation'

	type IngredientDto = {
		id: string
		name: string
		unit: string
	}

	type RecipeIngredientDto = {
		id: string
		ingredientId: string
		quantity: number
		unit: string
		ingredient: { id: string; name: string; unit: string }
	}

	type RecipeDto = {
		id: string
		name: string
		description: string | null
		servings: number
		instructions: string
		notes: string | null
		ingredients: RecipeIngredientDto[]
	}

	type IngredientRow = {
		ingredientId: string
		quantity: string
		unit: string
	}

	let { params } = $props<{ params: { id: string } }>()

	let ingredients = $state<IngredientDto[]>([])
	let ingredientsLoading = $state(true)
	let ingredientsError = $state<string | null>(null)

	let recipe = $state<RecipeDto | null>(null)
	let loading = $state(true)
	let error = $state<string | null>(null)
	let saving = $state(false)

	let name = $state('')
	let description = $state('')
	let servings = $state('1')
	let instructions = $state('')
	let notes = $state('')
	let rows = $state<IngredientRow[]>([{ ingredientId: '', quantity: '1', unit: '' }])

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

	async function loadRecipe() {
		loading = true
		error = null

		try {
			const res = await fetch(`/api/recipes/${params.id}`)
			if (res.status === 404) {
				recipe = null
				error = 'Recipe not found'
				return
			}
			if (!res.ok) {
				recipe = null
				error = `Failed to load recipe (${res.status})`
				return
			}

			recipe = (await res.json()) as RecipeDto

			name = recipe.name
			description = recipe.description ?? ''
			servings = String(recipe.servings)
			instructions = recipe.instructions
			notes = recipe.notes ?? ''
			rows = recipe.ingredients.map((ri) => ({
				ingredientId: ri.ingredientId,
				quantity: String(ri.quantity),
				unit: ri.unit
			}))
			if (rows.length === 0) rows = [{ ingredientId: '', quantity: '1', unit: '' }]
		} catch {
			recipe = null
			error = 'Failed to load recipe'
		} finally {
			loading = false
		}
	}

	function addRow() {
		rows = [...rows, { ingredientId: '', quantity: '1', unit: '' }]
	}

	function removeRow(index: number) {
		rows = rows.filter((_, i) => i !== index)
		if (rows.length === 0) rows = [{ ingredientId: '', quantity: '1', unit: '' }]
	}

	function setIngredientId(index: number, ingredientId: string) {
		rows = rows.map((row, i) => {
			if (i !== index) return row

			const selected = ingredients.find((ing) => ing.id === ingredientId)
			const nextUnit = row.unit.trim().length === 0 ? selected?.unit ?? '' : row.unit
			return { ...row, ingredientId, unit: nextUnit }
		})
	}

	function setRowQuantity(index: number, quantity: string) {
		rows = rows.map((row, i) => (i === index ? { ...row, quantity } : row))
	}

	function setRowUnit(index: number, unit: string) {
		rows = rows.map((row, i) => (i === index ? { ...row, unit } : row))
	}

	async function save() {
		if (!recipe) return

		saving = true
		error = null

		try {
			const trimmedName = name.trim()
			if (trimmedName.length === 0) {
				error = 'Name is required'
				return
			}

			const servingsNumber = Number(servings)
			if (!Number.isFinite(servingsNumber) || servingsNumber <= 0) {
				error = 'Servings must be a number > 0'
				return
			}

			const trimmedInstructions = instructions.trim()
			if (trimmedInstructions.length === 0) {
				error = 'Instructions are required'
				return
			}

			const parsed = rows.map((row) => ({
				ingredientId: row.ingredientId,
				quantity: Number(row.quantity),
				unit: row.unit.trim()
			}))

			for (const item of parsed) {
				if (!item.ingredientId) {
					error = 'All ingredient rows must have an ingredient'
					return
				}
				if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
					error = 'All ingredient quantities must be numbers > 0'
					return
				}
			}

			const ingredientIds = parsed.map((p) => p.ingredientId)
			if (new Set(ingredientIds).size !== ingredientIds.length) {
				error = 'Ingredient list contains duplicates'
				return
			}

			const res = await fetch(`/api/recipes/${recipe.id}`, {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					name: trimmedName,
					description: description.trim() || null,
					servings: servingsNumber,
					instructions: trimmedInstructions,
					notes: notes.trim() || null
				})
			})

			if (!res.ok) {
				const payload = (await res.json().catch(() => null)) as { message?: string } | null
				error = payload?.message ?? `Failed to save (${res.status})`
				return
			}

			const res2 = await fetch(`/api/recipes/${recipe.id}/ingredients`, {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					ingredients: parsed.map((p) => ({
						ingredientId: p.ingredientId,
						quantity: p.quantity,
						unit: p.unit.length === 0 ? undefined : p.unit
					}))
				})
			})

			if (!res2.ok) {
				const payload = (await res2.json().catch(() => null)) as { message?: string } | null
				error = payload?.message ?? `Failed to save ingredients (${res2.status})`
				return
			}

			await goto(`/recipes/${recipe.id}`)
		} catch {
			error = 'Failed to save recipe'
		} finally {
			saving = false
		}
	}

	$effect(() => {
		void loadIngredients()
		void loadRecipe()
	})
</script>

<main class="mx-auto max-w-xl p-6">
	<h1 class="text-2xl font-semibold">Edit Recipe</h1>
	<a class="mt-4 inline-block text-sm underline" href={`/recipes/${params.id}`}>Back to recipe</a>

	{#if loading}
		<p class="mt-4">Loading…</p>
	{:else if error}
		<p class="mt-4 text-red-600">{error}</p>
	{:else if recipe}
		{#if ingredientsLoading}
			<p class="mt-4">Loading ingredients…</p>
		{:else if ingredientsError}
			<p class="mt-4 text-red-600">{ingredientsError}</p>
		{/if}

		<form
			class="mt-6 space-y-4"
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

			<label class="block">
				<span class="block text-sm font-medium">Description (optional)</span>
				<input
					class="mt-1 w-full rounded border border-gray-300 px-3 py-2"
					type="text"
					value={description}
					oninput={(e) => {
						description = (e.currentTarget as HTMLInputElement).value
					}}
					disabled={saving}
					autocomplete="off"
				/>
			</label>

			<label class="block">
				<span class="block text-sm font-medium">Servings</span>
				<input
					class="mt-1 w-full rounded border border-gray-300 px-3 py-2"
					type="number"
					step="0.1"
					min="0"
					value={servings}
					oninput={(e) => {
						servings = (e.currentTarget as HTMLInputElement).value
					}}
					disabled={saving}
				/>
			</label>

			<label class="block">
				<span class="block text-sm font-medium">Instructions</span>
				<textarea
					class="mt-1 min-h-32 w-full rounded border border-gray-300 px-3 py-2"
					value={instructions}
					oninput={(e) => {
						instructions = (e.currentTarget as HTMLTextAreaElement).value
					}}
					disabled={saving}
				></textarea>
			</label>

			<label class="block">
				<span class="block text-sm font-medium">Notes (optional)</span>
				<textarea
					class="mt-1 min-h-24 w-full rounded border border-gray-300 px-3 py-2"
					value={notes}
					oninput={(e) => {
						notes = (e.currentTarget as HTMLTextAreaElement).value
					}}
					disabled={saving}
				></textarea>
			</label>

			<section class="space-y-3">
				<div class="flex items-center justify-between gap-4">
					<h2 class="text-lg font-semibold">Ingredients</h2>
					<button
						class="rounded border border-gray-300 px-3 py-2 text-sm"
						type="button"
						onclick={addRow}
						disabled={saving}
					>
						Add row
					</button>
				</div>

				{#each rows as row, index (index)}
					<div class="grid grid-cols-1 gap-3 rounded border border-gray-200 p-3">
						<label class="block">
							<span class="block text-sm font-medium">Ingredient</span>
							<select
								class="mt-1 w-full rounded border border-gray-300 px-3 py-2"
								value={row.ingredientId}
								onchange={(e) => {
									setIngredientId(index, (e.currentTarget as HTMLSelectElement).value)
								}}
								disabled={saving || ingredientsLoading || ingredients.length === 0}
							>
								<option value="">Select…</option>
								{#each ingredients as ing (ing.id)}
									<option value={ing.id}>{ing.name} ({ing.unit})</option>
								{/each}
							</select>
						</label>

						<label class="block">
							<span class="block text-sm font-medium">Quantity</span>
							<input
								class="mt-1 w-full rounded border border-gray-300 px-3 py-2"
								type="number"
								step="0.01"
								min="0"
								value={row.quantity}
								oninput={(e) => {
									setRowQuantity(index, (e.currentTarget as HTMLInputElement).value)
								}}
								disabled={saving}
							/>
						</label>

						<label class="block">
							<span class="block text-sm font-medium">Unit</span>
							<input
								class="mt-1 w-full rounded border border-gray-300 px-3 py-2"
								type="text"
								value={row.unit}
								oninput={(e) => {
									setRowUnit(index, (e.currentTarget as HTMLInputElement).value)
								}}
								disabled={saving}
								autocomplete="off"
							/>
						</label>

						<div class="flex items-center justify-between">
							<span class="text-xs text-gray-700">Leave unit blank to use ingredient default.</span>
							<button
								class="rounded border border-gray-300 px-3 py-2 text-sm"
								type="button"
								onclick={() => removeRow(index)}
								disabled={saving}
							>
								Remove
							</button>
						</div>
					</div>
				{/each}
			</section>

			<div class="flex items-center gap-3">
				<button class="rounded bg-black px-4 py-2 text-white disabled:opacity-60" type="submit" disabled={saving}>
					{saving ? 'Saving…' : 'Save'}
				</button>
				<a class="text-sm underline" href={`/recipes/${params.id}`}>Cancel</a>
			</div>
		</form>
	{/if}
</main>
