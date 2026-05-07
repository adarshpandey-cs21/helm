<script lang="ts">
	import { pinned } from '$lib/pinned.svelte';

	let {
		kind,
		projectId,
		sessionId
	}: {
		kind: 'session' | 'project';
		projectId: string;
		sessionId?: string;
	} = $props();

	const isPinned = $derived.by(() => {
		if (kind === 'project') return pinned.hasProject(projectId);
		return pinned.hasSession(projectId, sessionId ?? '');
	});

	function onClick(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		if (kind === 'project') pinned.toggleProject(projectId);
		else if (sessionId) pinned.toggleSession(projectId, sessionId);
	}
</script>

<button
	type="button"
	onclick={onClick}
	aria-label={isPinned ? 'Unpin' : 'Pin'}
	title={isPinned ? 'Unpin from top' : 'Pin to top'}
	class="grid size-8 shrink-0 place-items-center rounded-lg border transition {isPinned
		? 'border-warm-500/40 bg-warm-500/15 text-warm-400 shadow-sm shadow-warm-500/20'
		: 'border-ink-800 bg-ink-900/40 text-ink-500 opacity-0 group-hover:opacity-100 hover:border-ink-700 hover:text-ink-200'}"
>
	{#if isPinned}
		<svg class="size-4" viewBox="0 0 24 24" fill="currentColor">
			<path
				d="M16 4.5a1 1 0 0 1 1 1V9.4a1 1 0 0 0 .29.7l2 2A1 1 0 0 1 19 13.7V14a1 1 0 0 1-1 1h-5v6.5a1 1 0 0 1-2 0V15H6a1 1 0 0 1-1-1v-.3a1 1 0 0 1 .29-.7l2-2A1 1 0 0 0 7.5 9.4V5.5a1 1 0 0 1 1-1Z"
			/>
		</svg>
	{:else}
		<svg
			class="size-4"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
		>
			<path d="M16 4.5v5l2 2v1h-5v6.5M11 4.5v5l-2 2v1h5" />
			<path d="M12 19v2.5" />
		</svg>
	{/if}
</button>
