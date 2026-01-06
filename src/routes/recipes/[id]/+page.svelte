<script lang="ts">
	import { goto } from '$app/navigation'

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
		createdAt: string
		updatedAt: string
		ingredients: RecipeIngredientDto[]
	}

	let { params } = $props<{ params: { id: string } }>()

	let recipe = $state<RecipeDto | null>(null)
	let loading = $state(true)
	let error = $state<string | null>(null)
	let deleting = $state(false)

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
		} catch {
			recipe = null
			error = 'Failed to load recipe'
		} finally {
			loading = false
		}
	}

	async function deleteRecipe() {
		if (!recipe) return
		if (!confirm('Delete this recipe?')) return

		deleting = true
		error = null

		try {
			const res = await fetch(`/api/recipes/${recipe.id}`, { method: 'DELETE' })
			if (!res.ok) {
				const payload = (await res.json().catch(() => null)) as { message?: string } | null
				error = payload?.message ?? `Failed to delete (${res.status})`
				return
			}

			await goto('/recipes')
		} catch {
			error = 'Failed to delete recipe'
		} finally {
			deleting = false
		}
	}

	$effect(() => {
		void loadRecipe()
	})
</script>

<main class="mx-auto max-w-xl p-6">
	<div class="flex items-center justify-between gap-4">
		<h1 class="text-2xl font-semibold">Recipe</h1>
		<a class="text-sm underline" href="/recipes">Back</a>
	</div>

	{#if loading}
		<p class="mt-4">Loading…</p>
	{:else if error}
		<p class="mt-4 text-red-600">{error}</p>
	{:else if recipe}
		<div class="mt-4 space-y-6">
			<section class="space-y-2">
				<div class="flex items-start justify-between gap-4">
					<div>
						<h2 class="text-xl font-semibold">{recipe.name}</h2>
						<p class="mt-1 text-sm text-gray-700">{recipe.servings} servings</p>
					</div>
					<div class="flex items-center gap-3">
						<a class="rounded border border-gray-300 px-3 py-2 text-sm" href={`/recipes/${recipe.id}/edit`}>Edit</a>
						<button
							class="rounded border border-gray-300 px-3 py-2 text-sm disabled:opacity-60"
							type="button"
							onclick={() => {
								void deleteRecipe()
							}}
							disabled={deleting}
						>
							{deleting ? 'Deleting…' : 'Delete'}
						</button>
					</div>
				</div>

				{#if recipe.description}
					<p class="text-sm text-gray-700">{recipe.description}</p>
				{/if}
			</section>

			<section>
				<h3 class="text-lg font-semibold">Ingredients</h3>
				{#if recipe.ingredients.length === 0}
					<p class="mt-2 text-sm">No ingredients.</p>
				{:else}
					<ul class="mt-2 space-y-1">
						{#each recipe.ingredients as ri (ri.id)}
							<li class="text-sm">
								{ri.quantity} {ri.unit} — {ri.ingredient.name}
							</li>
						{/each}
					</ul>
				{/if}
			</section>

			<section>
				<h3 class="text-lg font-semibold">Instructions</h3>
				<pre class="mt-2 whitespace-pre-wrap rounded border border-gray-200 p-3 text-sm">{recipe.instructions}</pre>
			</section>

			{#if recipe.notes}
				<section>
					<h3 class="text-lg font-semibold">Notes</h3>
					<pre class="mt-2 whitespace-pre-wrap rounded border border-gray-200 p-3 text-sm">{recipe.notes}</pre>
				</section>
			{/if}
		</div>
	{/if}
</main>
