<script lang="ts">
	import { onMount } from 'svelte';
	import { formatRelativeTime, formatBytes, shortenPath, truncate } from '$lib/format';
	import { pinned } from '$lib/pinned.svelte';
	import PinButton from '$lib/components/PinButton.svelte';
	import ResumeButton from '$lib/components/ResumeButton.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let query = $state('');
	let sort = $state<'recent' | 'sessions' | 'messages' | 'name'>('recent');

	onMount(() => {
		pinned.load();
	});

	const filtered = $derived.by(() => {
		const q = query.trim().toLowerCase();
		let list = data.projects;
		if (q) {
			list = list.filter(
				(p) =>
					p.displayName.toLowerCase().includes(q) ||
					p.cwd.toLowerCase().includes(q) ||
					p.id.toLowerCase().includes(q)
			);
		}
		const sorted = [...list];
		switch (sort) {
			case 'sessions':
				sorted.sort((a, b) => b.sessionCount - a.sessionCount);
				break;
			case 'messages':
				sorted.sort((a, b) => b.totalMessages - a.totalMessages);
				break;
			case 'name':
				sorted.sort((a, b) => a.displayName.localeCompare(b.displayName));
				break;
			default:
				sorted.sort((a, b) => b.lastActivity - a.lastActivity);
		}
		return sorted;
	});

	const pinnedFirst = $derived.by(() => {
		if (!pinned.loaded) return filtered;
		const pins: typeof filtered = [];
		const rest: typeof filtered = [];
		for (const p of filtered) {
			if (pinned.hasProject(p.id)) pins.push(p);
			else rest.push(p);
		}
		return [...pins, ...rest];
	});


	const totalStats = $derived({
		projects: data.projects.length,
		sessions: data.projects.reduce((a, p) => a + p.sessionCount, 0),
		messages: data.projects.reduce((a, p) => a + p.totalMessages, 0),
		size: data.projects.reduce((a, p) => a + p.totalSize, 0)
	});

	const sortOptions = [
		{ k: 'recent', l: 'Recent' },
		{ k: 'sessions', l: 'Sessions' },
		{ k: 'messages', l: 'Events' },
		{ k: 'name', l: 'Name' }
	] as const;
</script>

{#snippet metric(
	label: string,
	value: string,
	color: string,
	icon: 'folder' | 'list' | 'spark' | 'disk'
)}
	<div class="metric-tile" style="--metric-color: {color};">
		<div class="flex items-start justify-between gap-2">
			<div class="text-[10px] font-medium uppercase tracking-[0.16em] text-ink-500">{label}</div>
			<span class="opacity-70" style="color: {color};">
				{#if icon === 'folder'}
					<svg
						class="size-4"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<path d="M3 7a2 2 0 0 1 2-2h4l2 3h8a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
					</svg>
				{:else if icon === 'list'}
					<svg
						class="size-4"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<path d="M8 6h13" />
						<path d="M8 12h13" />
						<path d="M8 18h13" />
						<circle cx="3.5" cy="6" r="1" />
						<circle cx="3.5" cy="12" r="1" />
						<circle cx="3.5" cy="18" r="1" />
					</svg>
				{:else if icon === 'spark'}
					<svg
						class="size-4"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<path d="M12 2v6" />
						<path d="m4.93 4.93 4.24 4.24" />
						<path d="M2 12h6" />
						<path d="m4.93 19.07 4.24-4.24" />
						<path d="M12 22v-6" />
						<path d="m19.07 19.07-4.24-4.24" />
						<path d="M22 12h-6" />
						<path d="m19.07 4.93-4.24 4.24" />
					</svg>
				{:else}
					<svg
						class="size-4"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<ellipse cx="12" cy="5" rx="9" ry="3" />
						<path d="M3 5v14a9 3 0 0 0 18 0V5" />
						<path d="M3 12a9 3 0 0 0 18 0" />
					</svg>
				{/if}
			</span>
		</div>
		<div
			class="metric-number mt-2 text-3xl font-bold tabular-nums tracking-tight"
			style="--metric-color: {color};"
		>
			{value}
		</div>
	</div>
{/snippet}

{#snippet cardStat(label: string, value: string, klass: string)}
	<div class="space-y-1">
		<div class="text-[9.5px] font-medium uppercase tracking-[0.16em] text-ink-500">{label}</div>
		<div class="font-mono tabular-nums text-[22px] font-bold leading-none {klass}">
			{value}
		</div>
	</div>
{/snippet}


<section class="space-y-8">
	<div class="flex flex-col items-center space-y-4 pt-4 text-center">
		<h1 class="text-4xl font-semibold tracking-tight sm:text-5xl">
			Your <span class="text-claude">Claude Code</span> conversations,
			<span
				class="bg-gradient-to-r from-accent-300 via-accent-400 to-warm-400 bg-clip-text text-transparent"
				>across every project.</span
			>
		</h1>
		<p class="text-[15px] text-ink-400">
			Every session you've had with Claude Code, indexed from
			<code class="rounded bg-ink-800/60 px-1.5 py-0.5 font-mono text-[12px] text-ink-200"
				>~/.claude/projects/</code
			>. Click into a project to browse its sessions and replay any conversation.
		</p>
	</div>

	<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
		{@render metric('Projects', totalStats.projects.toLocaleString(), '#60a5fa', 'folder')}
		{@render metric('Sessions', totalStats.sessions.toLocaleString(), '#a78bfa', 'list')}
		{@render metric('Total events', totalStats.messages.toLocaleString(), '#fbbf24', 'spark')}
		{@render metric('On disk', formatBytes(totalStats.size), '#10b981', 'disk')}
	</div>

	{#if data.recent && data.recent.length > 0}
		<div class="space-y-3">
			<div class="flex items-baseline gap-2">
				<span class="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-500">
					Recent activity
				</span>
				<span class="text-[11px] text-ink-600">across every project</span>
			</div>
			<ul class="grid gap-2 lg:grid-cols-2">
				{#each data.recent as r (r.sessionId)}
					<li>
						<div class="surface-card group relative flex items-start gap-3 rounded-xl p-3.5">
							<a
								href="/projects/{encodeURIComponent(r.projectId)}/sessions/{r.sessionId}"
								class="absolute inset-0 z-0"
								aria-label="Open session"
							></a>

							<span
								class="pointer-events-none relative grid size-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-accent-500/20 to-accent-600/10 font-mono text-[10px] font-bold uppercase text-accent-300 ring-1 ring-inset ring-accent-500/20"
							>
								{(r.title || r.firstUserMessage || r.sessionId).slice(0, 2)}
							</span>
							<div class="pointer-events-none relative min-w-0 flex-1">
								<div class="flex items-center gap-2 text-[10.5px] text-ink-500">
									<span class="truncate font-mono text-ink-400"
										>{shortenPath(r.cwd, data.home)}</span
									>
									<span class="ml-auto shrink-0">{formatRelativeTime(r.startTime)}</span>
								</div>
								<p class="mt-1 truncate text-[13px] font-medium text-ink-100">
									{r.title || truncate(r.firstUserMessage, 100) || '(no prompt)'}
								</p>
								<div class="mt-0.5 flex items-center gap-3 text-[10.5px] text-ink-500">
									<span><b class="font-mono text-ink-300">{r.userMessageCount}</b> prompts</span>
									<span><b class="font-mono text-ink-300">{r.toolUseCount}</b> tools</span>
									{#if r.branch}
										<span class="font-mono text-ink-400">·</span>
										<span class="font-mono">{r.branch}</span>
									{/if}
								</div>
							</div>
							<div class="pointer-events-auto relative shrink-0">
								<ResumeButton projectId={r.projectId} sessionId={r.sessionId} />
							</div>
						</div>
					</li>
				{/each}
			</ul>
		</div>
	{/if}

	<div class="flex flex-wrap items-center gap-3">
		<label class="relative min-w-[240px] flex-1">
			<span class="sr-only">Search projects</span>
			<svg
				class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-500"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
			>
				<circle cx="11" cy="11" r="7" />
				<path d="m20 20-3.5-3.5" />
			</svg>
			<input
				type="text"
				bind:value={query}
				placeholder="Filter by name or path…"
				class="w-full rounded-xl border border-ink-800 bg-ink-900/60 py-2.5 pl-10 pr-4 text-sm placeholder:text-ink-500 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
			/>
		</label>
		<div
			class="flex items-center gap-1 rounded-xl border border-ink-800 bg-ink-900/60 p-1 text-xs"
		>
			{#each sortOptions as opt (opt.k)}
				<button
					type="button"
					onclick={() => (sort = opt.k)}
					class="rounded-lg px-3 py-1.5 transition {sort === opt.k
						? 'bg-ink-700 text-ink-50 shadow-sm'
						: 'text-ink-400 hover:text-ink-100'}"
				>
					{opt.l}
				</button>
			{/each}
		</div>
	</div>

	{#if filtered.length === 0}
		<div
			class="grid place-items-center rounded-2xl border border-dashed border-ink-800 bg-ink-900/40 p-16 text-center"
		>
			<div class="space-y-2">
				<div class="text-3xl">🌑</div>
				<p class="text-ink-300">No projects matched.</p>
				<p class="text-xs text-ink-500">
					Try clearing the filter or use Claude Code in a folder first.
				</p>
			</div>
		</div>
	{:else}
		<ul class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each pinnedFirst as p (p.id)}
				{@const glows = ['#60a5fa', '#a78bfa', '#fbbf24', '#10b981', '#f472b6', '#34d399']}
				{@const glow =
					glows[
						(p.id.charCodeAt(1) + p.id.charCodeAt(p.id.length - 1) + p.displayName.length) %
							glows.length
					]}
				{@const isProjectPinned = pinned.hasProject(p.id)}
				{@const pinnedSessionIds = pinned.pinnedSessionIdsForProject(p.id)}
				<li>
					<div
						class="surface-card group relative h-full overflow-hidden rounded-2xl p-5 {isProjectPinned
							? 'border-warm-500/30'
							: ''}"
						style="--card-glow: {isProjectPinned ? 'var(--color-warm-500)' : glow};"
					>
						<span
							class="pointer-events-none absolute -right-12 -top-12 size-48 rounded-full opacity-30 blur-3xl transition-opacity duration-500 group-hover:opacity-70"
							style="background: radial-gradient(circle, {isProjectPinned
								? 'rgba(245,158,11,0.4)'
								: glow + '66'} 0%, transparent 70%);"
						></span>
						<span
							class="pointer-events-none absolute inset-x-0 top-0 h-px opacity-70"
							style="background: linear-gradient(90deg, transparent 0%, {isProjectPinned
								? 'rgba(245,158,11,0.7)'
								: glow + '88'} 50%, transparent 100%);"
						></span>

						<a
							href="/projects/{encodeURIComponent(p.id)}"
							class="absolute inset-0 z-0"
							aria-label="Open {p.displayName}"
						></a>

						<div class="pointer-events-none relative z-10 flex items-start justify-between gap-3">
							<div class="min-w-0 flex-1">
								<div class="flex items-center gap-3">
									<span
										class="grid size-10 shrink-0 place-items-center rounded-xl font-mono text-[11px] font-bold uppercase tracking-wider"
										style="background: linear-gradient(135deg, {glow}33 0%, {glow}11 100%); color: {glow}; border: 1px solid {glow}33;"
									>
										{p.displayName.slice(0, 2)}
									</span>
									<div class="min-w-0 flex-1">
										<div class="flex items-center gap-2">
											<span class="truncate text-[15px] font-semibold text-ink-50">
												{p.displayName}
											</span>
											{#if isProjectPinned}
												<svg
													class="size-3.5 shrink-0 text-warm-400"
													viewBox="0 0 24 24"
													fill="currentColor"
												>
													<path
														d="M16 4.5a1 1 0 0 1 1 1V9.4a1 1 0 0 0 .29.7l2 2A1 1 0 0 1 19 13.7V14a1 1 0 0 1-1 1h-5v6.5a1 1 0 0 1-2 0V15H6a1 1 0 0 1-1-1v-.3a1 1 0 0 1 .29-.7l2-2A1 1 0 0 0 7.5 9.4V5.5a1 1 0 0 1 1-1Z"
													/>
												</svg>
											{/if}
										</div>
										<div class="truncate font-mono text-[10.5px] text-ink-500">
											{shortenPath(p.cwd, data.home)}
										</div>
									</div>
								</div>
							</div>
							<div class="pointer-events-auto relative flex shrink-0 items-start gap-2">
								<PinButton kind="project" projectId={p.id} />
								<svg
									class="mt-1.5 size-4 text-ink-600 transition group-hover:translate-x-1 group-hover:text-ink-200"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
								>
									<path d="m9 18 6-6-6-6" />
								</svg>
							</div>
						</div>

						<dl class="pointer-events-none relative z-10 mt-6 grid grid-cols-3 gap-3">
							{@render cardStat('Sessions', p.sessionCount.toLocaleString(), 'stat-iris')}
							{@render cardStat('Events', p.totalMessages.toLocaleString(), 'stat-accent')}
							{@render cardStat('Prompts', p.totalUserMessages.toLocaleString(), 'stat-warm')}
						</dl>

						<div
							class="pointer-events-none relative z-10 mt-5 flex items-center justify-between border-t border-ink-800/60 pt-3 text-[11px] text-ink-500"
						>
							<span class="inline-flex items-center gap-1.5">
								<span
									class="size-1.5 rounded-full"
									style="background: {isProjectPinned ? 'rgba(245,158,11,0.9)' : glow + '88'};"
								></span>
								{formatRelativeTime(p.lastActivity)}
							</span>
							<span class="flex items-center gap-3">
								{#if pinnedSessionIds.length > 0}
									<a
										href="/projects/{encodeURIComponent(
											p.id
										)}/sessions/{pinnedSessionIds[0]}"
										onclick={(e) => e.stopPropagation()}
										class="pointer-events-auto relative inline-flex items-center gap-1 rounded-md bg-warm-500/15 px-1.5 py-0.5 text-warm-400 ring-1 ring-inset ring-warm-500/30 transition hover:bg-warm-500/25 hover:text-warm-300"
										title="Jump to first pinned session"
									>
										<svg class="size-3" viewBox="0 0 24 24" fill="currentColor">
											<path
												d="M16 4.5a1 1 0 0 1 1 1V9.4a1 1 0 0 0 .29.7l2 2A1 1 0 0 1 19 13.7V14a1 1 0 0 1-1 1h-5v6.5a1 1 0 0 1-2 0V15H6a1 1 0 0 1-1-1v-.3a1 1 0 0 1 .29-.7l2-2A1 1 0 0 0 7.5 9.4V5.5a1 1 0 0 1 1-1Z"
											/>
										</svg>
										<span class="font-mono">{pinnedSessionIds.length}</span>
										<svg
											class="size-3"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
										>
											<path d="M7 17 17 7" />
											<path d="M7 7h10v10" />
										</svg>
									</a>
								{/if}
								<span class="font-mono">{formatBytes(p.totalSize)}</span>
							</span>
						</div>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</section>
