<script lang="ts">
	import WarningIcon from './WarningIcon.svelte';

	let {
		unknownModels,
		size = 'size-3.5'
	}: { unknownModels: string[]; size?: string } = $props();

	const tooltip = $derived(
		`No pricing data for ${unknownModels.length === 1 ? 'model' : 'models'}: ${unknownModels.join(
			', '
		)} — total is a lower-bound estimate.`
	);
</script>

{#if unknownModels.length > 0}
	<WarningIcon {tooltip} ariaLabel="Some models have unknown pricing" {size} />
{/if}
