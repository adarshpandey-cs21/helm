export type ModelTokens = {
	input: number;
	output: number;
	cacheRead: number;
	/**
	 * Authoritative `cache_creation_input_tokens` from the Anthropic API.
	 * The API guarantees `cacheCreate == cacheCreate5m + cacheCreate1h` for
	 * normal responses, but the TTL breakdown can drift by ~1% on
	 * multi-iteration calls. When the API omits the breakdown entirely,
	 * history.ts routes the full value into the 1h bucket.
	 */
	cacheCreate: number;
	cacheCreate5m: number;
	cacheCreate1h: number;
};

export type TokensByModel = Record<string, ModelTokens>;

export type TokenTotals = ModelTokens & { total: number };

export function emptyModelTokens(): ModelTokens {
	return {
		input: 0,
		output: 0,
		cacheRead: 0,
		cacheCreate: 0,
		cacheCreate5m: 0,
		cacheCreate1h: 0
	};
}

export function addUsage(target: ModelTokens, src: ModelTokens): void {
	target.input += src.input;
	target.output += src.output;
	target.cacheRead += src.cacheRead;
	target.cacheCreate += src.cacheCreate;
	target.cacheCreate5m += src.cacheCreate5m;
	target.cacheCreate1h += src.cacheCreate1h;
}

/**
 * Parse a raw Anthropic-API `usage` object into a normalized `ModelTokens`.
 * Falls back to the 1h bucket when the TTL breakdown is missing — Claude
 * Code's traffic is ~97% 1h cache writes.
 */
export function extractUsage(rawUsage: unknown): ModelTokens {
	const u = (rawUsage ?? {}) as {
		input_tokens?: number;
		output_tokens?: number;
		cache_read_input_tokens?: number;
		cache_creation_input_tokens?: number;
		cache_creation?: {
			ephemeral_5m_input_tokens?: number;
			ephemeral_1h_input_tokens?: number;
		};
	};
	const cc = u.cache_creation_input_tokens || 0;
	const cc5m = u.cache_creation?.ephemeral_5m_input_tokens || 0;
	const cc1h = u.cache_creation?.ephemeral_1h_input_tokens || 0;
	const hasBreakdown = cc5m + cc1h > 0;
	return {
		input: u.input_tokens || 0,
		output: u.output_tokens || 0,
		cacheRead: u.cache_read_input_tokens || 0,
		cacheCreate: cc,
		cacheCreate5m: hasBreakdown ? cc5m : 0,
		cacheCreate1h: hasBreakdown ? cc1h : cc
	};
}

export function isNonEmptyUsage(t: ModelTokens): boolean {
	return !!(t.input || t.output || t.cacheRead || t.cacheCreate || t.cacheCreate5m || t.cacheCreate1h);
}

export function sumTokens(byModel: TokensByModel): TokenTotals {
	const acc = emptyModelTokens();
	for (const m of Object.values(byModel)) addUsage(acc, m);
	return { ...acc, total: acc.input + acc.output + acc.cacheRead + acc.cacheCreate };
}

export function mergeTokensByModel(maps: TokensByModel[]): TokensByModel {
	const out: TokensByModel = {};
	for (const map of maps) {
		for (const [model, tok] of Object.entries(map)) {
			if (!out[model]) out[model] = emptyModelTokens();
			addUsage(out[model], tok);
		}
	}
	return out;
}
