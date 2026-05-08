import { error, json } from '@sveltejs/kit';
import { deleteSession } from '$lib/server/history';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = async ({ url }) => {
	const projectId = url.searchParams.get('projectId') ?? '';
	const sessionId = url.searchParams.get('sessionId') ?? '';
	if (!projectId || !sessionId) throw error(400, 'projectId and sessionId required');
	const ok = await deleteSession(projectId, sessionId);
	if (!ok) throw error(500, 'failed to delete session file');
	return json({ ok: true });
};
