const KEY = 'claude-history-viewer:session-names';

const fullKey = (projectId: string, sessionId: string) => `${projectId}::${sessionId}`;

class SessionNamesStore {
	names = $state<Record<string, string>>({});
	loaded = $state(false);

	load() {
		if (typeof localStorage === 'undefined') return;
		try {
			const raw = localStorage.getItem(KEY);
			if (raw) {
				const parsed = JSON.parse(raw);
				if (parsed && typeof parsed === 'object') {
					const cleaned: Record<string, string> = {};
					for (const [k, v] of Object.entries(parsed)) {
						if (typeof v === 'string' && v.trim()) cleaned[k] = v;
					}
					this.names = cleaned;
				}
			}
		} catch {
			/* ignore */
		}
		this.loaded = true;
	}

	private save() {
		if (typeof localStorage === 'undefined') return;
		try {
			localStorage.setItem(KEY, JSON.stringify(this.names));
		} catch {
			/* ignore */
		}
	}

	get(projectId: string, sessionId: string): string | null {
		return this.names[fullKey(projectId, sessionId)] ?? null;
	}

	set(projectId: string, sessionId: string, name: string) {
		const next = { ...this.names };
		const trimmed = name.trim();
		const k = fullKey(projectId, sessionId);
		if (trimmed) next[k] = trimmed;
		else delete next[k];
		this.names = next;
		this.save();
	}

	clear(projectId: string, sessionId: string) {
		this.set(projectId, sessionId, '');
	}
}

export const sessionNames = new SessionNamesStore();
