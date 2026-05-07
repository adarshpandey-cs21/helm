const SESSIONS_KEY = 'claude-history-viewer:pinned-sessions';
const PROJECTS_KEY = 'claude-history-viewer:pinned-projects';

const sessionKey = (projectId: string, sessionId: string) => `${projectId}::${sessionId}`;

class PinnedStore {
	sessions = $state<Set<string>>(new Set()); // `${projectId}::${sessionId}`
	projects = $state<Set<string>>(new Set()); // projectId
	loaded = $state(false);

	load() {
		if (typeof localStorage === 'undefined') return;
		try {
			const rawS = localStorage.getItem(SESSIONS_KEY);
			if (rawS) {
				const arr = JSON.parse(rawS);
				if (Array.isArray(arr)) {
					this.sessions = new Set(
						arr.filter((x): x is string => typeof x === 'string' && x.includes('::'))
					);
				}
			}
			const rawP = localStorage.getItem(PROJECTS_KEY);
			if (rawP) {
				const arr = JSON.parse(rawP);
				if (Array.isArray(arr)) {
					this.projects = new Set(arr.filter((x): x is string => typeof x === 'string'));
				}
			}
		} catch {
			/* ignore */
		}
		this.loaded = true;
	}

	private saveSessions() {
		if (typeof localStorage === 'undefined') return;
		try {
			localStorage.setItem(SESSIONS_KEY, JSON.stringify([...this.sessions]));
		} catch {
			/* ignore */
		}
	}

	private saveProjects() {
		if (typeof localStorage === 'undefined') return;
		try {
			localStorage.setItem(PROJECTS_KEY, JSON.stringify([...this.projects]));
		} catch {
			/* ignore */
		}
	}

	hasSession(projectId: string, sessionId: string) {
		return this.sessions.has(sessionKey(projectId, sessionId));
	}

	toggleSession(projectId: string, sessionId: string) {
		const key = sessionKey(projectId, sessionId);
		const next = new Set(this.sessions);
		if (next.has(key)) next.delete(key);
		else next.add(key);
		this.sessions = next;
		this.saveSessions();
	}

	hasProject(projectId: string) {
		return this.projects.has(projectId);
	}

	toggleProject(projectId: string) {
		const next = new Set(this.projects);
		if (next.has(projectId)) next.delete(projectId);
		else next.add(projectId);
		this.projects = next;
		this.saveProjects();
	}

	/** Returns session IDs (without project prefix) that are pinned in the given project. */
	pinnedSessionIdsForProject(projectId: string): string[] {
		const prefix = `${projectId}::`;
		const out: string[] = [];
		for (const k of this.sessions) {
			if (k.startsWith(prefix)) out.push(k.slice(prefix.length));
		}
		return out;
	}
}

export const pinned = new PinnedStore();
