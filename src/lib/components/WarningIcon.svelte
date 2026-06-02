<script lang="ts">
	let {
		tooltip,
		ariaLabel = 'Warning',
		size = 'size-3.5'
	}: { tooltip: string; ariaLabel?: string; size?: string } = $props();
</script>

<span
	class="inline-flex cursor-help items-center text-amber-400 hover:text-amber-300"
	title={tooltip}
	aria-label={ariaLabel}
>
	<svg
		class={size}
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
	>
		<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
		<line x1="12" y1="9" x2="12" y2="13" />
		<line x1="12" y1="17" x2="12.01" y2="17" />
	</svg>
</span>
