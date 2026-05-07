<script lang="ts">
	let { value, max = 4000 }: { value: unknown; max?: number } = $props();

	const text = $derived.by(() => {
		try {
			const s = JSON.stringify(value, null, 2);
			if (s.length > max) return s.slice(0, max) + `\n…(truncated, ${s.length - max} chars)`;
			return s;
		} catch {
			return String(value);
		}
	});
</script>

<pre
	class="overflow-x-auto rounded-lg border border-ink-800/60 bg-ink-950/60 p-3 font-mono text-[11.5px] leading-relaxed text-ink-300">{text}</pre>
