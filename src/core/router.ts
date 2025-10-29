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

/* @editable:router */
import { RouterDecision } from "./types";

interface PlatformMetric {
  provider: string;
  successRate: number;
  latency: number;
}

export class Router {
  constructor(private readonly metrics: PlatformMetric[]) {}

  decide(skillId: string): RouterDecision {
    if (this.metrics.length === 0) {
      throw new Error("Router metrics unavailable");
    }
    const sorted = [...this.metrics].sort((a, b) => b.successRate - a.successRate);
    const choice = sorted[0];
    const confidence = Math.max(0.2, choice.successRate - choice.latency / 100);
    return {
      skillId,
      provider: choice.provider,
      confidence,
    };
  }
}
/* @endeditable */
