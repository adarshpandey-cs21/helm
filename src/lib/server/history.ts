import { readdir, stat, open } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { env } from '$env/dynamic/private';
import type {
	ProjectSummary,
	SessionSummary,
	SessionDetail,
	NormalizedEvent
} from '$lib/types';

const DEFAULT_HISTORY_DIR = join(homedir(), '.claude', 'projects');
export const HISTORY_DIR = env.CLAUDE_PROJECTS_DIR?.trim() || DEFAULT_HISTORY_DIR;

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
	const summaries = await Promise.all(
		files.map(async (f: string) => summarizeSession(projectId, f))
	);
	return summaries
		.filter((s): s is SessionSummary => s !== null)
		.sort((a, b) => b.startTime - a.startTime);
}

async function summarizeSession(
	projectId: string,
	fileName: string
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
					if (c?.type === 'tool_use') toolUseCount += 1;
				}
			}
			if (o.isApiErrorMessage) hasErrors = true;
		} else if (o.type === 'system' && o.level === 'error') {
			hasErrors = true;
		}
	}
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
	const lines = await readJsonlLines(filePath);
	const events: NormalizedEvent[] = [];
	let cwd = '';
	let branch: string | null = null;
	let version: string | null = null;
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
			events.push({
				...base,
				kind: 'system',
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
