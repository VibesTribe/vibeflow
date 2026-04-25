/**
 * vibeflow-meta:
 * id: src/core/router.ts
 * task: REBUILD-V5
 * regions:
 *   - id: router
 *     hash: 00000000
 * locked: false
 * last_commit: null
 */
const DEFAULT_WEIGHTS = {
    priority: 0.28,
    confidence: 0.26,
    successRate: 0.24,
    latency: 0.14,
    penalty: 0.08,
};
const DEFAULT_LATENCY_TARGET = 12;
const CONFIDENCE_CAP = 0.99;
export class Router {
    constructor(metrics, options = {}) {
        this.metrics = metrics;
        this.options = options;
    }
    decide(skillId) {
        if (this.metrics.length === 0) {
            throw new Error("Router metrics unavailable");
        }
        const weights = this.resolveWeights();
        const latencyTarget = this.options.latencyTarget ?? DEFAULT_LATENCY_TARGET;
        const ranked = [...this.metrics]
            .map((metric) => ({
            metric,
            score: this.computeScore(metric, weights, latencyTarget),
        }))
            .sort((a, b) => {
            if (b.score !== a.score) {
                return b.score - a.score;
            }
            return a.metric.latency - b.metric.latency;
        });
        const choice = ranked[0]?.metric;
        if (!choice) {
            throw new Error("Router failed to select provider");
        }
        return {
            skillId,
            provider: this.formatProvider(choice),
            confidence: this.resolveConfidence(choice, latencyTarget),
        };
    }
    resolveWeights() {
        if (!this.options.weights) {
            return DEFAULT_WEIGHTS;
        }
        const merged = {
            ...DEFAULT_WEIGHTS,
            ...this.options.weights,
        };
        const total = merged.priority +
            merged.confidence +
            merged.successRate +
            merged.latency +
            merged.penalty;
        if (total === 0) {
            return DEFAULT_WEIGHTS;
        }
        return merged;
    }
    computeScore(metric, weights, latencyTarget) {
        const latencyFactor = metric.latency / Math.max(1, latencyTarget);
        const penalty = metric.tokenPenalty ?? 0;
        return (weights.priority * metric.priority +
            weights.confidence * metric.confidence +
            weights.successRate * metric.successRate -
            weights.latency * latencyFactor -
            weights.penalty * penalty);
    }
    resolveConfidence(metric, latencyTarget) {
        const base = (metric.confidence + metric.successRate) / 2;
        const latencyImpact = Math.min(0.35, (metric.latency / Math.max(1, latencyTarget)) * 0.2);
        const penaltyImpact = (metric.tokenPenalty ?? 0) * 0.1;
        const raw = base - latencyImpact - penaltyImpact;
        const floor = this.options.minConfidence ?? 0.3;
        const bounded = Math.min(CONFIDENCE_CAP, Math.max(floor, raw));
        return Number(bounded.toFixed(4));
    }
    formatProvider(metric) {
        if (!metric.model) {
            return metric.provider;
        }
        return `${metric.provider}:${metric.model}`;
    }
}
/* @endeditable */
