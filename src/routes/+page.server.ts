import { homedir } from 'node:os';
import { listProjects } from '$lib/server/history';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const projects = await listProjects();
	return {
		projects,
		home: homedir()
	};
};
