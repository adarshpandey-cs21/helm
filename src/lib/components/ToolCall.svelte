<script lang="ts">
	import type { NormalizedEvent } from '$lib/types';
	import JsonView from './JsonView.svelte';

	let {
		event,
		result
	}: { event: NormalizedEvent; result: NormalizedEvent | null } = $props();

	let open = $state(false);

	const summary = $derived.by(() => {
		const input = event.toolInput as any;
		if (!input || typeof input !== 'object') return '';
		switch (event.toolName) {
			case 'Bash':
				return input.command ?? '';
			case 'Read':
			case 'Edit':
			case 'Write':
			case 'NotebookEdit':
			case 'MultiEdit':
				return input.file_path ?? '';
			case 'Grep':
				return `${input.pattern ?? ''}${input.path ? ` in ${input.path}` : ''}`;
			case 'Glob':
				return input.pattern ?? '';
			case 'WebFetch':
			case 'WebSearch':
				return input.url ?? input.query ?? '';
			case 'TaskCreate':
			case 'TaskUpdate':
				return input.subject ?? input.taskId ?? '';
			default:
				try {
					const keys = Object.keys(input);
					if (keys.length === 1) {
						const v = input[keys[0]];
						if (typeof v === 'string') return v;
					}
					return JSON.stringify(input).slice(0, 120);
				} catch {
					return '';
				}
		}
	});

	const isError = $derived(result?.toolResultIsError === true);
</script>

<div
	class="overflow-hidden rounded-xl border bg-ink-900/40 transition {isError
		? 'border-rose-500/30'
		: 'border-ink-800/80'}"
>
	<button
		type="button"
		onclick={() => (open = !open)}
		class="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-ink-900/80"
	>
		<span
			class="grid size-6 shrink-0 place-items-center rounded-md bg-gradient-to-br from-accent-500/20 to-accent-600/20 text-[10px] font-semibold uppercase text-accent-300 ring-1 ring-inset ring-accent-500/30"
		>
			{(event.toolName ?? '?').slice(0, 1)}
		</span>
		<div class="min-w-0 flex-1">
			<div class="flex items-baseline gap-2">
				<span class="font-mono text-[12px] font-semibold text-ink-100">{event.toolName}</span>
				{#if isError}
					<span class="text-[10px] uppercase tracking-wider text-rose-400">error</span>
				{/if}
			</div>
			{#if summary}
				<div class="truncate font-mono text-[11.5px] text-ink-400">{summary}</div>
			{/if}
		</div>
		<svg
			class="size-4 shrink-0 text-ink-500 transition {open ? 'rotate-90' : ''}"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
		>
			<path d="m9 18 6-6-6-6" />
		</svg>
	</button>
	{#if open}
		<div class="space-y-3 border-t border-ink-800/80 bg-ink-950/40 p-4">
			<div>
				<div class="mb-1.5 text-[10px] uppercase tracking-[0.16em] text-ink-500">Input</div>
				<JsonView value={event.toolInput} />
			</div>
			{#if result}
				<div>
					<div class="mb-1.5 text-[10px] uppercase tracking-[0.16em] text-ink-500">
						{isError ? 'Error result' : 'Result'}
					</div>
					{#if typeof result.text === 'string' && result.text}
						<pre
							class="max-h-96 overflow-auto rounded-lg border border-ink-800/60 bg-ink-950/60 p-3 font-mono text-[11.5px] leading-relaxed {isError
								? 'text-rose-200'
								: 'text-ink-300'}">{result.text}</pre>
					{:else}
						<JsonView value={result.toolResult} />
					{/if}
				</div>
			{:else}
				<div class="text-[11.5px] italic text-ink-500">(no matching result captured)</div>
			{/if}
		</div>
	{/if}
</div>
