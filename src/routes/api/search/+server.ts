import { json } from '@sveltejs/kit';
import { searchAllSessions } from '$lib/server/history';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const q = url.searchParams.get('q')?.trim() ?? '';
	if (!q || q.length < 2) return json({ hits: [], query: q });
	const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '80', 10) || 80, 1), 200);
	const hits = await searchAllSessions(q, { limit });
	return json({ hits, query: q });
};
