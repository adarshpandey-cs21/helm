import { error } from '@sveltejs/kit';
import { homedir } from 'node:os';
import { getProject, listSessions } from '$lib/server/history';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const project = await getProject(params.projectId);
	if (!project) throw error(404, 'Project not found');
	const sessions = await listSessions(params.projectId);
	return {
		project,
		sessions,
		home: homedir()
	};
};
