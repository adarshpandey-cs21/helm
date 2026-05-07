import { error } from '@sveltejs/kit';
import { homedir } from 'node:os';
import { getProject, getSession } from '$lib/server/history';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const project = await getProject(params.projectId);
	if (!project) throw error(404, 'Project not found');
	const session = await getSession(params.projectId, params.sessionId);
	if (!session) throw error(404, 'Session not found');
	return {
		project,
		session,
		home: homedir()
	};
};
