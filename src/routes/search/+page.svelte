<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import { formatRelativeTime } from '$lib/format';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let q = $state('');
	let inputEl: HTMLInputElement | null = $state(null);

	// Initialize once + sync when the URL-driven `data.q` changes.
	$effect(() => {
		const incoming = data.q;
		untrack(() => {
			if (incoming !== q) q = incoming;
		});
	});

	onMount(() => {
		inputEl?.focus();
	});

	function highlight(snippet: string, query: string): string {
		if (!query) return escapeHtml(snippet);
		const escaped = escapeHtml(snippet);
		const re = new RegExp(`(${escapeRegExp(query)})`, 'ig');
		return escaped.replace(
			re,
			'<mark class="rounded bg-warm-500/30 px-0.5 text-warm-300">$1</mark>'
		);
	}

	function escapeHtml(s: string): string {
		return s.replace(/[&<>"']/g, (c) =>
			({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c
		);
	}

	function escapeRegExp(s: string): string {
		return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	}

	function submit(e: SubmitEvent) {
		e.preventDefault();
		const params = new URLSearchParams();
		if (q.trim()) params.set('q', q.trim());
		goto(`/search?${params.toString()}`, { keepFocus: true, replaceState: false });
	}

	const hitsByProject = $derived.by(() => {
		const m = new Map<string, { name: string; hits: typeof data.hits }>();
		for (const h of data.hits) {
			const slot = m.get(h.projectId);
			if (slot) slot.hits.push(h);
			else m.set(h.projectId, { name: h.projectName, hits: [h] });
		}
		return [...m.values()];
	});
</script>

<svelte:head>
	<title>Search · Relic</title>
</svelte:head>

<section class="space-y-6">
	<form onsubmit={submit} class="flex flex-col gap-2">
		<label for="search-q" class="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-500">
			Search across every project
		</label>
		<div class="relative">
			<svg
				class="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-ink-500"
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
				id="search-q"
				type="text"
				bind:value={q}
				placeholder="Type a phrase, file path, error message…"
				class="w-full rounded-2xl border border-ink-800 bg-ink-900/50 py-4 pl-12 pr-4 text-[15px] text-ink-50 placeholder:text-ink-500 focus:border-claude-500/60 focus:outline-none focus:ring-2 focus:ring-claude-500/20"
				autocomplete="off"
			/>
		</div>
		<p class="text-[11px] text-ink-500">
			Searches your prompts and Claude's replies across every project. Type at least 2 characters.
		</p>
	</form>

	{#if !data.q}
		<div
			class="grid place-items-center rounded-2xl border border-dashed border-ink-800 bg-ink-900/40 p-16 text-center"
		>
			<div class="space-y-1.5">
				<div class="text-3xl">🔍</div>
				<p class="text-ink-300">Start typing to search.</p>
			</div>
		</div>
	{:else if data.hits.length === 0}
		<div
			class="grid place-items-center rounded-2xl border border-dashed border-ink-800 bg-ink-900/40 p-12 text-center"
		>
			<p class="text-ink-300">
				No matches for <span class="font-mono text-ink-100">"{data.q}"</span>.
			</p>
		</div>
	{:else}
		<div class="text-[11px] text-ink-500">
			{data.hits.length} match{data.hits.length === 1 ? '' : 'es'} across
			{hitsByProject.length} project{hitsByProject.length === 1 ? '' : 's'}
		</div>
		<div class="space-y-6">
			{#each hitsByProject as group (group.name)}
				<div class="space-y-2">
					<div class="flex items-center gap-2">
						<span class="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-400"
							>{group.name}</span
						>
						<span class="text-[10px] text-ink-600">·</span>
						<span class="text-[10px] text-ink-600">{group.hits.length}</span>
					</div>
					<ul class="space-y-2">
						{#each group.hits as h (h.sessionId + h.timestamp + h.role)}
							<li>
								<a
									href="/projects/{encodeURIComponent(h.projectId)}/sessions/{h.sessionId}"
									class="surface-card block rounded-xl p-4 transition"
								>
									<div class="flex items-center gap-2 text-[10.5px] text-ink-500">
										<span
											class="rounded-md px-1.5 py-0.5 font-mono text-[10px] {h.role === 'user'
												? 'bg-iris-500/15 text-iris-400'
												: 'bg-accent-500/15 text-accent-300'}"
										>
											{h.role === 'user' ? 'you' : 'claude'}
										</span>
										{#if h.sessionTitle}
											<span class="truncate text-ink-300">{h.sessionTitle}</span>
										{/if}
										<span class="ml-auto shrink-0">{formatRelativeTime(h.timestamp)}</span>
									</div>
									<p
										class="mt-1.5 text-[13.5px] leading-relaxed text-ink-200"
									>{@html highlight(h.snippet, data.q)}</p>
								</a>
							</li>
						{/each}
					</ul>
				</div>
			{/each}
		</div>
	{/if}
</section>
