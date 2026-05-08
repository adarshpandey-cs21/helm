import { searchAllSessions } from '$lib/server/history';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const q = url.searchParams.get('q')?.trim() ?? '';
	const hits = q.length >= 2 ? await searchAllSessions(q, { limit: 80 }) : [];
	return { q, hits };
};
