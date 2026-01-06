<script lang="ts">
	type RecipeDto = {
		id: string
		name: string
		description: string | null
		servings: number
	}

	let recipes = $state<RecipeDto[]>([])
	let loading = $state(true)
	let error = $state<string | null>(null)

	async function loadRecipes() {
		loading = true
		error = null

		try {
			const res = await fetch('/api/recipes')
			if (!res.ok) {
				error = `Failed to load recipes (${res.status})`
				recipes = []
				return
			}

			const data = (await res.json()) as { recipes: RecipeDto[] }
			recipes = data.recipes
		} catch {
			error = 'Failed to load recipes'
			recipes = []
		} finally {
			loading = false
		}
	}

	$effect(() => {
		void loadRecipes()
	})
</script>

<main class="mx-auto max-w-xl p-6">
	<div class="flex items-center justify-between gap-4">
		<h1 class="text-2xl font-semibold">Recipes</h1>
		<a class="rounded bg-black px-4 py-2 text-white" href="/recipes/new">Add Recipe</a>
	</div>

	<a class="mt-4 inline-block text-sm underline" href="/">Back to dashboard</a>

	{#if loading}
		<p class="mt-4">Loading…</p>
	{:else if error}
		<p class="mt-4 text-red-600">{error}</p>
	{:else if recipes.length === 0}
		<p class="mt-4">No recipes yet.</p>
	{:else}
		<ul class="mt-4 space-y-3">
			{#each recipes as recipe (recipe.id)}
				<li class="rounded border border-gray-200 p-3">
					<a class="block" href={`/recipes/${recipe.id}`}>
						<div class="flex items-baseline justify-between gap-3">
							<span class="font-medium">{recipe.name}</span>
							<span class="text-sm text-gray-700">{recipe.servings} servings</span>
						</div>
						{#if recipe.description}
							<p class="mt-1 text-sm text-gray-700">{recipe.description}</p>
						{/if}
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</main>
