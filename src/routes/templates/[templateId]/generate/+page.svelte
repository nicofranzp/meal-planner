<script lang="ts">
	type TemplateDto = {
		id: string
		name: string
		description: string | null
		durationDays: number
	}

	let { params } = $props<{ params: { templateId: string } }>()

	let template = $state<TemplateDto | null>(null)
	let loading = $state(true)
	let error = $state<string | null>(null)

	let mealPlanName = $state('')
	let startDate = $state('')
	let generating = $state(false)

	async function loadTemplate() {
		loading = true
		error = null

		try {
			const res = await fetch(`/api/templates/${params.templateId}`)
			if (res.status === 404) {
				template = null
				error = 'Template not found'
				return
			}
			if (!res.ok) throw new Error(`Failed to load template (${res.status})`)
			const data = (await res.json()) as { id: string; name: string; description: string | null; durationDays: number }
			template = { id: data.id, name: data.name, description: data.description, durationDays: data.durationDays }
		} catch (e) {
			template = null
			error = e instanceof Error ? e.message : 'Failed to load template'
		} finally {
			loading = false
		}
	}

	async function generateMealPlan() {
		generating = true
		error = null

		try {
			const trimmed = mealPlanName.trim()
			if (trimmed.length === 0) {
				error = 'MealPlan name is required'
				return
			}
			const sd = startDate.trim()
			if (!/^\d{4}-\d{2}-\d{2}$/.test(sd)) {
				error = 'Start date is required (YYYY-MM-DD)'
				return
			}

			const res = await fetch(`/api/templates/${params.templateId}/generate`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ name: trimmed, startDate: sd })
			})

			if (!res.ok) {
				const payload = (await res.json().catch(() => null)) as { message?: string } | null
				error = payload?.message ?? `Failed to generate (${res.status})`
				return
			}

			const created = (await res.json()) as { id: string }
			window.location.href = `/mealplans/${created.id}`
		} catch {
			error = 'Failed to generate meal plan'
		} finally {
			generating = false
		}
	}

	$effect(() => {
		void loadTemplate()
	})
</script>

<main class="mx-auto max-w-xl p-6">
	<div class="flex items-start justify-between gap-4">
		<div>
			<h1 class="text-2xl font-semibold">Generate MealPlan</h1>
			{#if template}
				<p class="mt-1 text-sm text-gray-700">From template: {template.name}</p>
			{/if}
		</div>
		<a class="text-sm underline" href={`/templates/${params.templateId}`}>Back to Template</a>
	</div>

	{#if error}
		<p class="mt-4 text-red-600">{error}</p>
	{/if}

	{#if loading}
		<p class="mt-4">Loading…</p>
	{:else if template}
		<form
			class="mt-6 grid gap-3"
			onsubmit={(e) => {
				e.preventDefault()
				void generateMealPlan()
			}}
		>
			<label class="block">
				<span class="block text-sm font-medium">MealPlan name</span>
				<input
					class="mt-1 w-full rounded border border-gray-300 px-3 py-2"
					type="text"
					value={mealPlanName}
					oninput={(e) => {
						mealPlanName = (e.currentTarget as HTMLInputElement).value
					}}
					disabled={generating}
				/>
			</label>

			<label class="block">
				<span class="block text-sm font-medium">Start date</span>
				<input
					class="mt-1 w-full rounded border border-gray-300 px-3 py-2"
					type="date"
					value={startDate}
					oninput={(e) => {
						startDate = (e.currentTarget as HTMLInputElement).value
					}}
					disabled={generating}
				/>
			</label>

			<button class="rounded bg-black px-4 py-2 text-white disabled:opacity-60" type="submit" disabled={generating}>
				{generating ? 'Generating…' : 'Generate'}
			</button>
		</form>
	{/if}
</main>
