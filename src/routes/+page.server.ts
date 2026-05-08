import { homedir } from 'node:os';
import { listProjects, listRecentSessions } from '$lib/server/history';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [projects, recent] = await Promise.all([listProjects(), listRecentSessions(8)]);
	return {
		projects,
		recent,
		home: homedir()
	};
};
