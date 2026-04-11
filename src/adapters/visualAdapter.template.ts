/**
 * vibeflow-meta:
 * id: src/adapters/visualAdapter.template.ts
 * task: REBUILD-V5
 * regions:
 *   - id: visual-adapter
 *     hash: 00000000
 * locked: false
 * last_commit: null
 */

/* @editable:visual-adapter */
export interface VisualJob {
  scenario: string;
  instructions: string;
}

export interface VisualResult {
  scenario: string;
  screenshotPath: string;
  htmlPath: string;
}

export async function runVisualJob(job: VisualJob): Promise<VisualResult> {
  return {
    scenario: job.scenario,
    screenshotPath: `artifacts/${job.scenario}.png`,
    htmlPath: `artifacts/${job.scenario}.html`,
  };
}
/* @endeditable */
