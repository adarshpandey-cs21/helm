import { readdir, readFile, stat, unlink } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { env } from '$env/dynamic/private';
import type {
	ProjectSummary,
	SessionSummary,
	SessionDetail,
	NormalizedEvent,
	SearchHit
} from '$lib/types';

const DEFAULT_HISTORY_DIR = join(homedir(), '.claude', 'projects');
export const HISTORY_DIR = env.CLAUDE_PROJECTS_DIR?.trim() || DEFAULT_HISTORY_DIR;

/**
 * Claude Code's `/rename` command writes a custom title to a PID-keyed JSON
 * file in `~/.claude/sessions/<pid>.json` under the `name` field — not to
 * the JSONL `ai-title` event. We scan those files to pick up CLI-side
 * renames and to know which file to update when our UI renames.
 */
export const SESSIONS_INDEX_DIR = join(homedir(), '.claude', 'sessions');

export type SessionIndexEntry = {
	filePath: string;
	sessionId: string;
	name?: string;
	updatedAt?: number;
};

export async function loadSessionsIndex(): Promise<Map<string, SessionIndexEntry>> {
	const map = new Map<string, SessionIndexEntry>();
	let files: string[] = [];
	try {
		files = (await readdir(SESSIONS_INDEX_DIR)).filter((f: string) => f.endsWith('.json'));
	} catch {
		return map;
	}
	await Promise.all(
		files.map(async (f: string) => {
			const filePath = join(SESSIONS_INDEX_DIR, f);
			try {
				const txt = await readFile(filePath, 'utf8');
				const j = JSON.parse(txt);
				if (!j || typeof j.sessionId !== 'string') return;
				const entry: SessionIndexEntry = {
					filePath,
					sessionId: j.sessionId,
					name: typeof j.name === 'string' && j.name.trim() ? j.name.trim() : undefined,
					updatedAt: typeof j.updatedAt === 'number' ? j.updatedAt : undefined
				};
				const existing = map.get(j.sessionId);
				if (
					!existing ||
					(entry.updatedAt !== undefined &&
						(existing.updatedAt === undefined || existing.updatedAt < entry.updatedAt))
				) {
					map.set(j.sessionId, entry);
				}
			} catch {
				/* ignore malformed file */
			}
		})
	);
	return map;
}

export function pickTitle(
	indexEntry: SessionIndexEntry | undefined,
	customTitle: string | null,
	aiTitle: string | null
): string | null {
	// Precedence (matches Claude `/resume`):
	//   1. Active session's PID-JSON `name` (most authoritative for live sessions)
	//   2. JSONL `custom-title` event (written by `/rename`)
	//   3. JSONL `ai-title` event (auto-generated)
	if (indexEntry?.name) return indexEntry.name;
	if (customTitle) return customTitle;
	return aiTitle;
}

async function readJsonlLines(filePath: string): Promise<unknown[]> {
	const lines: unknown[] = [];
	const stream = createReadStream(filePath, { encoding: 'utf8' });
	const rl = createInterface({ input: stream, crlfDelay: Infinity });
	for await (const line of rl) {
		if (!line.trim()) continue;
		try {
			lines.push(JSON.parse(line));
		} catch {
			// skip malformed lines
		}
	}
	return lines;
}

async function* iterJsonlLines(filePath: string): AsyncGenerator<any> {
	const stream = createReadStream(filePath, { encoding: 'utf8' });
	const rl = createInterface({ input: stream, crlfDelay: Infinity });
	for await (const line of rl) {
		if (!line.trim()) continue;
		try {
			yield JSON.parse(line);
		} catch {
			// skip
		}
	}
}

function asTimestamp(s: unknown): number {
	if (typeof s !== 'string') return 0;
	const t = Date.parse(s);
	return Number.isFinite(t) ? t : 0;
}

function extractText(content: unknown): string {
	if (typeof content === 'string') return content;
	if (Array.isArray(content)) {
		return content
			.map((c: any) => {
				if (typeof c === 'string') return c;
				if (c && typeof c === 'object') {
					if (c.type === 'text' && typeof c.text === 'string') return c.text;
					if (c.type === 'tool_use') return '';
					if (c.type === 'thinking' && typeof c.thinking === 'string') return c.thinking;
				}
				return '';
			})
			.join('\n')
			.trim();
	}
	return '';
}

export async function listProjects(): Promise<ProjectSummary[]> {
	let entries: string[] = [];
	try {
		entries = await readdir(HISTORY_DIR);
	} catch {
		return [];
	}
	const summaries = await Promise.all(
		entries.map(async (id: string) => {
			const dir = join(HISTORY_DIR, id);
			let st;
			try {
				st = await stat(dir);
			} catch {
				return null;
			}
			if (!st.isDirectory()) return null;
			let files: string[] = [];
			try {
				files = (await readdir(dir)).filter((f) => f.endsWith('.jsonl'));
			} catch {
				return null;
			}
			let sessionCount = 0;
			let totalMessages = 0;
			let totalUserMessages = 0;
			let lastActivity = 0;
			let firstActivity = Number.MAX_SAFE_INTEGER;
			let totalSize = 0;
			let cwd = '';
			for (const f of files) {
				const filePath = join(dir, f);
				let fst;
				try {
					fst = await stat(filePath);
				} catch {
					continue;
				}
				sessionCount += 1;
				totalSize += fst.size;
				const mt = fst.mtimeMs;
				if (mt > lastActivity) lastActivity = mt;
				const bt = fst.birthtimeMs || mt;
				if (bt < firstActivity) firstActivity = bt;
				// quick scan of first ~30 lines to find cwd + count user messages cheaply
				let lineCount = 0;
				let userCount = 0;
				try {
					for await (const obj of iterJsonlLines(filePath)) {
						lineCount += 1;
						if (obj && typeof obj === 'object') {
							if (!cwd && typeof (obj as any).cwd === 'string') cwd = (obj as any).cwd;
							const t = (obj as any).type;
							if (t === 'user') {
								const role = (obj as any).message?.role;
								const content = (obj as any).message?.content;
								// only count actual prompts (string content), not tool_results
								if (role === 'user' && typeof content === 'string') userCount += 1;
							}
						}
					}
				} catch {
					/* ignore */
				}
				totalMessages += lineCount;
				totalUserMessages += userCount;
			}
			if (firstActivity === Number.MAX_SAFE_INTEGER) firstActivity = lastActivity;
			const displayName = cwd ? cwd.split('/').filter(Boolean).pop() || id : id;
			const parent = cwd ? cwd.split('/').slice(0, -1).join('/') || '/' : '';
			return {
				id,
				cwd: cwd || decodeFolderId(id),
				displayName,
				parent,
				sessionCount,
				totalMessages,
				totalUserMessages,
				lastActivity,
				firstActivity,
				totalSize
			} satisfies ProjectSummary;
		})
	);
	return summaries
		.filter((s): s is ProjectSummary => s !== null && s.sessionCount > 0)
		.sort((a, b) => b.lastActivity - a.lastActivity);
}

function decodeFolderId(id: string): string {
	// best-effort reverse of the lossy "/" → "-" encoding
	return '/' + id.replace(/^-/, '').replace(/-/g, '/');
}

export async function getProject(projectId: string): Promise<ProjectSummary | null> {
	const all = await listProjects();
	return all.find((p) => p.id === projectId) ?? null;
}

export async function listSessions(projectId: string): Promise<SessionSummary[]> {
	const dir = join(HISTORY_DIR, projectId);
	let files: string[] = [];
	try {
		files = (await readdir(dir)).filter((f) => f.endsWith('.jsonl'));
	} catch {
		return [];
	}
	const index = await loadSessionsIndex();
	const summaries = await Promise.all(
		files.map(async (f: string) => summarizeSession(projectId, f, index))
	);
	return summaries
		.filter((s): s is SessionSummary => s !== null)
		.sort((a, b) => b.startTime - a.startTime);
}

async function summarizeSession(
	projectId: string,
	fileName: string,
	index?: Map<string, SessionIndexEntry>
): Promise<SessionSummary | null> {
	const filePath = join(HISTORY_DIR, projectId, fileName);
	let st;
	try {
		st = await stat(filePath);
	} catch {
		return null;
	}
	const sessionId = fileName.replace(/\.jsonl$/, '');
	let firstUserMessage: string | null = null;
	let lastUserMessage: string | null = null;
	let startTime = 0;
	let endTime = 0;
	let cwd = '';
	let branch: string | null = null;
	let version: string | null = null;
	let messageCount = 0;
	let userMessageCount = 0;
	let assistantMessageCount = 0;
	let toolUseCount = 0;
	let hasErrors = false;
	let aiTitle: string | null = null;
	let customTitle: string | null = null;
	let lastBashCommand: string | null = null;
	for await (const obj of iterJsonlLines(filePath)) {
		messageCount += 1;
		if (!obj || typeof obj !== 'object') continue;
		const o = obj as any;
		const ts = asTimestamp(o.timestamp);
		if (ts) {
			if (!startTime || ts < startTime) startTime = ts;
			if (ts > endTime) endTime = ts;
		}
		if (!cwd && typeof o.cwd === 'string') cwd = o.cwd;
		if (!branch && typeof o.gitBranch === 'string') branch = o.gitBranch;
		if (!version && typeof o.version === 'string') version = o.version;
		if (o.type === 'custom-title' && typeof o.customTitle === 'string' && o.customTitle.trim()) {
			// Latest custom-title wins. This is what `/rename` writes and what
			// `/resume` displays.
			customTitle = o.customTitle.trim();
		}
		if (o.type === 'ai-title' && typeof o.aiTitle === 'string' && o.aiTitle.trim()) {
			aiTitle = o.aiTitle.trim();
		}
		if (o.type === 'user') {
			const role = o.message?.role;
			const content = o.message?.content;
			if (role === 'user' && typeof content === 'string') {
				userMessageCount += 1;
				if (firstUserMessage === null) firstUserMessage = content;
				lastUserMessage = content;
			}
		} else if (o.type === 'assistant') {
			assistantMessageCount += 1;
			const content = o.message?.content;
			if (Array.isArray(content)) {
				for (const c of content) {
					if (c?.type === 'tool_use') {
						toolUseCount += 1;
						if (c.name === 'Bash' && typeof c.input?.command === 'string') {
							lastBashCommand = c.input.command;
						}
					}
				}
			}
			if (o.isApiErrorMessage) hasErrors = true;
		} else if (o.type === 'system' && o.level === 'error') {
			hasErrors = true;
		}
	}
	const idx = index?.get(sessionId);
	const finalTitle = pickTitle(idx, customTitle, aiTitle);
	return {
		sessionId,
		projectId,
		startTime,
		endTime,
		durationMs: endTime - startTime,
		messageCount,
		userMessageCount,
		assistantMessageCount,
		toolUseCount,
		cwd,
		branch,
		version,
		firstUserMessage,
		lastUserMessage,
		lastBashCommand,
		title: finalTitle,
		fileSize: st.size,
		hasErrors
	} satisfies SessionSummary;
}

export async function getSession(
	projectId: string,
	sessionId: string
): Promise<SessionDetail | null> {
	const filePath = join(HISTORY_DIR, projectId, `${sessionId}.jsonl`);
	let exists = false;
	try {
		const st = await stat(filePath);
		exists = st.isFile();
	} catch {
		return null;
	}
	if (!exists) return null;
	const [lines, index] = await Promise.all([
		readJsonlLines(filePath),
		loadSessionsIndex()
	]);
	const events: NormalizedEvent[] = [];
	let cwd = '';
	let branch: string | null = null;
	let version: string | null = null;
	let aiTitle: string | null = null;
	let customTitle: string | null = null;
	let startTime = 0;
	let endTime = 0;
	let userMessages = 0;
	let assistantMessages = 0;
	let toolUses = 0;
	let totalInputTokens = 0;
	let totalOutputTokens = 0;
	const toolBreakdown: Record<string, number> = {};
	const filesTouchedSet = new Set<string>();
	for (const obj of lines) {
		if (!obj || typeof obj !== 'object') continue;
		const o = obj as any;
		const ts = asTimestamp(o.timestamp);
		if (ts) {
			if (!startTime || ts < startTime) startTime = ts;
			if (ts > endTime) endTime = ts;
		}
		if (!cwd && typeof o.cwd === 'string') cwd = o.cwd;
		if (!branch && typeof o.gitBranch === 'string') branch = o.gitBranch;
		if (!version && typeof o.version === 'string') version = o.version;
		if (o.type === 'custom-title' && typeof o.customTitle === 'string' && o.customTitle.trim()) {
			customTitle = o.customTitle.trim();
		}
		if (o.type === 'ai-title' && typeof o.aiTitle === 'string' && o.aiTitle.trim()) {
			aiTitle = o.aiTitle.trim();
		}
		const base = {
			uuid: o.uuid ?? cryptoRandomId(),
			parentUuid: o.parentUuid ?? null,
			timestamp: ts,
			raw: obj
		};
		const type = o.type;
		if (type === 'user') {
			const role = o.message?.role;
			const content = o.message?.content;
			if (typeof content === 'string') {
				userMessages += 1;
				events.push({ ...base, kind: 'user-text', role: 'user', text: content });
			} else if (Array.isArray(content)) {
				for (const c of content) {
					if (c?.type === 'tool_result') {
						const resultText = stringifyToolResult(c.content);
						events.push({
							...base,
							uuid: `${base.uuid}:${c.tool_use_id ?? ''}`,
							kind: 'user-tool-result',
							role: 'user',
							toolUseId: c.tool_use_id,
							toolResult: c.content,
							toolResultIsError: c.is_error === true,
							text: resultText
						});
					}
				}
			}
		} else if (type === 'assistant') {
			assistantMessages += 1;
			const content = o.message?.content;
			const usage = o.message?.usage ?? {};
			totalInputTokens += usage.input_tokens || 0;
			totalOutputTokens += usage.output_tokens || 0;
			const u = {
				input: usage.input_tokens,
				output: usage.output_tokens,
				cacheRead: usage.cache_read_input_tokens,
				cacheCreate: usage.cache_creation_input_tokens
			};
			const model = o.message?.model;
			if (Array.isArray(content)) {
				for (const c of content) {
					if (c?.type === 'text') {
						events.push({
							...base,
							uuid: `${base.uuid}:t`,
							kind: 'assistant-text',
							role: 'assistant',
							text: c.text ?? '',
							model,
							usage: u
						});
					} else if (c?.type === 'thinking') {
						events.push({
							...base,
							uuid: `${base.uuid}:think`,
							kind: 'thinking',
							role: 'assistant',
							text: c.thinking ?? '',
							model
						});
					} else if (c?.type === 'tool_use') {
						toolUses += 1;
						const name = c.name ?? 'tool';
						toolBreakdown[name] = (toolBreakdown[name] ?? 0) + 1;
						trackFilesTouched(name, c.input, filesTouchedSet);
						events.push({
							...base,
							uuid: `${base.uuid}:${c.id ?? ''}`,
							kind: 'assistant-tool-use',
							role: 'assistant',
							toolName: name,
							toolInput: c.input,
							toolUseId: c.id,
							model,
							usage: u
						});
					}
				}
			}
		} else if (type === 'system') {
			// Only "real" errors stay as `system` (always visible, red styling).
			// Hooks / turn-duration / informational summaries become `meta` so
			// they're hidden by default behind the "Show meta lines" toggle.
			const isError = o.level === 'error' || !!o.error;
			events.push({
				...base,
				kind: isError ? 'system' : 'meta',
				role: 'system',
				subtype: o.subtype,
				error: o.error,
				text: extractText(o.message?.content) || o.subtype || 'system'
			});
		} else if (type === 'attachment') {
			events.push({
				...base,
				kind: 'attachment',
				subtype: o.attachment?.type,
				text: ''
			});
		} else {
			events.push({
				...base,
				kind: 'meta',
				subtype: type
			});
		}
	}
	events.sort((a, b) => a.timestamp - b.timestamp);
	return {
		sessionId,
		projectId,
		cwd,
		branch,
		version,
		title: pickTitle(index.get(sessionId), customTitle, aiTitle),
		startTime,
		endTime,
		events,
		stats: {
			userMessages,
			assistantMessages,
			toolUses,
			totalInputTokens,
			totalOutputTokens,
			toolBreakdown,
			filesTouched: [...filesTouchedSet].sort()
		}
	} satisfies SessionDetail;
}

function stringifyToolResult(content: unknown): string {
	if (typeof content === 'string') return content;
	if (Array.isArray(content)) {
		return content
			.map((c: any) => (typeof c === 'string' ? c : c?.text ?? ''))
			.filter(Boolean)
			.join('\n');
	}
	return '';
}

function trackFilesTouched(toolName: string, input: any, set: Set<string>) {
	if (!input || typeof input !== 'object') return;
	const fileTools = ['Edit', 'Write', 'Read', 'NotebookEdit', 'MultiEdit'];
	if (fileTools.includes(toolName) && typeof input.file_path === 'string') {
		set.add(input.file_path);
	}
}

function cryptoRandomId(): string {
	return Math.random().toString(36).slice(2, 11);
}

function makeSnippet(text: string, query: string, maxLen = 220): string {
	const lower = text.toLowerCase();
	const q = query.toLowerCase();
	const idx = lower.indexOf(q);
	if (idx === -1) return text.slice(0, maxLen).trim();
	const start = Math.max(0, idx - 60);
	const end = Math.min(text.length, idx + q.length + 140);
	const head = start > 0 ? '…' : '';
	const tail = end < text.length ? '…' : '';
	return head + text.slice(start, end).replace(/\s+/g, ' ').trim() + tail;
}

/**
 * Substring-search across every project's JSONL files.
 * Hits are deduped per session+role and sorted newest-first.
 */
export async function searchAllSessions(
	query: string,
	opts: { limit?: number } = {}
): Promise<SearchHit[]> {
	const q = query.trim();
	if (!q) return [];
	const lowerQ = q.toLowerCase();
	const limit = Math.max(1, Math.min(opts.limit ?? 80, 300));

	let projectIds: string[] = [];
	try {
		projectIds = await readdir(HISTORY_DIR);
	} catch {
		return [];
	}

	const projects = await listProjects();
	const projectNameById = new Map<string, string>(projects.map((p) => [p.id, p.displayName]));
	const titlesIndex = await loadSessionsIndex();
	const titleCache = new Map<string, string | null>();
	const hits: SearchHit[] = [];

	for (const projectId of projectIds) {
		if (hits.length >= limit) break;
		const dir = join(HISTORY_DIR, projectId);
		let files: string[] = [];
		try {
			files = (await readdir(dir)).filter((f) => f.endsWith('.jsonl'));
		} catch {
			continue;
		}
		for (const f of files) {
			if (hits.length >= limit) break;
			const filePath = join(dir, f);
			const sessionId = f.replace(/\.jsonl$/, '');
			let sessionTitle: string | null = null;
			let titleKnown = false;
			const seenRoles = new Set<string>();
			const stream = createReadStream(filePath, { encoding: 'utf8' });
			const rl = createInterface({ input: stream, crlfDelay: Infinity });
			for await (const line of rl) {
				if (hits.length >= limit) break;
				if (!line.trim()) continue;
				if (!line.toLowerCase().includes(lowerQ)) continue;
				let obj: any;
				try {
					obj = JSON.parse(line);
				} catch {
					continue;
				}
				if (!obj || typeof obj !== 'object') continue;
				const ts = asTimestamp(obj.timestamp);
				let text: string | null = null;
				let role: 'user' | 'assistant' | null = null;
				if (obj.type === 'user' && typeof obj.message?.content === 'string') {
					text = obj.message.content;
					role = 'user';
				} else if (obj.type === 'assistant' && Array.isArray(obj.message?.content)) {
					const parts: string[] = [];
					for (const c of obj.message.content) {
						if (c?.type === 'text' && typeof c.text === 'string') parts.push(c.text);
					}
					text = parts.join('\n').trim();
					role = 'assistant';
				}
				if (!text || !role || !text.toLowerCase().includes(lowerQ)) continue;
				const dedupeKey = `${sessionId}::${role}`;
				if (seenRoles.has(dedupeKey)) continue;
				seenRoles.add(dedupeKey);
				if (!titleKnown) {
					if (titleCache.has(sessionId)) sessionTitle = titleCache.get(sessionId)!;
					else {
						sessionTitle = await titleForSession(filePath, sessionId, titlesIndex);
						titleCache.set(sessionId, sessionTitle);
					}
					titleKnown = true;
				}
				hits.push({
					projectId,
					projectName: projectNameById.get(projectId) ?? projectId,
					sessionId,
					sessionTitle,
					timestamp: ts,
					role,
					snippet: makeSnippet(text, q)
				});
			}
		}
	}

	hits.sort((a, b) => b.timestamp - a.timestamp);
	return hits;
}

async function titleForSession(
	filePath: string,
	sessionId: string,
	index: Map<string, SessionIndexEntry>
): Promise<string | null> {
	let custom: string | null = null;
	let ai: string | null = null;
	try {
		for await (const obj of iterJsonlLines(filePath)) {
			if (!obj || typeof obj !== 'object') continue;
			const o = obj as any;
			if (o.type === 'custom-title' && typeof o.customTitle === 'string') custom = o.customTitle;
			else if (o.type === 'ai-title' && typeof o.aiTitle === 'string') ai = o.aiTitle;
		}
	} catch {
		/* ignore */
	}
	return pickTitle(index.get(sessionId), custom, ai);
}

/** Recent sessions across all projects, newest first. */
export async function listRecentSessions(limit = 10): Promise<SessionSummary[]> {
	const projects = await listProjects();
	const all: SessionSummary[] = [];
	const index = await loadSessionsIndex();
	for (const p of projects) {
		const dir = join(HISTORY_DIR, p.id);
		let files: string[] = [];
		try {
			files = (await readdir(dir)).filter((f) => f.endsWith('.jsonl'));
		} catch {
			continue;
		}
		const summaries = await Promise.all(
			files.map((f) => summarizeSession(p.id, f, index))
		);
		for (const s of summaries) if (s) all.push(s);
	}
	all.sort((a, b) => b.startTime - a.startTime);
	return all.slice(0, limit);
}

export async function deleteSession(projectId: string, sessionId: string): Promise<boolean> {
	if (!/^[A-Za-z0-9_-]+$/.test(sessionId)) return false;
	const filePath = join(HISTORY_DIR, projectId, `${sessionId}.jsonl`);
	try {
		await unlink(filePath);
		return true;
	} catch {
		return false;
	}
}

/** Render a session's events to clean Markdown for export/clipboard. */
export function sessionToMarkdown(detail: SessionDetail, opts: { includeTools?: boolean } = {}): string {
	const includeTools = opts.includeTools ?? false;
	const lines: string[] = [];
	const title = detail.title || 'Session transcript';
	lines.push(`# ${title}`);
	lines.push('');
	lines.push(`> **cwd:** \`${detail.cwd || '?'}\``);
	if (detail.branch) lines.push(`> **branch:** \`${detail.branch}\``);
	if (detail.startTime) lines.push(`> **started:** ${new Date(detail.startTime).toISOString()}`);
	lines.push('');

	for (const e of detail.events) {
		if (e.kind === 'user-text') {
			lines.push(`### 👤 You`);
			lines.push('');
			lines.push((e.text ?? '').trim());
			lines.push('');
		} else if (e.kind === 'assistant-text') {
			lines.push(`### 🤖 Claude`);
			lines.push('');
			lines.push((e.text ?? '').trim());
			lines.push('');
		} else if (e.kind === 'assistant-tool-use' && includeTools) {
			lines.push(`<details><summary><strong>🛠️ ${e.toolName}</strong></summary>`);
			lines.push('');
			lines.push('```json');
			lines.push(JSON.stringify(e.toolInput, null, 2).slice(0, 4000));
			lines.push('```');
			lines.push('</details>');
			lines.push('');
		}
	}
	return lines.join('\n').trim() + '\n';
}
