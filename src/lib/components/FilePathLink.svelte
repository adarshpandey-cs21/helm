<script lang="ts">
	import { onMount } from 'svelte';
	import { editorLink } from '$lib/format';

	let {
		path,
		line,
		display
	}: { path: string; line?: number; display?: string } = $props();

	type Editor = 'vscode' | 'cursor' | 'zed';
	const KEY = 'claude-history-viewer:editor';

	let editor = $state<Editor>('vscode');
	let mounted = $state(false);
	let menuOpen = $state(false);
	let menuRef = $state<HTMLSpanElement | null>(null);

	onMount(() => {
		try {
			const v = localStorage.getItem(KEY);
			if (v === 'vscode' || v === 'cursor' || v === 'zed') editor = v;
		} catch {
			/* ignore */
		}
		mounted = true;

		const onDoc = (e: MouseEvent) => {
			if (!menuOpen) return;
			if (menuRef && !menuRef.contains(e.target as Node)) menuOpen = false;
		};
		document.addEventListener('click', onDoc);
		return () => document.removeEventListener('click', onDoc);
	});

	$effect(() => {
		if (!mounted) return;
		try {
			localStorage.setItem(KEY, editor);
		} catch {
			/* ignore */
		}
	});

	const href = $derived(editorLink(editor, path, line));
	const labelDisplay = $derived(display ?? path);

	const editors: { k: Editor; l: string }[] = [
		{ k: 'vscode', l: 'VS Code' },
		{ k: 'cursor', l: 'Cursor' },
		{ k: 'zed', l: 'Zed' }
	];
</script>

<span class="relative inline-flex items-stretch" bind:this={menuRef}>
	{#if href}
		<a
			href={href}
			title={`Open in ${editors.find((e) => e.k === editor)?.l ?? editor}`}
			class="rounded-md border border-ink-800/60 bg-ink-900/30 px-1.5 py-0.5 font-mono text-[11px] text-ink-300 transition hover:border-claude-500/30 hover:text-claude-300"
		>
			{labelDisplay}
		</a>
	{:else}
		<span
			class="rounded-md border border-ink-800/60 bg-ink-900/30 px-1.5 py-0.5 font-mono text-[11px] text-ink-400"
			>{labelDisplay}</span
		>
	{/if}
	<button
		type="button"
		onclick={(e) => {
			e.preventDefault();
			e.stopPropagation();
			menuOpen = !menuOpen;
		}}
		aria-label="Choose editor"
		title="Choose editor"
		class="ml-0.5 grid place-items-center rounded-md border border-ink-800/60 bg-ink-900/30 px-1 text-ink-500 hover:border-ink-700 hover:text-ink-200"
	>
		<svg
			class="size-3 transition {menuOpen ? 'rotate-180' : ''}"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
		>
			<path d="m6 9 6 6 6-6" />
		</svg>
	</button>

	{#if menuOpen}
		<div
			role="menu"
			class="absolute left-0 top-full z-30 mt-1.5 w-[160px] overflow-hidden rounded-xl border border-ink-700/80 bg-ink-900/95 p-1 shadow-xl shadow-black/40 backdrop-blur"
		>
			{#each editors as e (e.k)}
				<button
					type="button"
					role="menuitemradio"
					aria-checked={editor === e.k}
					onclick={(ev) => {
						ev.preventDefault();
						ev.stopPropagation();
						editor = e.k;
						menuOpen = false;
					}}
					class="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12px] transition hover:bg-ink-800/80 {editor ===
					e.k
						? 'text-claude-300'
						: 'text-ink-200'}"
				>
					<span
						class="grid size-3.5 shrink-0 place-items-center rounded-full border {editor ===
						e.k
							? 'border-claude-400 bg-claude-500/30'
							: 'border-ink-600'}"
					>
						{#if editor === e.k}
							<span class="size-1.5 rounded-full bg-claude-300"></span>
						{/if}
					</span>
					{e.l}
				</button>
			{/each}
		</div>
	{/if}
</span>
