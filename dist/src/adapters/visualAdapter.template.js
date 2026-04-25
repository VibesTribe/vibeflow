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
export async function runVisualJob(job) {
    return {
        scenario: job.scenario,
        screenshotPath: `artifacts/${job.scenario}.png`,
        htmlPath: `artifacts/${job.scenario}.html`,
    };
}
/* @endeditable */
