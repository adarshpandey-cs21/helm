import type { ModelTokens, TokensByModel } from './tokens';

export type ModelPricing = {
	baseInput: number;
	output: number;
	// "Cache hits & refreshes" on the pricing page.
	cacheRead: number;
	cacheWrite5m: number;
	cacheWrite1h: number;
};

// Claude Fable 5 and Claude Mythos 5 share identical pricing.
const FABLE_MYTHOS_5: ModelPricing = {
	baseInput: 10,
	output: 50,
	cacheRead: 1,
	cacheWrite5m: 12.5,
	cacheWrite1h: 20
};

const OPUS_45_PLUS: ModelPricing = {
	baseInput: 5,
	output: 25,
	cacheRead: 0.5,
	cacheWrite5m: 6.25,
	cacheWrite1h: 10
};

const OPUS_41: ModelPricing = {
	baseInput: 15,
	output: 75,
	cacheRead: 1.5,
	cacheWrite5m: 18.75,
	cacheWrite1h: 30
};

const SONNET_45_PLUS: ModelPricing = {
	baseInput: 3,
	output: 15,
	cacheRead: 0.3,
	cacheWrite5m: 3.75,
	cacheWrite1h: 6
};

const HAIKU_45: ModelPricing = {
	baseInput: 1,
	output: 5,
	cacheRead: 0.1,
	cacheWrite5m: 1.25,
	cacheWrite1h: 2
};

// Non-deprecated Anthropic API models (May 2026 pricing page).
// Prefix-matched so date-suffixed IDs like "claude-haiku-4-5-20251001" resolve.
const PRICING_BY_PREFIX: ReadonlyArray<readonly [prefix: string, pricing: ModelPricing]> = [
	['claude-fable-5', FABLE_MYTHOS_5],
	['claude-mythos-5', FABLE_MYTHOS_5],
	['claude-opus-4-8', OPUS_45_PLUS],
	['claude-opus-4-7', OPUS_45_PLUS],
	['claude-opus-4-6', OPUS_45_PLUS],
	['claude-opus-4-5', OPUS_45_PLUS],
	['claude-opus-4-1', OPUS_41],
	['claude-sonnet-4-6', SONNET_45_PLUS],
	['claude-sonnet-4-5', SONNET_45_PLUS],
	['claude-haiku-4-5', HAIKU_45]
];

export function pricingFor(modelId: string): ModelPricing | null {
	const id = modelId.toLowerCase();
	for (const [prefix, pricing] of PRICING_BY_PREFIX) {
		if (id.startsWith(prefix)) return pricing;
	}
	return null;
}

const MTOK = 1_000_000;

export function costFor(t: ModelTokens, modelId: string): number {
	const p = pricingFor(modelId);
	if (!p) return 0;
	return (
		(t.input * p.baseInput +
			t.output * p.output +
			t.cacheRead * p.cacheRead +
			t.cacheCreate5m * p.cacheWrite5m +
			t.cacheCreate1h * p.cacheWrite1h) /
		MTOK
	);
}

/**
 * Aggregate cost across every model in a `TokensByModel` map and return the
 * list of models we have no pricing data for (so the UI can warn that the
 * total is a lower-bound estimate).
 */
export function summarizePricing(byModel: TokensByModel): {
	cost: number;
	unknownModels: string[];
} {
	let cost = 0;
	const unknownModels: string[] = [];
	for (const [model, tok] of Object.entries(byModel)) {
		cost += costFor(tok, model);
		if (pricingFor(model) === null) unknownModels.push(model);
	}
	return { cost, unknownModels };
}
