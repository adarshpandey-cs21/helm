<script lang="ts">
	import './layout.css';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
	import NavSearch from '$lib/components/NavSearch.svelte';
	import KeyboardShortcuts from '$lib/components/KeyboardShortcuts.svelte';

	let { children } = $props();
</script>

<KeyboardShortcuts />

<svelte:head>
	<title>Relic · Claude Code control deck</title>
	<link rel="icon" type="image/png" href="/claude.png" />
	<link rel="apple-touch-icon" href="/claude.png" />
	<link rel="preconnect" href="https://rsms.me/" />
	<link rel="stylesheet" href="https://rsms.me/inter/inter.css" />
	<link
		rel="stylesheet"
		href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap"
	/>
</svelte:head>

<div class="min-h-screen bg-ink-950 text-ink-100">
	<header
		class="sticky top-0 z-20 border-b border-ink-800/80 bg-ink-950/80 backdrop-blur-md"
	>
		<div class="mx-auto flex w-full items-center gap-3 px-6 py-3.5 lg:px-10">
			<a href="/" class="group flex items-center gap-2.5">
				<img
					src="/claude.png"
					alt="Claude"
					class="size-8 rounded-lg bg-white/5 object-contain p-0.5 ring-1 ring-inset ring-ink-800"
				/>
				<div class="leading-tight">
					<div class="text-sm font-semibold tracking-tight">Relic</div>
					<div class="text-[10px] uppercase tracking-[0.18em] text-ink-400">Claude Code</div>
				</div>
			</a>
			<Breadcrumbs />
			<div class="ml-auto flex items-center gap-3 text-xs text-ink-400">
				<div class="hidden lg:block"><NavSearch /></div>
				<ThemeToggle />
			</div>
		</div>
	</header>

	<main class="mx-auto w-full px-6 py-10 lg:px-10">
		{@render children()}
	</main>

	<footer class="mx-auto w-full px-6 pb-12 pt-8 lg:px-10 text-xs text-ink-500">
		<div class="flex items-center justify-between border-t border-ink-800/80 pt-6">
			<span>Relic · all data stays on your machine</span>
		</div>
	</footer>
</div>
