<script lang="ts">
	type TemplateDto = {
		id: string
		householdId: string
		name: string
		description: string | null
		durationDays: number
		createdAt: string
		updatedAt: string
	}

	let templates = $state<TemplateDto[]>([])
	let loading = $state(true)
	let error = $state<string | null>(null)

	let name = $state('')
	let description = $state('')
	let durationDays = $state(7)
	let creating = $state(false)

	async function loadTemplates() {
		loading = true
		error = null

		try {
			const res = await fetch('/api/templates')
			if (!res.ok) {
				error = `Failed to load templates (${res.status})`
				templates = []
				return
			}

			const data = (await res.json()) as { templates: TemplateDto[] }
			templates = data.templates
		} catch {
			error = 'Failed to load templates'
			templates = []
		} finally {
			loading = false
		}
	}

	async function createTemplate() {
		creating = true
		error = null

		try {
			const trimmedName = name.trim()
			if (trimmedName.length === 0) {
				error = 'Name is required'
				return
			}

			const dd = Number(durationDays)
			if (!Number.isFinite(dd) || dd < 1 || Math.floor(dd) !== dd) {
				error = 'Duration must be an integer >= 1'
				return
			}

			const res = await fetch('/api/templates', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					name: trimmedName,
					description: description.trim() || null,
					durationDays: dd
				})
			})

			if (!res.ok) {
				const payload = (await res.json().catch(() => null)) as { message?: string } | null
				error = payload?.message ?? `Failed to create (${res.status})`
				return
			}

			name = ''
			description = ''
			durationDays = 7
			await loadTemplates()
		} catch {
			error = 'Failed to create template'
		} finally {
			creating = false
		}
	}

	$effect(() => {
		void loadTemplates()
	})
</script>

<main class="mx-auto max-w-xl p-6">
	<div class="flex items-center justify-between gap-4">
		<h1 class="text-2xl font-semibold">Templates</h1>
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
				void createTemplate()
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
				<span class="block text-sm font-medium">Description (optional)</span>
				<input
					class="mt-1 w-full rounded border border-gray-300 px-3 py-2"
					type="text"
					value={description}
					oninput={(e) => {
						description = (e.currentTarget as HTMLInputElement).value
					}}
					disabled={creating}
				/>
			</label>

			<label class="block">
				<span class="block text-sm font-medium">Duration (days)</span>
				<input
					class="mt-1 w-full rounded border border-gray-300 px-3 py-2"
					type="number"
					min="1"
					step="1"
					value={durationDays}
					oninput={(e) => {
						durationDays = Number((e.currentTarget as HTMLInputElement).value)
					}}
					disabled={creating}
				/>
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
		{:else if templates.length === 0}
			<p class="mt-3">No templates yet.</p>
		{:else}
			<ul class="mt-4 space-y-3">
				{#each templates as t (t.id)}
					<li>
						<a class="block rounded border border-gray-200 p-3 hover:bg-gray-50" href={`/templates/${t.id}`}>
							<div class="flex items-baseline justify-between gap-3">
								<span class="font-medium">{t.name}</span>
								<span class="text-sm text-gray-700">{t.durationDays} days</span>
							</div>
							{#if t.description}
								<p class="mt-1 text-sm text-gray-700">{t.description}</p>
							{/if}
						</a>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</main>
