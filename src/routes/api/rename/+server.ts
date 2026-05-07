import { error, json } from '@sveltejs/kit';
import { appendFile, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { HISTORY_DIR, getSession, loadSessionsIndex } from '$lib/server/history';
import type { RequestHandler } from './$types';

const SAFE_SESSION_ID = /^[A-Za-z0-9_-]+$/;
const MAX_TITLE_LEN = 200;

export const POST: RequestHandler = async ({ request }) => {
	let body: { projectId?: unknown; sessionId?: unknown; title?: unknown };
	try {
		body = await request.json();
	} catch {
		throw error(400, 'invalid JSON body');
	}

	const projectId = typeof body.projectId === 'string' ? body.projectId : '';
	const sessionId = typeof body.sessionId === 'string' ? body.sessionId : '';
	const rawTitle = typeof body.title === 'string' ? body.title : '';

	if (!projectId || !sessionId || !SAFE_SESSION_ID.test(sessionId)) {
		throw error(400, 'projectId and a safe sessionId are required');
	}

	const title = rawTitle.replace(/\s+/g, ' ').trim().slice(0, MAX_TITLE_LEN);
	if (!title) throw error(400, 'title is required and cannot be empty');

	// Verify session exists before mutating its file.
	const session = await getSession(projectId, sessionId);
	if (!session) throw error(404, 'session not found');

	const filePath = join(HISTORY_DIR, projectId, `${sessionId}.jsonl`);
	// Mirror what Claude Code's `/rename` writes: a `custom-title` event and
	// an `agent-name` event. `/resume` reads `custom-title`. We deliberately
	// do NOT write `ai-title` because that's the auto-generated AI summary,
	// not the user-facing rename.
	const events = [
		JSON.stringify({ type: 'custom-title', customTitle: title, sessionId }),
		JSON.stringify({ type: 'agent-name', agentName: title, sessionId })
	].join('\n') + '\n';
	try {
		await appendFile(filePath, events, 'utf8');
	} catch (e) {
		throw error(500, `failed to write title: ${String(e)}`);
	}

	// Mirror the rename into Claude's PID-keyed sessions index. This is what
	// `claude --resume` actually reads to display the custom session name. If
	// no entry exists for the session yet (e.g. it was never opened by a
	// version of Claude that maintains this file), we skip silently — the
	// JSONL ai-title still updates our UI.
	let mirrored = false;
	try {
		const index = await loadSessionsIndex();
		const entry = index.get(sessionId);
		if (entry) {
			const txt = await readFile(entry.filePath, 'utf8');
			const parsed = JSON.parse(txt);
			if (parsed && typeof parsed === 'object') {
				parsed.name = title;
				parsed.updatedAt = Date.now();
				await writeFile(entry.filePath, JSON.stringify(parsed), 'utf8');
				mirrored = true;
			}
		}
	} catch {
		/* non-fatal — UI title still updated */
	}

	return json({ ok: true, title, mirroredToClaude: mirrored });
};
