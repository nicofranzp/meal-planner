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

	$effect(() => {
		void loadHousehold()
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
	{:else}
		<p class="mt-4">No household found.</p>
	{/if}
</main>
