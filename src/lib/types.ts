export type ProjectSummary = {
	id: string;
	cwd: string;
	displayName: string;
	parent: string;
	sessionCount: number;
	totalMessages: number;
	totalUserMessages: number;
	lastActivity: number;
	firstActivity: number;
	totalSize: number;
};

export type SessionSummary = {
	sessionId: string;
	projectId: string;
	startTime: number;
	endTime: number;
	durationMs: number;
	messageCount: number;
	userMessageCount: number;
	assistantMessageCount: number;
	toolUseCount: number;
	cwd: string;
	branch: string | null;
	version: string | null;
	firstUserMessage: string | null;
	lastUserMessage: string | null;
	title: string | null;
	fileSize: number;
	hasErrors: boolean;
};

export type NormalizedEvent = {
	uuid: string;
	parentUuid: string | null;
	timestamp: number;
	kind:
		| 'user-text'
		| 'user-tool-result'
		| 'assistant-text'
		| 'assistant-tool-use'
		| 'system'
		| 'attachment'
		| 'meta'
		| 'thinking';
	role?: 'user' | 'assistant' | 'system';
	text?: string;
	toolName?: string;
	toolInput?: unknown;
	toolUseId?: string;
	toolResult?: unknown;
	toolResultIsError?: boolean;
	model?: string;
	usage?: { input?: number; output?: number; cacheRead?: number; cacheCreate?: number };
	subtype?: string;
	error?: unknown;
	raw: unknown;
};

export type SessionDetail = {
	sessionId: string;
	projectId: string;
	cwd: string;
	branch: string | null;
	version: string | null;
	title: string | null;
	startTime: number;
	endTime: number;
	events: NormalizedEvent[];
	stats: {
		userMessages: number;
		assistantMessages: number;
		toolUses: number;
		totalInputTokens: number;
		totalOutputTokens: number;
		toolBreakdown: Record<string, number>;
		filesTouched: string[];
	};
};
