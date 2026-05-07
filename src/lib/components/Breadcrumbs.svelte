<script lang="ts">
	import { page } from '$app/state';

	type Crumb = { label: string; href?: string; mono?: boolean };

	const crumbs = $derived.by<Crumb[]>(() => {
		const path = page.url.pathname;
		if (path === '/') return [];
		const out: Crumb[] = [{ label: 'Projects', href: '/' }];

		const data = page.data as {
			project?: { id: string; displayName: string };
			session?: { sessionId: string };
		};

		const m = path.match(/^\/projects\/([^/]+)(?:\/sessions\/([^/]+))?/);
		if (m) {
			const projId = decodeURIComponent(m[1]);
			out.push({
				label: data.project?.displayName ?? projId,
				href: `/projects/${m[1]}`
			});
			if (m[2]) {
				const sid = data.session?.sessionId ?? m[2];
				out.push({ label: sid.slice(0, 8), mono: true });
			}
		}
		return out;
	});
</script>

{#if crumbs.length > 0}
	<nav class="flex items-center gap-1.5 text-xs" aria-label="Breadcrumb">
		<svg
			class="size-3 text-ink-600"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
		>
			<path d="m9 18 6-6-6-6" />
		</svg>
		{#each crumbs as c, i (i + c.label)}
			{#if i > 0}
				<svg
					class="size-3 text-ink-700"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
				>
					<path d="m9 18 6-6-6-6" />
				</svg>
			{/if}
			{#if c.href}
				<a
					href={c.href}
					class="rounded px-1.5 py-0.5 text-ink-300 transition hover:bg-ink-800/60 hover:text-ink-50 {c.mono
						? 'font-mono'
						: ''}"
				>
					{c.label}
				</a>
			{:else}
				<span
					class="rounded px-1.5 py-0.5 text-ink-100 {c.mono ? 'font-mono' : ''}"
					aria-current="page">{c.label}</span
				>
			{/if}
		{/each}
	</nav>
{/if}
