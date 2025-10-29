/**
 * vibeflow-meta:
 * id: src/adapters/browserUseRunner.ts
 * task: REBUILD-V5
 * regions:
 *   - id: browser-use-runner
 *     hash: 00000000
 * locked: false
 * last_commit: null
 */

/* @editable:browser-use-runner */
import { VisualJob, runVisualJob } from "./visualAdapter.template";

export async function executeBrowserUse(job: VisualJob) {
  return runVisualJob(job);
}
/* @endeditable */
