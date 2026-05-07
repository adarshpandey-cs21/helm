<script lang="ts">
	import { page } from '$app/state';
</script>

<section
	class="grid place-items-center rounded-2xl border border-dashed border-ink-800 bg-ink-900/40 p-16 text-center"
>
	<div class="space-y-3">
		<div class="font-mono text-5xl text-ink-700">{page.status}</div>
		<h1 class="text-xl font-semibold tracking-tight text-ink-100">
			{page.error?.message ?? 'Something went wrong'}
		</h1>
		<a
			href="/"
			class="inline-block rounded-lg border border-ink-800 bg-ink-900/60 px-4 py-2 text-xs text-ink-200 transition hover:border-accent-500/40 hover:text-ink-50"
		>
			← Back to projects
		</a>
	</div>
</section>
