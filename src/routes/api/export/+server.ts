import { error, json } from '@sveltejs/kit';
import { getSession, sessionToMarkdown } from '$lib/server/history';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const projectId = url.searchParams.get('projectId') ?? '';
	const sessionId = url.searchParams.get('sessionId') ?? '';
	const includeTools = url.searchParams.get('tools') === '1';
	if (!projectId || !sessionId) throw error(400, 'projectId and sessionId required');
	const detail = await getSession(projectId, sessionId);
	if (!detail) throw error(404, 'session not found');
	const md = sessionToMarkdown(detail, { includeTools });
	return json({ ok: true, markdown: md });
};
