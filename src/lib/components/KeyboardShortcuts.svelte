<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	function isTypingTarget(t: EventTarget | null): boolean {
		if (!(t instanceof HTMLElement)) return false;
		const tag = t.tagName;
		if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
		if (t.isContentEditable) return true;
		return false;
	}

	/**
	 * Find every session-link anchor on the current page (homepage recents,
	 * sessions list, search hits all use the same `href` shape).
	 */
	function sessionAnchors(): HTMLAnchorElement[] {
		return Array.from(
			document.querySelectorAll<HTMLAnchorElement>(
				'a[href*="/sessions/"][href^="/projects/"]'
			)
		).filter((el) => el.offsetParent !== null);
	}

	function moveSelection(dir: 1 | -1) {
		const items = sessionAnchors();
		if (!items.length) return;
		const active = document.activeElement;
		const currentIdx = active instanceof HTMLAnchorElement ? items.indexOf(active) : -1;
		const nextIdx =
			currentIdx === -1
				? dir === 1
					? 0
					: items.length - 1
				: Math.max(0, Math.min(items.length - 1, currentIdx + dir));
		const next = items[nextIdx];
		next?.focus({ preventScroll: false });
		next?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
	}

	onMount(() => {
		const onKey = (e: KeyboardEvent) => {
			const meta = e.metaKey || e.ctrlKey;
			if (meta && e.key.toLowerCase() === 'k') {
				e.preventDefault();
				const input =
					document.querySelector<HTMLInputElement>('input[aria-label="Search across all sessions"]') ||
					document.querySelector<HTMLInputElement>('#search-q');
				input?.focus();
				input?.select();
				return;
			}
			if (isTypingTarget(e.target)) return;
			if (meta || e.altKey) return;
			switch (e.key) {
				case 'j':
					e.preventDefault();
					moveSelection(1);
					return;
				case 'k':
					e.preventDefault();
					moveSelection(-1);
					return;
				case 'Escape': {
					const url = page.url;
					if (url.pathname.includes('/sessions/')) {
						e.preventDefault();
						const projMatch = url.pathname.match(/^\/projects\/([^/]+)/);
						if (projMatch) goto(`/projects/${projMatch[1]}`);
					} else if (url.pathname.startsWith('/projects/')) {
						e.preventDefault();
						goto('/');
					}
					return;
				}
				case '?':
					e.preventDefault();
					alert('Keyboard shortcuts:\n\n⌘K — focus search\nj / k — next / previous session\nEsc — go up\nEnter — open focused\n? — show this help');
					return;
				case 'g':
					// pressing "g" focuses the in-page search if any
					e.preventDefault();
					document.querySelector<HTMLInputElement>('input[type="search"], input[type="text"]')?.focus();
					return;
			}
		};
		document.addEventListener('keydown', onKey);
		return () => document.removeEventListener('keydown', onKey);
	});
</script>
