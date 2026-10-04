<script lang="ts">
	type MealType = 'breakfast' | 'lunch' | 'dinner'

	type TemplateSlotDto = {
		id: string
		templateId: string
		dayNumber: number
		mealType: MealType
		notes: string | null
		createdAt: string
		updatedAt: string
	}

	type TemplateDto = {
		id: string
		householdId: string
		name: string
		description: string | null
		durationDays: number
		createdAt: string
		updatedAt: string
		slots: TemplateSlotDto[]
	}

	let { params } = $props<{ params: { templateId: string } }>()

	const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner']

	let template = $state<TemplateDto | null>(null)
	let loading = $state(true)
	let error = $state<string | null>(null)

	let dayNumber = $state<number>(1)
	let mealType = $state<MealType>('dinner')
	let notes = $state('')
	let creatingSlot = $state(false)

	let editingSlotId = $state<string | null>(null)
	let editDayNumber = $state<number>(1)
	let editMealType = $state<MealType>('dinner')
	let editNotes = $state('')
	let savingSlotId = $state<string | null>(null)
	let deletingSlotId = $state<string | null>(null)

	const slotsByDay = $derived.by(() => {
		const map = new Map<number, TemplateSlotDto[]>()
		for (const s of template?.slots ?? []) {
			const list = map.get(s.dayNumber) ?? []
			list.push(s)
			map.set(s.dayNumber, list)
		}
		return Array.from(map.entries()).sort((a, b) => a[0] - b[0])
	})

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
			template = (await res.json()) as TemplateDto

			if (dayNumber > template.durationDays) dayNumber = template.durationDays
		} catch (e) {
			template = null
			error = e instanceof Error ? e.message : 'Failed to load template'
		} finally {
			loading = false
		}
	}

	async function createSlot() {
		if (!template) return
		creatingSlot = true
		error = null

		try {
			const dn = Number(dayNumber)
			if (!Number.isFinite(dn) || Math.floor(dn) !== dn || dn < 1) {
				error = 'dayNumber must be an integer >= 1'
				return
			}
			if (dn > template.durationDays) {
				error = 'dayNumber must be <= template durationDays'
				return
			}

			const res = await fetch(`/api/templates/${params.templateId}/slots`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					dayNumber: dn,
					mealType,
					notes: notes.trim() || null
				})
			})

			if (!res.ok) {
				const payload = (await res.json().catch(() => null)) as { message?: string } | null
				error = payload?.message ?? `Failed to create slot (${res.status})`
				return
			}

			notes = ''
			await loadTemplate()
		} catch {
			error = 'Failed to create slot'
		} finally {
			creatingSlot = false
		}
	}

	function openEdit(slot: TemplateSlotDto) {
		editingSlotId = slot.id
		editDayNumber = slot.dayNumber
		editMealType = slot.mealType
		editNotes = slot.notes ?? ''
	}

	async function saveEdit(slotId: string) {
		if (!template) return
		savingSlotId = slotId
		error = null

		try {
			const dn = Number(editDayNumber)
			if (!Number.isFinite(dn) || Math.floor(dn) !== dn || dn < 1) {
				error = 'dayNumber must be an integer >= 1'
				return
			}
			if (dn > template.durationDays) {
				error = 'dayNumber must be <= template durationDays'
				return
			}

			const res = await fetch(`/api/templates/${params.templateId}/slots/${slotId}`, {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					dayNumber: dn,
					mealType: editMealType,
					notes: editNotes.trim() || null
				})
			})

			if (!res.ok) {
				const payload = (await res.json().catch(() => null)) as { message?: string } | null
				error = payload?.message ?? `Failed to update slot (${res.status})`
				return
			}

			editingSlotId = null
			await loadTemplate()
		} catch {
			error = 'Failed to update slot'
		} finally {
			savingSlotId = null
		}
	}

	async function deleteSlot(slotId: string) {
		deletingSlotId = slotId
		error = null

		try {
			const res = await fetch(`/api/templates/${params.templateId}/slots/${slotId}`, {
				method: 'DELETE'
			})

			if (!res.ok) {
				const payload = (await res.json().catch(() => null)) as { message?: string } | null
				error = payload?.message ?? `Failed to delete slot (${res.status})`
				return
			}

			if (editingSlotId === slotId) editingSlotId = null
			await loadTemplate()
		} catch {
			error = 'Failed to delete slot'
		} finally {
			deletingSlotId = null
		}
	}

	$effect(() => {
		void loadTemplate()
	})
</script>

<main class="mx-auto max-w-3xl p-6">
	<div class="flex items-start justify-between gap-4">
		<div>
			<h1 class="text-2xl font-semibold">{template ? template.name : 'Template'}</h1>
			{#if template}
				<p class="mt-1 text-sm text-gray-700">Duration: {template.durationDays} days</p>
				{#if template.description}
					<p class="mt-1 text-sm text-gray-700">{template.description}</p>
				{/if}
			{/if}
		</div>
		<a class="text-sm underline" href="/templates">Back to Templates</a>
	</div>

	{#if error}
		<p class="mt-4 text-red-600">{error}</p>
	{/if}

	{#if loading}
		<p class="mt-4">Loading…</p>
	{:else if template}
		<section class="mt-8">
			<div class="flex items-center justify-between gap-4">
				<h2 class="text-xl font-semibold">Slots</h2>
				<a class="rounded bg-black px-3 py-2 text-sm text-white" href={`/templates/${template.id}/generate`}>Generate MealPlan</a>
			</div>

			{#if template.slots.length === 0}
				<p class="mt-3 text-sm text-gray-700">No slots yet.</p>
			{:else}
				<div class="mt-4 space-y-6">
					{#each slotsByDay as [day, slots] (day)}
						<div class="rounded border border-gray-200 p-4">
							<h3 class="font-semibold">Day {day}</h3>
							<ul class="mt-3 space-y-2">
								{#each slots as slot (slot.id)}
									<li class="rounded border border-gray-100 p-3">
										{#if editingSlotId === slot.id}
											<form
												class="grid gap-2"
												onsubmit={(e) => {
													e.preventDefault()
													void saveEdit(slot.id)
												}}
											>
												<div class="grid grid-cols-3 gap-2">
													<label class="block">
														<span class="block text-xs font-medium">Day</span>
														<input
															class="mt-1 w-full rounded border border-gray-300 px-2 py-1"
															type="number"
															min="1"
															step="1"
															value={editDayNumber}
															oninput={(e) => {
																editDayNumber = Number((e.currentTarget as HTMLInputElement).value)
															}}
															disabled={savingSlotId === slot.id}
														/>
													</label>

													<label class="block">
														<span class="block text-xs font-medium">Meal</span>
														<select
															class="mt-1 w-full rounded border border-gray-300 px-2 py-1"
															value={editMealType}
															onchange={(e) => {
																editMealType = (e.currentTarget as HTMLSelectElement).value as MealType
															}}
															disabled={savingSlotId === slot.id}
														>
															{#each MEAL_TYPES as mt (mt)}
																<option value={mt}>{mt}</option>
															{/each}
														</select>
													</label>

													<label class="block">
														<span class="block text-xs font-medium">Notes</span>
														<input
															class="mt-1 w-full rounded border border-gray-300 px-2 py-1"
															type="text"
															value={editNotes}
															oninput={(e) => {
																editNotes = (e.currentTarget as HTMLInputElement).value
															}}
															disabled={savingSlotId === slot.id}
														/>
													</label>
												</div>

												<div class="flex items-center gap-3">
													<button
														class="rounded bg-black px-3 py-2 text-sm text-white disabled:opacity-60"
														type="submit"
														disabled={savingSlotId === slot.id}
													>
														{savingSlotId === slot.id ? 'Saving…' : 'Save'}
													</button>
													<button
														class="text-sm underline disabled:opacity-60"
														type="button"
														onclick={() => {
															editingSlotId = null
														}}
														disabled={savingSlotId === slot.id}
													>
														Cancel
													</button>
												</div>
											</form>
										{:else}
											<div class="flex items-start justify-between gap-4">
												<div>
													<p class="text-sm">
														<span class="font-medium">{slot.mealType}</span>
														{#if slot.notes}
															<span class="text-gray-700"> — {slot.notes}</span>
														{/if}
													</p>
												</div>
												<div class="flex items-center gap-3">
													<button
														class="text-sm underline disabled:opacity-60"
														type="button"
														onclick={() => openEdit(slot)}
														disabled={deletingSlotId === slot.id}
													>
														Edit
													</button>
													<button
														class="text-sm underline text-red-700 disabled:opacity-60"
														type="button"
														onclick={() => {
															void deleteSlot(slot.id)
														}}
														disabled={deletingSlotId === slot.id}
													>
														{deletingSlotId === slot.id ? 'Deleting…' : 'Delete'}
													</button>
												</div>
											</div>
										{/if}
									</li>
								{/each}
							</ul>
						</div>
					{/each}
				</div>
			{/if}
		</section>

		<section class="mt-10">
			<h2 class="text-xl font-semibold">Add slot</h2>
			<form
				class="mt-4 grid gap-3"
				onsubmit={(e) => {
					e.preventDefault()
					void createSlot()
				}}
			>
				<label class="block">
					<span class="block text-sm font-medium">Day number (1…{template.durationDays})</span>
					<input
						class="mt-1 w-full rounded border border-gray-300 px-3 py-2"
						type="number"
						min="1"
						step="1"
						max={template.durationDays}
						value={dayNumber}
						oninput={(e) => {
							dayNumber = Number((e.currentTarget as HTMLInputElement).value)
						}}
						disabled={creatingSlot}
					/>
				</label>

				<label class="block">
					<span class="block text-sm font-medium">Meal type</span>
					<select
						class="mt-1 w-full rounded border border-gray-300 px-3 py-2"
						value={mealType}
						onchange={(e) => {
							mealType = (e.currentTarget as HTMLSelectElement).value as MealType
						}}
						disabled={creatingSlot}
					>
						{#each MEAL_TYPES as mt (mt)}
							<option value={mt}>{mt}</option>
						{/each}
					</select>
				</label>

				<label class="block">
					<span class="block text-sm font-medium">Notes (optional)</span>
					<input
						class="mt-1 w-full rounded border border-gray-300 px-3 py-2"
						type="text"
						value={notes}
						oninput={(e) => {
							notes = (e.currentTarget as HTMLInputElement).value
						}}
						disabled={creatingSlot}
					/>
				</label>

				<button class="rounded bg-black px-4 py-2 text-white disabled:opacity-60" type="submit" disabled={creatingSlot}>
					{creatingSlot ? 'Adding…' : 'Add slot'}
				</button>
			</form>
		</section>
	{/if}
</main>
