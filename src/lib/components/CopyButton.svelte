<script lang="ts">
	let { text, title = 'Copy', label = '' }: { text: string; title?: string; label?: string } =
		$props();

	let copied = $state(false);
	let timer: ReturnType<typeof setTimeout> | null = null;

	async function onClick(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		try {
			await navigator.clipboard.writeText(text);
			copied = true;
			if (timer) clearTimeout(timer);
			timer = setTimeout(() => (copied = false), 1500);
		} catch {
			/* ignore */
		}
	}
</script>

<button
	type="button"
	onclick={onClick}
	{title}
	aria-label={title}
	class="inline-flex items-center gap-1 rounded-md border border-ink-800 bg-ink-900/50 px-1.5 py-1 text-[10.5px] text-ink-500 transition hover:border-ink-700 hover:text-ink-100 {copied
		? 'border-emerald-500/40 text-emerald-300'
		: ''}"
>
	{#if copied}
		<svg
			class="size-3"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2.5"
		>
			<path d="m5 12 5 5L20 7" />
		</svg>
		<span>Copied</span>
	{:else}
		<svg
			class="size-3"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
		>
			<rect x="9" y="9" width="13" height="13" rx="2" />
			<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
		</svg>
		{#if label}<span>{label}</span>{/if}
	{/if}
</button>
