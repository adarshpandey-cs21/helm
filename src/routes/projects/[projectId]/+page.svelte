<script lang="ts">
	import { onMount } from 'svelte';
	import {
		formatRelativeTime,
		formatAbsoluteTime,
		formatBytes,
		formatDuration,
		shortenPath,
		truncate
	} from '$lib/format';
	import { pinned } from '$lib/pinned.svelte';
	import PinButton from '$lib/components/PinButton.svelte';
	import EditableTitle from '$lib/components/EditableTitle.svelte';
	import ResumeButton from '$lib/components/ResumeButton.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let query = $state('');
	let onlyWithErrors = $state(false);
	type DateFilter = 'all' | 'today' | '7d' | '30d';
	let dateFilter = $state<DateFilter>('all');

	onMount(() => {
		pinned.load();
	});

	function withinDateFilter(ts: number): boolean {
		if (dateFilter === 'all') return true;
		if (!ts) return false;
		const now = Date.now();
		if (dateFilter === 'today') {
			const startOfDay = new Date();
			startOfDay.setHours(0, 0, 0, 0);
			return ts >= startOfDay.getTime();
		}
		const days = dateFilter === '7d' ? 7 : 30;
		return ts >= now - days * 86400_000;
	}

	const filtered = $derived.by(() => {
		const q = query.trim().toLowerCase();
		return data.sessions.filter((s) => {
			if (onlyWithErrors && !s.hasErrors) return false;
			if (!withinDateFilter(s.startTime)) return false;
			if (!q) return true;
			return (
				(s.title ?? '').toLowerCase().includes(q) ||
				(s.firstUserMessage ?? '').toLowerCase().includes(q) ||
				(s.lastUserMessage ?? '').toLowerCase().includes(q) ||
				(s.lastBashCommand ?? '').toLowerCase().includes(q) ||
				(s.branch ?? '').toLowerCase().includes(q) ||
				s.sessionId.toLowerCase().includes(q)
			);
		});
	});

	const dateOptions: { k: DateFilter; l: string }[] = [
		{ k: 'all', l: 'All time' },
		{ k: 'today', l: 'Today' },
		{ k: '7d', l: 'Last 7d' },
		{ k: '30d', l: 'Last 30d' }
	];

	const sorted = $derived.by(() => {
		if (!pinned.loaded) return filtered;
		const pins: typeof filtered = [];
		const rest: typeof filtered = [];
		for (const s of filtered) {
			if (pinned.hasSession(data.project.id, s.sessionId)) pins.push(s);
			else rest.push(s);
		}
		return [...pins, ...rest];
	});

	const pinnedCount = $derived(
		sorted.filter((s) => pinned.hasSession(data.project.id, s.sessionId)).length
	);
</script>

<section class="space-y-6">
	<a
		href="/"
		class="inline-flex items-center gap-2 rounded-lg border border-ink-800 bg-ink-900/40 px-3 py-1.5 text-[13px] font-medium text-ink-300 transition hover:border-ink-700 hover:bg-ink-900/80 hover:text-ink-100"
	>
		<svg
			class="size-4"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
		>
			<path d="m15 18-6-6 6-6" />
		</svg>
		<span>All projects</span>
	</a>

	<div class="space-y-2">
		<div class="flex items-center gap-2 text-xs text-ink-500">
			<span class="font-mono">{shortenPath(data.project.cwd, data.home)}</span>
		</div>
		<h1 class="text-balance text-3xl font-semibold tracking-tight">
			{data.project.displayName}
		</h1>
		<p class="text-sm text-ink-400">
			{data.project.sessionCount} sessions ·
			{data.project.totalMessages.toLocaleString()} events ·
			{formatBytes(data.project.totalSize)}
		</p>
	</div>

	<div class="flex flex-wrap items-center gap-3">
		<label class="relative min-w-[240px] flex-1">
			<span class="sr-only">Search sessions</span>
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
				placeholder="Search prompts, branch, session id…"
				class="w-full rounded-xl border border-ink-800 bg-ink-900/60 py-2.5 pl-10 pr-4 text-sm placeholder:text-ink-500 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
			/>
		</label>
		<label
			class="flex cursor-pointer items-center gap-2 rounded-xl border border-ink-800 bg-ink-900/60 px-3 py-2.5 text-xs text-ink-300 transition hover:border-ink-700"
		>
			<input
				type="checkbox"
				bind:checked={onlyWithErrors}
				class="size-3.5 rounded accent-accent-500"
			/>
			<span>Only with errors</span>
		</label>
	</div>

	<div class="flex flex-wrap items-center gap-1 rounded-xl border border-ink-800 bg-ink-900/60 p-1 text-xs">
		{#each dateOptions as opt (opt.k)}
			<button
				type="button"
				onclick={() => (dateFilter = opt.k)}
				class="rounded-lg px-3 py-1.5 transition {dateFilter === opt.k
					? 'bg-ink-700 text-ink-50 shadow-sm'
					: 'text-ink-400 hover:text-ink-100'}"
			>
				{opt.l}
			</button>
		{/each}
	</div>

	{#if sorted.length === 0}
		<div
			class="grid place-items-center rounded-2xl border border-dashed border-ink-800 bg-ink-900/40 p-16 text-center"
		>
			<p class="text-ink-300">No sessions match.</p>
		</div>
	{:else}
		<ul class="space-y-2">
			{#each sorted as s, i (s.sessionId)}
				{@const isPinned = pinned.hasSession(data.project.id, s.sessionId)}
				{@const isLastPinned = isPinned && i === pinnedCount - 1 && pinnedCount < sorted.length}
				<li>
					<div
						class="surface-card group relative flex flex-col gap-3 rounded-2xl p-5 {isPinned
							? 'border-warm-500/30'
							: ''}"
						style={isPinned ? '--card-glow: var(--color-warm-500);' : ''}
					>
						<a
							href="/projects/{encodeURIComponent(data.project.id)}/sessions/{s.sessionId}"
							class="absolute inset-0 z-0"
							aria-label="Open session"
						></a>
						<div class="contents">
							{#if isPinned}
								<span
									class="pointer-events-none absolute inset-x-0 top-0 h-px"
									style="background: linear-gradient(90deg, transparent 0%, color-mix(in oklab, var(--color-warm-500) 60%, transparent) 50%, transparent 100%);"
								></span>
							{/if}
							<div class="flex items-start gap-4">
								<div class="min-w-0 flex-1 space-y-1.5">
									<div class="flex flex-wrap items-center gap-2 text-xs">
										{#if isPinned}
											<span
												class="inline-flex items-center gap-1 rounded-md bg-warm-500/15 px-1.5 py-0.5 text-[10.5px] font-medium text-warm-400 ring-1 ring-inset ring-warm-500/30"
											>
												<svg class="size-3" viewBox="0 0 24 24" fill="currentColor">
													<path
														d="M16 4.5a1 1 0 0 1 1 1V9.4a1 1 0 0 0 .29.7l2 2A1 1 0 0 1 19 13.7V14a1 1 0 0 1-1 1h-5v6.5a1 1 0 0 1-2 0V15H6a1 1 0 0 1-1-1v-.3a1 1 0 0 1 .29-.7l2-2A1 1 0 0 0 7.5 9.4V5.5a1 1 0 0 1 1-1Z"
													/>
												</svg>
												Pinned
											</span>
										{/if}
										{#if s.branch}
											<span
												class="inline-flex items-center gap-1 rounded-md bg-ink-800/80 px-1.5 py-0.5 font-mono text-[10.5px] text-ink-300"
											>
												<svg
													class="size-3"
													viewBox="0 0 24 24"
													fill="none"
													stroke="currentColor"
													stroke-width="2"
												>
													<circle cx="6" cy="6" r="3" /><circle cx="18" cy="18" r="3" /><path
														d="M6 9v6a3 3 0 0 0 3 3h6"
													/>
												</svg>
												{s.branch}
											</span>
										{/if}
										{#if s.hasErrors}
											<span
												class="inline-flex items-center gap-1 rounded-md bg-rose-500/10 px-1.5 py-0.5 text-[10.5px] text-rose-300 ring-1 ring-inset ring-rose-500/20"
											>
												errors
											</span>
										{/if}
										<span class="text-ink-500">
											{formatRelativeTime(s.startTime)}
										</span>
										<span class="text-ink-700">·</span>
										<span class="text-ink-500">
											{formatAbsoluteTime(s.startTime)}
										</span>
									</div>
									<div class="pointer-events-auto relative">
										<EditableTitle
											projectId={data.project.id}
											sessionId={s.sessionId}
											title={s.title}
											fallback={truncate(s.firstUserMessage, 200) || '(no user prompt)'}
											size="sm"
										/>
									</div>
									{#if s.title && s.firstUserMessage}
										<p class="line-clamp-2 text-[12.5px] text-ink-500">
											{truncate(s.firstUserMessage, 160)}
										</p>
									{/if}
									{#if s.lastBashCommand}
										<div
											class="pointer-events-none flex items-center gap-1.5 truncate font-mono text-[11px] text-ink-500"
										>
											<svg
												class="size-3 shrink-0 text-ink-600"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												stroke-width="2"
												stroke-linecap="round"
												stroke-linejoin="round"
											>
												<polyline points="4 17 10 11 4 5" />
												<line x1="12" y1="19" x2="20" y2="19" />
											</svg>
											<span class="truncate">{truncate(s.lastBashCommand, 110)}</span>
										</div>
									{/if}
								</div>
								<div class="pointer-events-auto relative flex shrink-0 items-start gap-2">
									<PinButton kind="session" projectId={data.project.id} sessionId={s.sessionId} />
									<svg
										class="mt-1.5 size-4 text-ink-600 transition group-hover:translate-x-0.5 group-hover:text-ink-200"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
									>
										<path d="m9 18 6-6-6-6" />
									</svg>
								</div>
							</div>

							<div class="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-ink-500">
								<span><b class="font-mono text-ink-200">{s.userMessageCount}</b> prompts</span>
								<span
									><b class="font-mono text-ink-200">{s.assistantMessageCount}</b> replies</span
								>
								<span><b class="font-mono text-ink-200">{s.toolUseCount}</b> tool calls</span>
								<span
									><b class="font-mono text-ink-200">{formatDuration(s.durationMs)}</b> duration</span
								>
								<span class="ml-auto font-mono">{s.sessionId.slice(0, 8)}</span>
							</div>

							<div class="pointer-events-auto relative flex justify-end pt-1">
								<ResumeButton projectId={data.project.id} sessionId={s.sessionId} />
							</div>
						</div>
					</div>
					{#if isLastPinned}
						<div class="my-3 flex items-center gap-3 px-1 text-[10px] uppercase tracking-[0.18em] text-ink-500">
							<span class="h-px flex-1 bg-ink-800"></span>
							<span>All sessions</span>
							<span class="h-px flex-1 bg-ink-800"></span>
						</div>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</section>
