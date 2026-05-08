<script lang="ts">
	import { onMount } from 'svelte';

	let visible = $state(false);

	onMount(() => {
		const onScroll = () => {
			const distance =
				document.documentElement.scrollHeight -
				window.scrollY -
				window.innerHeight;
			visible = distance > 600;
		};
		onScroll();
		window.addEventListener('scroll', onScroll, { passive: true });
		window.addEventListener('resize', onScroll);
		return () => {
			window.removeEventListener('scroll', onScroll);
			window.removeEventListener('resize', onScroll);
		};
	});

	function jump() {
		window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
	}
</script>

{#if visible}
	<button
		type="button"
		onclick={jump}
		title="Jump to bottom"
		aria-label="Jump to bottom"
		class="fixed bottom-6 right-6 z-30 grid size-11 place-items-center rounded-full border border-claude-500/40 bg-claude-500/15 text-claude-300 shadow-xl shadow-black/30 backdrop-blur transition hover:scale-105 hover:border-claude-500/60 hover:bg-claude-500/25"
	>
		<svg
			class="size-5"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
		>
			<path d="M12 5v14" />
			<path d="m19 12-7 7-7-7" />
		</svg>
	</button>
{/if}
