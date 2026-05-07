<script lang="ts">
	let {
		value = $bindable(false),
		label,
		color = 'accent',
		fullWidth = false
	}: {
		value?: boolean;
		label: string;
		color?: 'accent' | 'iris' | 'warm' | 'emerald';
		fullWidth?: boolean;
	} = $props();

	const colorMap = {
		accent: { on: 'bg-accent-500', glow: 'shadow-accent-500/30', text: 'text-accent-300' },
		iris: { on: 'bg-iris-500', glow: 'shadow-iris-500/30', text: 'text-iris-400' },
		warm: { on: 'bg-warm-500', glow: 'shadow-warm-500/30', text: 'text-warm-400' },
		emerald: { on: 'bg-emerald-500', glow: 'shadow-emerald-500/30', text: 'text-emerald-300' }
	} as const;
	const c = $derived(colorMap[color]);
</script>

<button
	type="button"
	onclick={() => (value = !value)}
	aria-pressed={value}
	class="group inline-flex items-center justify-between gap-3 rounded-xl border bg-ink-900/40 px-4 py-2.5 text-[13px] font-medium transition {fullWidth
		? 'flex-1'
		: ''} {value
		? `border-transparent ${c.text} ring-1 ring-inset ring-current/30 shadow-md ${c.glow}`
		: 'border-ink-800 text-ink-400 hover:border-ink-700 hover:text-ink-200'}"
>
	<span class="flex items-center gap-2.5">
		<span
			class="relative h-4 w-7 rounded-full transition-colors {value ? c.on : 'bg-ink-700'}"
		>
			<span
				class="absolute top-0.5 size-3 rounded-full bg-white shadow-sm transition-all {value
					? 'left-3.5'
					: 'left-0.5'}"
			></span>
		</span>
		{label}
	</span>
	{#if value}
		<svg
			class="size-4 opacity-80"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2.5"
		>
			<path d="m5 12 5 5L20 7" />
		</svg>
	{/if}
</button>
