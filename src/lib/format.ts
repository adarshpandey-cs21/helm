export function formatRelativeTime(ts: number): string {
	if (!ts) return '—';
	const diff = Date.now() - ts;
	const abs = Math.abs(diff);
	const future = diff < 0;
	const sec = Math.round(abs / 1000);
	const min = Math.round(sec / 60);
	const hr = Math.round(min / 60);
	const day = Math.round(hr / 24);
	const week = Math.round(day / 7);
	const month = Math.round(day / 30);
	const year = Math.round(day / 365);
	let out: string;
	if (sec < 5) out = 'just now';
	else if (sec < 60) out = `${sec}s`;
	else if (min < 60) out = `${min}m`;
	else if (hr < 24) out = `${hr}h`;
	else if (day < 7) out = `${day}d`;
	else if (week < 5) out = `${week}w`;
	else if (month < 12) out = `${month}mo`;
	else out = `${year}y`;
	if (out === 'just now') return out;
	return future ? `in ${out}` : `${out} ago`;
}

export function formatAbsoluteTime(ts: number): string {
	if (!ts) return '—';
	const d = new Date(ts);
	return d.toLocaleString(undefined, {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	});
}

export function formatBytes(bytes: number): string {
	if (!bytes) return '0 B';
	const units = ['B', 'KB', 'MB', 'GB'];
	let v = bytes;
	let i = 0;
	while (v >= 1024 && i < units.length - 1) {
		v /= 1024;
		i++;
	}
	return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

export function formatDuration(ms: number): string {
	if (!ms || ms < 0) return '—';
	const s = Math.round(ms / 1000);
	if (s < 60) return `${s}s`;
	const m = Math.floor(s / 60);
	const rs = s % 60;
	if (m < 60) return rs ? `${m}m ${rs}s` : `${m}m`;
	const h = Math.floor(m / 60);
	const rm = m % 60;
	return rm ? `${h}h ${rm}m` : `${h}h`;
}

export function truncate(s: string | null | undefined, n = 200): string {
	if (!s) return '';
	const trimmed = s.replace(/\s+/g, ' ').trim();
	if (trimmed.length <= n) return trimmed;
	return trimmed.slice(0, n - 1) + '…';
}

/**
 * Compact-notation number: 1234 → "1.2k", 1_500_000 → "1.5M". Used for token counts.
 */
export function formatCompactNumber(n: number): string {
	if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
	if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k';
	return n.toString();
}

/**
 * Percentage as a CSS-ready string (e.g. "33.33%"). Returns "0%" when total is 0.
 */
export function formatPercent(part: number, total: number): string {
	if (!total) return '0%';
	return ((part / total) * 100).toFixed(2) + '%';
}

/**
 * USD cost with adaptive precision: "$1.5k" / "$123" / "$12.34" / "$0.0234".
 * Returns "—" for zero / negative / NaN so call sites don't need to guard.
 */
export function formatCost(usd: number): string {
	if (!usd || usd < 0) return '—';
	if (usd >= 1000) return '$' + (usd / 1000).toFixed(1) + 'k';
	if (usd >= 100) return '$' + usd.toFixed(0);
	if (usd >= 1) return '$' + usd.toFixed(2);
	return '$' + usd.toFixed(4);
}

export function shortenPath(path: string, homePrefix?: string): string {
	if (!path) return '';
	if (homePrefix && path.startsWith(homePrefix)) {
		return '~' + path.slice(homePrefix.length);
	}
	return path;
}

/**
 * Build a deep-link URL into a local editor for an absolute file path.
 * Returns null for non-absolute paths.
 */
export function editorLink(
	editor: 'vscode' | 'cursor' | 'zed',
	absolutePath: string,
	line?: number
): string | null {
	if (!absolutePath || !absolutePath.startsWith('/')) return null;
	const path = encodeURI(absolutePath);
	const lineSuffix = line && line > 0 ? `:${line}:1` : '';
	switch (editor) {
		case 'vscode':
			return `vscode://file${path}${lineSuffix}`;
		case 'cursor':
			return `cursor://file${path}${lineSuffix}`;
		case 'zed':
			return `zed://file${path}${lineSuffix}`;
	}
}
