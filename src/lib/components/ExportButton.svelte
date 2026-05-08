<script lang="ts">
	let {
		projectId,
		sessionId
	}: { projectId: string; sessionId: string } = $props();

	let busy = $state(false);
	let toast = $state<{ kind: 'ok' | 'err'; text: string } | null>(null);
	let toastTimer: ReturnType<typeof setTimeout> | null = null;

	function showToast(kind: 'ok' | 'err', text: string) {
		toast = { kind, text };
		if (toastTimer) clearTimeout(toastTimer);
		toastTimer = setTimeout(() => (toast = null), 3000);
	}

	async function copy(includeTools: boolean, e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		if (busy) return;
		busy = true;
		try {
			const params = new URLSearchParams({ projectId, sessionId });
			if (includeTools) params.set('tools', '1');
			const res = await fetch(`/api/export?${params.toString()}`);
			const data = await res.json().catch(() => ({}));
			if (!res.ok || !data.markdown) {
				showToast('err', data?.message || `Failed (${res.status})`);
				return;
			}
			await navigator.clipboard.writeText(data.markdown);
			showToast('ok', 'Markdown copied to clipboard');
		} catch (err) {
			showToast('err', String(err));
		} finally {
			busy = false;
		}
	}
</script>

<div class="relative inline-flex items-center gap-1">
	<button
		type="button"
		onclick={(e) => copy(false, e)}
		disabled={busy}
		title="Copy session as Markdown (chat only)"
		class="inline-flex items-center gap-1.5 rounded-lg border border-ink-700 bg-ink-900/60 px-2.5 py-1 text-[11.5px] font-medium text-ink-200 transition hover:border-ink-600 hover:text-ink-50 disabled:opacity-60"
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
			<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
			<polyline points="7 10 12 15 17 10" />
			<line x1="12" y1="15" x2="12" y2="3" />
		</svg>
		Export MD
	</button>
	<button
		type="button"
		onclick={(e) => copy(true, e)}
		disabled={busy}
		title="Copy as Markdown including tool calls"
		class="rounded-lg border border-ink-800 bg-ink-900/40 px-2 py-1 text-[10.5px] text-ink-400 transition hover:border-ink-700 hover:text-ink-100 disabled:opacity-60"
	>
		+tools
	</button>
	{#if toast}
		<div
			role="status"
			class="absolute right-0 top-full z-30 mt-1.5 whitespace-nowrap rounded-lg border px-3 py-1.5 text-[11.5px] shadow-lg {toast.kind ===
			'ok'
				? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
				: 'border-rose-500/30 bg-rose-500/10 text-rose-200'}"
		>
			{toast.text}
		</div>
	{/if}
</div>
