<script lang="ts">
	import { marked } from 'marked';
	import DOMPurify from 'isomorphic-dompurify';

	let { source }: { source: string } = $props();

	marked.setOptions({ breaks: true, gfm: true });

	const html = $derived.by(() => {
		if (!source) return '';
		const raw = marked.parse(source, { async: false }) as string;
		return DOMPurify.sanitize(raw, { ADD_ATTR: ['target'] });
	});
</script>

<div class="md max-w-none">
	{@html html}
</div>

<style>
	.md {
		color: var(--color-ink-100);
		font-size: 14.5px;
		line-height: 1.65;
	}
	.md :global(p) {
		margin: 0;
	}
	.md :global(p + p),
	.md :global(p + ul),
	.md :global(p + ol),
	.md :global(p + pre),
	.md :global(p + blockquote),
	.md :global(p + h1),
	.md :global(p + h2),
	.md :global(p + h3),
	.md :global(p + h4),
	.md :global(ul + p),
	.md :global(ol + p),
	.md :global(pre + p),
	.md :global(blockquote + p),
	.md :global(h1 + p),
	.md :global(h2 + p),
	.md :global(h3 + p),
	.md :global(h4 + p) {
		margin-top: 0.7rem;
	}
	.md :global(h1),
	.md :global(h2),
	.md :global(h3),
	.md :global(h4) {
		color: var(--color-ink-50);
		font-weight: 600;
		letter-spacing: -0.01em;
	}
	.md :global(h1) {
		font-size: 1.35rem;
		margin-top: 1rem;
	}
	.md :global(h2) {
		font-size: 1.18rem;
		margin-top: 0.9rem;
	}
	.md :global(h3) {
		font-size: 1.05rem;
		margin-top: 0.8rem;
	}
	.md :global(h4) {
		font-size: 0.98rem;
		margin-top: 0.7rem;
	}
	.md :global(strong) {
		color: var(--color-ink-50);
		font-weight: 600;
	}
	.md :global(em) {
		color: var(--color-ink-200);
	}
	.md :global(code) {
		font-family: var(--font-mono);
		font-size: 0.85em;
		padding: 0.12em 0.4em;
		border-radius: 0.4em;
		background: color-mix(in oklab, var(--color-ink-700) 35%, transparent);
		color: var(--color-ink-50);
	}
	.md :global(pre) {
		background: color-mix(in oklab, var(--color-ink-950) 70%, transparent);
		border: 1px solid color-mix(in oklab, var(--color-ink-700) 50%, transparent);
		padding: 0.85rem 1rem;
		border-radius: 0.6rem;
		overflow-x: auto;
		font-size: 12.5px;
		line-height: 1.6;
		margin-top: 0.6rem;
	}
	.md :global(pre code) {
		background: transparent;
		padding: 0;
		font-size: inherit;
		color: var(--color-ink-100);
	}
	.md :global(a) {
		color: var(--color-accent-300);
		text-decoration-color: color-mix(in oklab, var(--color-accent-300) 40%, transparent);
		text-underline-offset: 2px;
	}
	.md :global(a:hover) {
		text-decoration-color: var(--color-accent-300);
	}
	.md :global(ul),
	.md :global(ol) {
		margin-left: 1.2rem;
		margin-top: 0.4rem;
	}
	.md :global(ul) {
		list-style: disc;
	}
	.md :global(ol) {
		list-style: decimal;
	}
	.md :global(li) {
		margin: 0.2rem 0;
	}
	.md :global(li::marker) {
		color: var(--color-ink-500);
	}
	.md :global(blockquote) {
		border-left: 3px solid color-mix(in oklab, var(--color-accent-400) 50%, transparent);
		padding-left: 0.85rem;
		color: var(--color-ink-300);
		font-style: italic;
		margin-top: 0.6rem;
	}
	.md :global(table) {
		font-size: 12.5px;
		border-collapse: collapse;
		margin-top: 0.6rem;
	}
	.md :global(th),
	.md :global(td) {
		border: 1px solid color-mix(in oklab, var(--color-ink-700) 50%, transparent);
		padding: 0.4rem 0.7rem;
		text-align: left;
	}
	.md :global(hr) {
		border: 0;
		border-top: 1px solid color-mix(in oklab, var(--color-ink-700) 60%, transparent);
		margin: 0.8rem 0;
	}
</style>
