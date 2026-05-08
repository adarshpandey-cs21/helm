<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	let q = $state('');
	let inputEl: HTMLInputElement | null = $state(null);

	$effect(() => {
		// Sync input with the URL when on /search.
		const u = page.url;
		if (u.pathname === '/search') q = u.searchParams.get('q') ?? '';
	});

	onMount(() => {
		const onKey = (e: KeyboardEvent) => {
			const isMeta = e.metaKey || e.ctrlKey;
			if (isMeta && e.key.toLowerCase() === 'k') {
				e.preventDefault();
				inputEl?.focus();
				inputEl?.select();
			}
		};
		document.addEventListener('keydown', onKey);
		return () => document.removeEventListener('keydown', onKey);
	});

	function submit(e: SubmitEvent) {
		e.preventDefault();
		const trimmed = q.trim();
		const params = new URLSearchParams();
		if (trimmed) params.set('q', trimmed);
		goto(`/search?${params.toString()}`, { keepFocus: false });
	}
</script>

<form onsubmit={submit} class="relative w-full max-w-[320px]">
	<svg
		class="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-ink-500"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
	>
		<circle cx="11" cy="11" r="7" />
		<path d="m20 20-3.5-3.5" />
	</svg>
	<input
		bind:this={inputEl}
		bind:value={q}
		type="search"
		placeholder="Search history…"
		aria-label="Search across all sessions"
		class="w-full rounded-lg border border-ink-800 bg-ink-900/40 py-1.5 pl-9 pr-12 text-[12.5px] text-ink-100 placeholder:text-ink-500 focus:border-claude-500/40 focus:outline-none focus:ring-2 focus:ring-claude-500/20"
	/>
	<kbd
		class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md border border-ink-700 bg-ink-900 px-1.5 py-0.5 font-mono text-[9.5px] text-ink-500"
	>
		⌘K
	</kbd>
</form>
