<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { tick } from 'svelte';

	let {
		projectId,
		sessionId,
		title,
		fallback,
		size = 'md'
	}: {
		projectId: string;
		sessionId: string;
		title: string | null;
		fallback: string;
		size?: 'sm' | 'md' | 'lg';
	} = $props();

	let editing = $state(false);
	let value = $state('');
	let saving = $state(false);
	let inputEl = $state<HTMLInputElement | null>(null);
	let err = $state<string | null>(null);

	const display = $derived(title?.trim() || fallback);
	const hasCustom = $derived(!!title?.trim());

	async function startEdit(e?: Event) {
		e?.preventDefault();
		e?.stopPropagation();
		if (saving) return;
		err = null;
		value = title ?? '';
		editing = true;
		await tick();
		inputEl?.focus();
		inputEl?.select();
	}

	function cancel() {
		editing = false;
		value = '';
		err = null;
	}

	async function save() {
		const trimmed = value.trim();
		if (!trimmed || trimmed === (title ?? '')) {
			cancel();
			return;
		}
		saving = true;
		err = null;
		try {
			const res = await fetch('/api/rename', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ projectId, sessionId, title: trimmed })
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) {
				err = data?.message || `Failed (${res.status})`;
				return;
			}
			editing = false;
			value = '';
			await invalidateAll();
		} catch (e) {
			err = String(e);
		} finally {
			saving = false;
		}
	}

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			save();
		} else if (e.key === 'Escape') {
			e.preventDefault();
			cancel();
		}
	}

	const sizeClass = $derived(
		size === 'lg'
			? 'text-2xl font-semibold tracking-tight'
			: size === 'sm'
				? 'text-[15px] leading-relaxed'
				: 'text-[15px] font-medium'
	);
</script>

{#if editing}
	<div class="flex items-center gap-2" onclick={(e) => e.stopPropagation()} role="presentation">
		<input
			bind:this={inputEl}
			bind:value
			type="text"
			placeholder={fallback}
			disabled={saving}
			onkeydown={onKey}
			onclick={(e) => e.stopPropagation()}
			class="min-w-0 flex-1 rounded-lg border border-claude-500/40 bg-ink-900/60 px-3 py-1.5 {sizeClass} text-ink-50 outline-none ring-2 ring-claude-500/20 focus:border-claude-500/70 focus:ring-claude-500/30"
		/>
		<button
			type="button"
			onclick={(e) => {
				e.stopPropagation();
				save();
			}}
			disabled={saving}
			class="rounded-lg border border-claude-500/40 bg-claude-500/15 px-2.5 py-1 text-[12px] font-medium text-claude-300 transition hover:bg-claude-500/25 disabled:opacity-60"
			title="Save (Enter)"
		>
			{saving ? 'Saving…' : 'Save'}
		</button>
		<button
			type="button"
			onclick={(e) => {
				e.stopPropagation();
				cancel();
			}}
			disabled={saving}
			class="rounded-lg border border-ink-800 bg-ink-900/60 px-2.5 py-1 text-[12px] text-ink-400 transition hover:text-ink-100"
			title="Cancel (Esc)"
		>
			Cancel
		</button>
	</div>
	{#if err}
		<div class="mt-1 text-[11px] text-rose-300">{err}</div>
	{/if}
{:else}
	<div class="group inline-flex max-w-full items-center gap-2">
		<span class="min-w-0 truncate {sizeClass} {hasCustom ? 'text-ink-50' : 'text-ink-100'}">
			{display}
		</span>
		<button
			type="button"
			onclick={startEdit}
			title="Rename session"
			aria-label="Rename session"
			class="grid size-7 shrink-0 place-items-center rounded-md border border-ink-800 bg-ink-900/40 text-ink-500 opacity-0 transition group-hover:opacity-100 hover:border-ink-700 hover:text-ink-100"
		>
			<svg
				class="size-3.5"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path d="M12 20h9" />
				<path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
			</svg>
		</button>
	</div>
{/if}
