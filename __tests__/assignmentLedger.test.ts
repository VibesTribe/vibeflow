import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';

describe('assignment ledger', () => {
  async function withTempRoot(run: (tmp: string, mod: typeof import('../src/orchestrator/assignmentLedger.ts')) => Promise<void>) {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'vibeflow-assignment-'));
    process.env.VIBEFLOW_ROOT = tmp;
    jest.resetModules();
    const mod = await import('../src/orchestrator/assignmentLedger.ts');
    try {
      await run(tmp, mod);
    } finally {
      delete process.env.VIBEFLOW_ROOT;
    }
  }

  it('appends assignment records to JSON log', async () => {
    await withTempRoot(async (tmp, mod) => {
      await mod.recordAssignment({
        taskId: 'S2.1',
        sliceId: 'S2',
        attempt: 1,
        status: 'assigned',
        platform: 'opencode',
        model: 'glm-4-6-free'
      });

      const logPath = path.join(tmp, 'data', 'state', 'assignment.log.json');
      const raw = await fs.readFile(logPath, 'utf8');
      const entries = JSON.parse(raw);

      expect(entries).toHaveLength(1);
      expect(entries[0]).toMatchObject({
        taskId: 'S2.1',
        sliceId: 'S2',
        attempt: 1,
        status: 'assigned',
        platform: 'opencode',
        model: 'glm-4-6-free'
      });
      expect(entries[0].timestamp).toBeDefined();
    });
  });
});
