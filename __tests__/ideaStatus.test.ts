import { loadIdeaStatus, ensureStageAtLeast, assertIdeaReadyForPlanning } from '../src/ideas/status';

describe('idea status pipeline', () => {
  const ideaId = 'example-app';

  it('loads status and enforces stage ordering', async () => {
    const status = await loadIdeaStatus(ideaId);
    expect(status.stage).toBe('supervisor_ready');
    expect(() => ensureStageAtLeast(status, 'research_completed')).not.toThrow();
    expect(() => ensureStageAtLeast(status, 'plan_generated')).not.toThrow();
    expect(() => ensureStageAtLeast(status, 'orchestration_started')).toThrow();
  });

  it('asserts readiness for planning', async () => {
    await expect(assertIdeaReadyForPlanning(ideaId)).resolves.not.toThrow();
  });
});
