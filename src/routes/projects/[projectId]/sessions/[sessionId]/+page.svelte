<script lang="ts">
	import {
		formatRelativeTime,
		formatAbsoluteTime,
		formatDuration,
		shortenPath
	} from '$lib/format';
	import ToolCall from '$lib/components/ToolCall.svelte';
	import JsonView from '$lib/components/JsonView.svelte';
	import Avatar from '$lib/components/Avatar.svelte';
	import Toggle from '$lib/components/Toggle.svelte';
	import Markdown from '$lib/components/Markdown.svelte';
	import ResumeButton from '$lib/components/ResumeButton.svelte';
	import EditableTitle from '$lib/components/EditableTitle.svelte';
	import type { NormalizedEvent } from '$lib/types';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let showMeta = $state(false);
	let showTools = $state(false);
	let rawMode = $state(false);

	const resultByToolId = $derived.by(() => {
		const m = new Map<string, NormalizedEvent>();
		for (const e of data.session.events) {
			if (e.kind === 'user-tool-result' && e.toolUseId) m.set(e.toolUseId, e);
		}
		return m;
	});

	const visibleEvents = $derived.by(() => {
		const out: NormalizedEvent[] = [];
		for (const e of data.session.events) {
			if (e.kind === 'attachment') continue;
			if (e.kind === 'meta' && !showMeta) continue;
			if (e.kind === 'thinking' && !e.text) continue;
			if (!showTools && (e.kind === 'assistant-tool-use' || e.kind === 'user-tool-result')) {
				continue;
			}
			if (e.kind === 'user-tool-result' && e.toolUseId && resultByToolId.has(e.toolUseId)) {
				continue;
			}
			out.push(e);
		}
		return out;
	});

	const hiddenToolCount = $derived(
		showTools ? 0 : data.session.events.filter((e) => e.kind === 'assistant-tool-use').length
	);

	const topTools = $derived.by(() => {
		const arr = Object.entries(data.session.stats.toolBreakdown);
		arr.sort((a, b) => b[1] - a[1]);
		return arr.slice(0, 8);
	});

	const totalTokens = $derived(
		data.session.stats.totalInputTokens + data.session.stats.totalOutputTokens
	);
</script>

<section class="space-y-6">
	<a
		href="/projects/{encodeURIComponent(data.project.id)}"
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
		<span>{data.project.displayName}</span>
	</a>

	<header
		class="surface-card relative space-y-5 overflow-hidden rounded-2xl p-6"
		style="--card-glow: var(--color-accent-500);"
	>
		<span
			class="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full opacity-50 blur-3xl"
			style="background: radial-gradient(circle, color-mix(in oklab, var(--color-accent-500) 40%, transparent) 0%, transparent 70%);"
		></span>
		<span
			class="pointer-events-none absolute inset-x-0 top-0 h-px"
			style="background: linear-gradient(90deg, transparent 0%, color-mix(in oklab, var(--color-accent-500) 60%, transparent) 50%, transparent 100%);"
		></span>
		<div class="relative flex flex-wrap items-start justify-between gap-4">
			<div class="space-y-1">
				<div class="flex flex-wrap items-center gap-2 text-[11px] text-ink-500">
					<span class="font-mono text-ink-400">{data.session.sessionId}</span>
					{#if data.session.branch}
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
							{data.session.branch}
						</span>
					{/if}
					{#if data.session.version}
						<span
							class="rounded-md bg-ink-800/60 px-1.5 py-0.5 font-mono text-[10.5px] text-ink-400"
							>v{data.session.version}</span
						>
					{/if}
				</div>
				<EditableTitle
					projectId={data.project.id}
					sessionId={data.session.sessionId}
					title={data.session.title}
					fallback="Session transcript"
					size="lg"
				/>
				<div class="font-mono text-[11px] text-ink-500">
					{shortenPath(data.session.cwd, data.home)}
				</div>
			</div>
			<div class="flex flex-col items-end gap-2 text-xs text-ink-400">
				<ResumeButton
					projectId={data.project.id}
					sessionId={data.session.sessionId}
				/>
				<div>{formatAbsoluteTime(data.session.startTime)}</div>
				<div class="text-ink-500">
					{formatRelativeTime(data.session.startTime)} · {formatDuration(
						data.session.endTime - data.session.startTime
					)}
				</div>
			</div>
		</div>

		<dl class="relative grid grid-cols-2 gap-3 sm:grid-cols-4">
			<div class="metric-tile" style="--metric-color: #60a5fa;">
				<dt class="text-[10px] font-medium uppercase tracking-[0.16em] text-ink-500">Prompts</dt>
				<dd
					class="metric-number mt-1.5 font-mono tabular-nums text-2xl font-bold tracking-tight"
					style="--metric-color: #60a5fa;"
				>
					{data.session.stats.userMessages}
				</dd>
			</div>
			<div class="metric-tile" style="--metric-color: #a78bfa;">
				<dt class="text-[10px] font-medium uppercase tracking-[0.16em] text-ink-500">Replies</dt>
				<dd
					class="metric-number mt-1.5 font-mono tabular-nums text-2xl font-bold tracking-tight"
					style="--metric-color: #a78bfa;"
				>
					{data.session.stats.assistantMessages}
				</dd>
			</div>
			<div class="metric-tile" style="--metric-color: #fbbf24;">
				<dt class="text-[10px] font-medium uppercase tracking-[0.16em] text-ink-500">Tool calls</dt>
				<dd
					class="metric-number mt-1.5 font-mono tabular-nums text-2xl font-bold tracking-tight"
					style="--metric-color: #fbbf24;"
				>
					{data.session.stats.toolUses}
				</dd>
			</div>
			<div class="metric-tile" style="--metric-color: #10b981;">
				<dt class="text-[10px] font-medium uppercase tracking-[0.16em] text-ink-500">Tokens</dt>
				<dd
					class="metric-number mt-1.5 font-mono tabular-nums text-2xl font-bold tracking-tight"
					style="--metric-color: #10b981;"
				>
					{totalTokens.toLocaleString()}
				</dd>
			</div>
		</dl>

		{#if topTools.length > 0}
			<div class="relative flex flex-wrap items-center gap-1.5">
				<span class="text-[10px] uppercase tracking-[0.16em] text-ink-500">Top tools</span>
				{#each topTools as [name, n] (name)}
					<span
						class="inline-flex items-center gap-1.5 rounded-full border border-ink-800 bg-ink-950/40 px-2 py-0.5 text-[11px] text-ink-300"
					>
						<span class="font-mono">{name}</span>
						<span class="text-ink-500">{n}</span>
					</span>
				{/each}
			</div>
		{/if}

		{#if data.session.stats.filesTouched.length > 0}
			<details class="group relative">
				<summary
					class="cursor-pointer select-none text-[11px] text-ink-400 hover:text-ink-100"
				>
					<span class="text-[10px] uppercase tracking-[0.16em] text-ink-500"
						>Files touched ·
					</span>
					{data.session.stats.filesTouched.length}
				</summary>
				<ul class="mt-2 space-y-0.5">
					{#each data.session.stats.filesTouched as f (f)}
						<li class="font-mono text-[11px] text-ink-300">
							{shortenPath(f, data.home)}
						</li>
					{/each}
				</ul>
			</details>
		{/if}
	</header>

	<div class="flex flex-col gap-2 sm:flex-row sm:items-center">
		<Toggle bind:value={showTools} label="Show tool calls" color="iris" fullWidth />
		<Toggle bind:value={showMeta} label="Show meta lines" color="warm" fullWidth />
		<Toggle bind:value={rawMode} label="Raw JSONL" color="emerald" fullWidth />
	</div>
	{#if hiddenToolCount > 0 && !showTools}
		<div class="-mt-3 text-right text-[11px] text-ink-500">
			{hiddenToolCount} tool {hiddenToolCount === 1 ? 'call' : 'calls'} hidden
		</div>
	{/if}

	{#if rawMode}
		<div class="space-y-2">
			{#each data.session.events as e (e.uuid)}
				<JsonView value={e.raw} max={2000} />
			{/each}
		</div>
	{:else}
		<ol class="space-y-3">
			{#each visibleEvents as e (e.uuid)}
				<li>
					{#if e.kind === 'user-text'}
						<div class="flex items-start gap-3">
							<Avatar role="user" />
							<div class="min-w-0 flex-1 space-y-1.5">
								<div class="flex items-center gap-2 text-[11px] text-ink-500">
									<span class="font-medium text-iris-300">You</span>
									<span>·</span>
									<span>{formatAbsoluteTime(e.timestamp)}</span>
								</div>
								<div class="relative">
									<span
										class="bubble-rail-user pointer-events-none absolute left-0 top-3 bottom-3 w-[3px] rounded-full"
									></span>
									<div
										class="bubble-user rounded-2xl rounded-tl-sm px-5 py-3.5 pl-6 text-[14.5px] leading-relaxed text-ink-100"
									>
										<Markdown source={e.text ?? ''} />
									</div>
								</div>
							</div>
						</div>
					{:else if e.kind === 'assistant-text'}
						<div class="flex items-start gap-3">
							<Avatar role="assistant" />
							<div class="min-w-0 flex-1 space-y-1.5">
								<div class="flex flex-wrap items-center gap-2 text-[11px] text-ink-500">
									<span class="font-medium text-accent-300">Claude</span>
									{#if e.model}
										<span
											class="rounded-md bg-ink-800/70 px-1.5 py-0.5 font-mono text-[10px] text-ink-300"
											>{e.model}</span
										>
									{/if}
									<span>·</span>
									<span>{formatAbsoluteTime(e.timestamp)}</span>
								</div>
								<div class="relative">
									<span
										class="bubble-rail-assistant pointer-events-none absolute left-0 top-3 bottom-3 w-[3px] rounded-full"
									></span>
									<div
										class="bubble-assistant rounded-2xl rounded-tl-sm px-5 py-3.5 pl-6 text-[14.5px] leading-relaxed text-ink-100"
									>
										<Markdown source={e.text ?? ''} />
									</div>
								</div>
							</div>
						</div>
					{:else if e.kind === 'assistant-tool-use'}
						<div class="flex items-start gap-3">
							<Avatar role="tool" />
							<div class="flex-1">
								<ToolCall
									event={e}
									result={e.toolUseId ? (resultByToolId.get(e.toolUseId) ?? null) : null}
								/>
							</div>
						</div>
					{:else if e.kind === 'user-tool-result'}
						<div class="flex items-start gap-3">
							<Avatar role="tool" />
							<div class="flex-1 space-y-1.5">
								<div class="text-[11px] text-ink-500">Tool result (orphan)</div>
								<pre
									class="max-h-64 overflow-auto rounded-lg border border-ink-800/60 bg-ink-950/60 p-3 font-mono text-[11.5px] text-ink-300">{e.text ??
										''}</pre>
							</div>
						</div>
					{:else if e.kind === 'thinking'}
						<details class="group">
							<summary
								class="flex cursor-pointer items-center gap-2 text-[11px] text-ink-500 hover:text-ink-300"
							>
								<svg
									class="size-3.5 transition group-open:rotate-90"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
								>
									<path d="m9 18 6-6-6-6" />
								</svg>
								<span>thinking · {formatAbsoluteTime(e.timestamp)}</span>
							</summary>
							<div
								class="mt-2 whitespace-pre-wrap rounded-lg border border-ink-800/60 bg-ink-950/40 p-3 text-[12.5px] italic leading-relaxed text-ink-400"
							>
								{e.text}
							</div>
						</details>
					{:else if e.kind === 'system'}
						<div
							class="flex items-start gap-3 rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-2.5"
						>
							<svg
								class="mt-0.5 size-4 shrink-0 text-rose-400"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
							>
								<circle cx="12" cy="12" r="10" /><path d="M12 8v4" /><path
									d="M12 16h.01"
								/>
							</svg>
							<div class="flex-1 text-[12px] text-rose-200">
								<div class="font-mono text-[11px] uppercase tracking-wider text-rose-300">
									{e.subtype ?? 'system'}
								</div>
								{#if e.error}
									<JsonView value={e.error} max={1500} />
								{/if}
							</div>
						</div>
					{:else if e.kind === 'meta'}
						<div class="flex items-center gap-2 text-[11px] text-ink-500">
							<span class="font-mono">{e.subtype}</span>
							<span>·</span>
							<span>{formatAbsoluteTime(e.timestamp)}</span>
						</div>
					{/if}
				</li>
			{/each}
		</ol>
	{/if}
</section>
