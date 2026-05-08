<script lang="ts">
	import { goto } from '$app/navigation';

	let {
		projectId,
		sessionId
	}: { projectId: string; sessionId: string } = $props();

	let confirming = $state(false);
	let busy = $state(false);
	let err = $state<string | null>(null);

	async function deleteIt(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		if (busy) return;
		busy = true;
		err = null;
		try {
			const params = new URLSearchParams({ projectId, sessionId });
			const res = await fetch(`/api/session?${params.toString()}`, { method: 'DELETE' });
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				err = data?.message || `Failed (${res.status})`;
				return;
			}
			await goto(`/projects/${encodeURIComponent(projectId)}`);
		} catch (e2) {
			err = String(e2);
		} finally {
			busy = false;
		}
	}
</script>

<div class="relative inline-flex">
	{#if !confirming}
		<button
			type="button"
			onclick={(e) => {
				e.preventDefault();
				e.stopPropagation();
				confirming = true;
			}}
			title="Delete this session permanently"
			class="inline-flex items-center gap-1.5 rounded-lg border border-ink-800 bg-ink-900/40 px-2.5 py-1 text-[11.5px] text-ink-400 transition hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-300"
		>
			<svg
				class="size-3.5"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<polyline points="3 6 5 6 21 6" />
				<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
			</svg>
			Delete
		</button>
	{:else}
		<div class="flex items-center gap-1">
			<span class="text-[11px] text-rose-300">Delete forever?</span>
			<button
				type="button"
				onclick={deleteIt}
				disabled={busy}
				class="rounded-lg border border-rose-500/40 bg-rose-500/15 px-2.5 py-1 text-[11.5px] font-medium text-rose-300 transition hover:bg-rose-500/25 disabled:opacity-60"
			>
				{busy ? 'Deleting…' : 'Yes, delete'}
			</button>
			<button
				type="button"
				onclick={(e) => {
					e.preventDefault();
					e.stopPropagation();
					confirming = false;
				}}
				disabled={busy}
				class="rounded-lg border border-ink-800 bg-ink-900/60 px-2.5 py-1 text-[11.5px] text-ink-400 transition hover:text-ink-100"
			>
				Cancel
			</button>
		</div>
	{/if}
	{#if err}
		<div class="absolute right-0 top-full z-10 mt-1 rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-[11px] text-rose-300">
			{err}
		</div>
	{/if}
</div>
