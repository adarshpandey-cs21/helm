<script lang="ts">
	let { role }: { role: 'user' | 'assistant' | 'tool' } = $props();
</script>

{#if role === 'user'}
	<img
		src="/user.png"
		alt="You"
		class="size-8 shrink-0 rounded-full bg-ink-800 object-cover ring-1 ring-inset ring-ink-700"
	/>
{:else if role === 'assistant'}
	<img
		src="/claude.png"
		alt="Claude"
		class="size-8 shrink-0 rounded-full bg-white/5 object-contain p-1 ring-1 ring-inset ring-ink-700"
	/>
{:else}
	<span
		class="grid size-8 shrink-0 place-items-center rounded-full bg-ink-800 text-ink-300 ring-1 ring-inset ring-ink-700"
		title="tool"
	>
		<svg
			class="size-4"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
		>
			<path
				d="M14.7 6.3a4 4 0 1 0-5.4 5.4l-6 6a2 2 0 1 0 2.8 2.8l6-6a4 4 0 0 0 5.4-5.4l-2.6 2.6L13 9l1.7-2.7Z"
			/>
		</svg>
	</span>
{/if}
