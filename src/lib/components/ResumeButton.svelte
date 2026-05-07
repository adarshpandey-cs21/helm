<script lang="ts">
	import { onMount } from 'svelte';

	let {
		projectId,
		sessionId
	}: { projectId: string; sessionId: string } = $props();

	type Term = 'iterm' | 'terminal' | 'warp' | 'copy';
	type WarpMode = 'window' | 'tab';
	const WARP_MODE_KEY = 'claude-history-viewer:warp-mode';

	let busy = $state<Term | null>(null);
	let toast = $state<{ kind: 'ok' | 'err'; text: string } | null>(null);
	let toastTimer: ReturnType<typeof setTimeout> | null = null;
	let warpMode = $state<WarpMode>('window');
	let mounted = $state(false);
	let warpMenuOpen = $state(false);
	let warpMenuRef = $state<HTMLDivElement | null>(null);

	onMount(() => {
		try {
			const stored = localStorage.getItem(WARP_MODE_KEY);
			if (stored === 'tab' || stored === 'window') warpMode = stored;
		} catch {
			/* ignore */
		}
		mounted = true;

		const onDoc = (e: MouseEvent) => {
			if (!warpMenuOpen) return;
			if (warpMenuRef && !warpMenuRef.contains(e.target as Node)) warpMenuOpen = false;
		};
		document.addEventListener('click', onDoc);
		return () => document.removeEventListener('click', onDoc);
	});

	$effect(() => {
		if (!mounted) return;
		try {
			localStorage.setItem(WARP_MODE_KEY, warpMode);
		} catch {
			/* ignore */
		}
	});

	function showToast(kind: 'ok' | 'err', text: string) {
		toast = { kind, text };
		if (toastTimer) clearTimeout(toastTimer);
		toastTimer = setTimeout(() => (toast = null), 3500);
	}

	function labelOf(t: Term): string {
		if (t === 'iterm') return 'iTerm';
		if (t === 'warp') return 'Warp';
		if (t === 'terminal') return 'Terminal';
		return 'Copy';
	}

	function pickWarpMode(m: WarpMode, e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		warpMode = m;
		warpMenuOpen = false;
	}

	async function resume(term: Term, e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		warpMenuOpen = false;
		if (busy) return;
		busy = term;
		try {
			if (term === 'copy') {
				const res = await fetch('/api/resume', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ projectId, sessionId, terminal: 'copy' })
				});
				const data = await res.json().catch(() => ({}));
				if (data.command) {
					await navigator.clipboard.writeText(data.command);
					showToast('ok', 'Command copied');
				} else {
					showToast('err', 'Could not generate command');
				}
				return;
			}
			const payload: Record<string, string> = { projectId, sessionId, terminal: term };
			if (term === 'warp') payload.warpMode = warpMode;
			const res = await fetch('/api/resume', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(payload)
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) {
				showToast('err', data?.message || `Failed (${res.status})`);
				return;
			}
			if (data.opened) {
				if (data.mayNeedClipboard && data.command) {
					try {
						await navigator.clipboard.writeText(data.command);
					} catch {
						/* ignore */
					}
					showToast('ok', `Opening in ${labelOf(term)}… (⌘V if it doesn't auto-run)`);
				} else {
					showToast('ok', `Opening in ${labelOf(term)}…`);
				}
			} else if (data.command) {
				try {
					await navigator.clipboard.writeText(data.command);
					showToast('ok', 'Command copied');
				} catch {
					showToast('ok', data.command);
				}
			}
		} catch (err) {
			showToast('err', String(err));
		} finally {
			busy = null;
		}
	}

	const warpModes: { key: WarpMode; label: string; hint: string }[] = [
		{ key: 'window', label: 'New window', hint: 'Always works · no permission' },
		{ key: 'tab', label: 'Active window', hint: 'Needs Accessibility' }
	];
</script>

<div class="relative inline-flex flex-col items-end gap-1.5">
	<div class="flex items-center gap-1.5">
		<span class="text-[10px] font-medium uppercase tracking-[0.16em] text-ink-500">
			Resume in
		</span>

		<!-- Warp split button -->
		<div class="relative inline-flex items-stretch" bind:this={warpMenuRef}>
			<button
				type="button"
				onclick={(e) => resume('warp', e)}
				disabled={busy !== null}
				title={warpMode === 'tab'
					? 'Open in active Warp window (needs Accessibility)'
					: 'Open in a new Warp window'}
				class="inline-flex items-center gap-1.5 rounded-l-lg border border-r-0 border-claude-500/40 bg-claude-500/15 px-3 py-1.5 text-[13px] font-medium text-claude-300 transition hover:border-claude-500/60 hover:bg-claude-500/25 disabled:cursor-wait disabled:opacity-50"
			>
				{#if busy === 'warp'}
					<svg
						class="size-3.5 animate-spin"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<path d="M21 12a9 9 0 1 1-6.219-8.56" />
					</svg>
				{:else}
					<svg
						class="size-3.5"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<polygon points="6 4 20 12 6 20 6 4" />
					</svg>
				{/if}
				<span>Warp</span>
			</button>
			<button
				type="button"
				onclick={(e) => {
					e.preventDefault();
					e.stopPropagation();
					warpMenuOpen = !warpMenuOpen;
				}}
				disabled={busy !== null}
				aria-label="Pick Warp mode"
				aria-expanded={warpMenuOpen}
				class="grid place-items-center rounded-r-lg border border-claude-500/40 bg-claude-500/15 px-2 text-claude-300 transition hover:border-claude-500/60 hover:bg-claude-500/25 disabled:cursor-wait disabled:opacity-50"
			>
				<svg
					class="size-3.5 transition {warpMenuOpen ? 'rotate-180' : ''}"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
				>
					<path d="m6 9 6 6 6-6" />
				</svg>
			</button>

			{#if warpMenuOpen}
				<div
					role="menu"
					class="absolute right-0 top-full z-30 mt-1.5 w-[210px] overflow-hidden rounded-xl border border-ink-700/80 bg-ink-900/95 p-1 shadow-xl shadow-black/40 backdrop-blur"
				>
					{#each warpModes as m (m.key)}
						<button
							type="button"
							role="menuitemradio"
							aria-checked={warpMode === m.key}
							onclick={(e) => pickWarpMode(m.key, e)}
							class="flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left transition hover:bg-ink-800/80"
						>
							<span
								class="mt-0.5 grid size-3.5 shrink-0 place-items-center rounded-full border {warpMode ===
								m.key
									? 'border-claude-400 bg-claude-500/30'
									: 'border-ink-600'}"
							>
								{#if warpMode === m.key}
									<span class="size-1.5 rounded-full bg-claude-300"></span>
								{/if}
							</span>
							<span class="flex flex-col gap-0.5">
								<span class="text-[12px] font-medium text-ink-100">{m.label}</span>
								<span class="text-[10.5px] text-ink-500">{m.hint}</span>
							</span>
						</button>
					{/each}
				</div>
			{/if}
		</div>

		{#each [{ key: 'iterm', label: 'iTerm' }, { key: 'terminal', label: 'Terminal' }, { key: 'copy', label: 'Copy' }] as it (it.key)}
			<button
				type="button"
				onclick={(e) => resume(it.key as Term, e)}
				disabled={busy !== null}
				title={it.key === 'copy'
					? 'Copy the resume command to clipboard'
					: `Open this session in ${it.label}`}
				class="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[13px] font-medium transition disabled:cursor-wait disabled:opacity-50 {it.key ===
				'copy'
					? 'border-ink-700 bg-ink-900/60 text-ink-300 hover:border-ink-600 hover:text-ink-100'
					: 'border-claude-500/40 bg-claude-500/15 text-claude-300 hover:border-claude-500/60 hover:bg-claude-500/25'}"
			>
				{#if busy === it.key}
					<svg
						class="size-3.5 animate-spin"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<path d="M21 12a9 9 0 1 1-6.219-8.56" />
					</svg>
				{:else if it.key === 'copy'}
					<svg
						class="size-3.5"
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
				{:else}
					<svg
						class="size-3.5"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<polygon points="6 4 20 12 6 20 6 4" />
					</svg>
				{/if}
				<span>{it.label}</span>
			</button>
		{/each}
	</div>

	{#if toast}
		<div
			role="status"
			class="rounded-lg border px-3 py-1.5 text-[11.5px] shadow-lg {toast.kind === 'ok'
				? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
				: 'border-rose-500/30 bg-rose-500/10 text-rose-200'}"
		>
			{toast.text}
		</div>
	{/if}
</div>
