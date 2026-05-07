<script lang="ts">
	import { onMount } from 'svelte';

	let theme = $state<'dark' | 'light'>('dark');
	let mounted = $state(false);

	onMount(() => {
		const stored = localStorage.getItem('theme');
		if (stored === 'light' || stored === 'dark') theme = stored;
		else theme = (document.documentElement.getAttribute('data-theme') as 'dark' | 'light') ?? 'dark';
		mounted = true;
	});

	$effect(() => {
		if (!mounted) return;
		document.documentElement.setAttribute('data-theme', theme);
		try {
			localStorage.setItem('theme', theme);
		} catch {
			/* ignore */
		}
	});

	function toggle() {
		theme = theme === 'dark' ? 'light' : 'dark';
	}
</script>

<button
	type="button"
	onclick={toggle}
	aria-label="Toggle color theme"
	title={theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
	class="grid size-9 place-items-center rounded-lg border border-ink-800 bg-ink-900/60 text-ink-300 transition hover:border-ink-700 hover:text-ink-100"
>
	{#if theme === 'dark'}
		<svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<circle cx="12" cy="12" r="4" />
			<path d="M12 2v2" />
			<path d="M12 20v2" />
			<path d="m4.93 4.93 1.41 1.41" />
			<path d="m17.66 17.66 1.41 1.41" />
			<path d="M2 12h2" />
			<path d="M20 12h2" />
			<path d="m4.93 19.07 1.41-1.41" />
			<path d="m17.66 6.34 1.41-1.41" />
		</svg>
	{:else}
		<svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
		</svg>
	{/if}
</button>
