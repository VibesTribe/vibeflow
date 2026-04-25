/**
 * vibeflow-meta:
 * id: src/adapters/llmProvider.ts
 * task: REBUILD-V5
 * regions:
 *   - id: llm-provider
 *     hash: 00000000
 * locked: false
 * last_commit: null
 */
/* @editable:llm-provider */
import { promises as fs } from "fs";
import path from "path";
const REGISTRY_PATH = path.resolve("data/registry/llm_providers.json");
const defaultCaller = async (provider, _apiKey, request) => {
    const excerpt = extractPromptSnippet(request);
    const completionTokens = Math.min(provider.max_output_tokens ?? 256, 128);
    const promptTokens = estimateTokens(excerpt);
    return {
        output: `[dry-run] ${provider.label} (${provider.model}) would respond to: ${excerpt}`,
        tokens: {
            prompt: promptTokens,
            completion: completionTokens,
            total: promptTokens + completionTokens,
        },
        metadata: {
            dryRun: true,
            providerId: provider.id,
        },
    };
};
export class LLMProviderAdapter {
    static async load(options = {}) {
        const registryPath = options.registryPath ?? REGISTRY_PATH;
        const raw = await fs.readFile(registryPath, "utf8");
        const registry = JSON.parse(raw);
        return new LLMProviderAdapter(registry, options);
    }
    constructor(registry, options = {}) {
        this.providers = [...(registry.providers ?? [])]
            .filter((provider) => provider.enabled)
            .sort((a, b) => a.priority - b.priority);
        this.dryRun = registry.dry_run ?? {
            provider: "dry-run",
            model: "stub",
            message: "Dry run fallback: no providers available.",
        };
        this.caller = options.caller ?? defaultCaller;
        this.logger = options.logger;
    }
    async generate(request) {
        const attempts = [];
        let quotaFailureDetected = false;
        for (const provider of this.providers) {
            const apiKey = this.resolveApiKey(provider);
            if (!apiKey) {
                await this.recordAttempt(attempts, {
                    provider: provider.id,
                    model: provider.model,
                    status: "skipped",
                    timestamp: new Date().toISOString(),
                    reason: `Missing API key for ${provider.api_key_env}`,
                    reasonCode: "E/MISSING_SECRET",
                });
                continue;
            }
            const started = Date.now();
            try {
                const result = await this.caller(provider, apiKey, request);
                const latencyMs = Date.now() - started;
                const tokens = normaliseTokens(result.tokens);
                const status = attempts.length === 0 ? "ok" : "fallback";
                const attempt = {
                    provider: provider.id,
                    model: provider.model,
                    status: "ok",
                    timestamp: new Date().toISOString(),
                    latencyMs,
                    metadata: result.metadata,
                };
                await this.recordAttempt(attempts, attempt);
                return {
                    provider: provider.id,
                    model: provider.model,
                    status,
                    output: result.output,
                    tokens,
                    attempts,
                    metadata: result.metadata,
                };
            }
            catch (error) {
                const mapped = this.mapError(error);
                quotaFailureDetected = quotaFailureDetected || mapped.reasonCode === "E/QUOTA_EXCEEDED";
                await this.recordAttempt(attempts, {
                    provider: provider.id,
                    model: provider.model,
                    status: "failed",
                    timestamp: new Date().toISOString(),
                    reason: mapped.reason,
                    reasonCode: mapped.reasonCode,
                });
            }
        }
        const dryRunResult = this.createDryRunResult(request, quotaFailureDetected);
        const attempt = {
            provider: dryRunResult.provider,
            model: dryRunResult.model,
            status: "dry_run",
            timestamp: new Date().toISOString(),
            reason: this.dryRun.message,
            reasonCode: dryRunResult.reasonCode,
            metadata: dryRunResult.metadata,
        };
        await this.recordAttempt(attempts, attempt);
        return {
            provider: dryRunResult.provider,
            model: dryRunResult.model,
            status: "dry_run",
            output: dryRunResult.output,
            tokens: dryRunResult.tokens,
            attempts,
            reasonCode: dryRunResult.reasonCode,
            metadata: dryRunResult.metadata,
        };
    }
    resolveApiKey(provider) {
        const value = process.env[provider.api_key_env];
        if (!value || !value.trim()) {
            return undefined;
        }
        return value.trim();
    }
    async recordAttempt(attempts, attempt) {
        attempts.push(attempt);
        if (this.logger) {
            await this.logger(attempt);
        }
    }
    mapError(error) {
        if (error && typeof error === "object") {
            const anyError = error;
            const message = anyError.message ?? "Unknown provider error";
            const normalisedCode = (anyError.code ?? anyError.status ?? anyError.statusCode);
            if (normalisedCode === "E/QUOTA_EXCEEDED" || normalisedCode === 429 || /quota/i.test(message)) {
                return { reason: message, reasonCode: "E/QUOTA_EXCEEDED" };
            }
            if (normalisedCode === "ENOTFOUND" ||
                normalisedCode === "ECONNRESET" ||
                normalisedCode === "ECONNREFUSED") {
                return { reason: message, reasonCode: "E/NETWORK" };
            }
            if (normalisedCode === "EAI_AGAIN") {
                return { reason: message, reasonCode: "E/DNS_RESOLUTION" };
            }
            if (typeof normalisedCode === "string" && normalisedCode.startsWith("E/")) {
                return { reason: message, reasonCode: normalisedCode };
            }
            return { reason: message, reasonCode: "E/LLM_PROVIDER_FAILURE" };
        }
        if (typeof error === "string") {
            return { reason: error, reasonCode: /quota/i.test(error) ? "E/QUOTA_EXCEEDED" : "E/LLM_PROVIDER_FAILURE" };
        }
        return { reason: "Unknown provider error", reasonCode: "E/LLM_PROVIDER_FAILURE" };
    }
    createDryRunResult(request, quotaFailureDetected) {
        const excerpt = extractPromptSnippet(request);
        const promptTokens = estimateTokens(excerpt);
        const completionTokens = 64;
        const reasonCode = quotaFailureDetected ? "E/QUOTA_EXCEEDED" : "E/NO_PROVIDER_AVAILABLE";
        const output = `${this.dryRun.message}\n\nPrompt excerpt: ${excerpt}`;
        const metadata = {
            dryRun: true,
            quotaFailure: quotaFailureDetected,
            message: this.dryRun.message,
        };
        return {
            provider: this.dryRun.provider,
            model: this.dryRun.model,
            status: "dry_run",
            output,
            tokens: {
                prompt: promptTokens,
                completion: completionTokens,
                total: promptTokens + completionTokens,
            },
            attempts: [],
            reasonCode,
            metadata,
        };
    }
}
function extractPromptSnippet(request) {
    if (request.messages && request.messages.length > 0) {
        const last = request.messages[request.messages.length - 1];
        return truncate(last.content);
    }
    if (request.prompt) {
        return truncate(request.prompt);
    }
    return "<empty prompt>";
}
function truncate(value, max = 160) {
    if (value.length <= max) {
        return value;
    }
    return `${value.slice(0, max - 3)}...`;
}
function estimateTokens(value) {
    if (!value) {
        return 0;
    }
    return Math.max(1, Math.ceil(value.length / 4));
}
function normaliseTokens(tokens) {
    const prompt = Math.max(0, Math.trunc(tokens?.prompt ?? 0));
    const completion = Math.max(0, Math.trunc(tokens?.completion ?? 0));
    const total = tokens?.total ?? prompt + completion;
    return { prompt, completion, total };
}
/* @endeditable */
