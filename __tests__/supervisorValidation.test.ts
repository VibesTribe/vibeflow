import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';

describe('supervisor validation log', () => {
  async function withTempRoot(run: (tmp: string, mod: typeof import('../src/supervisor/validationLog.ts')) => Promise<void>) {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'vibeflow-supervisor-'));
    process.env.VIBEFLOW_ROOT = tmp;
    jest.resetModules();
    const mod = await import('../src/supervisor/validationLog.ts');
    try {
      await run(tmp, mod);
    } finally {
      delete process.env.VIBEFLOW_ROOT;
    }
  }

  it('captures validation outcomes with checkpoints', async () => {
    await withTempRoot(async (tmp, mod) => {
      await mod.recordValidationOutcome({
        taskId: 'S2.1',
        sliceId: 'S2',
        status: 'fail',
        reviewer: 'supervisor',
        rerouteTo: 'roo-vscode',
        checkpoints: [
          { name: 'schema', status: 'pass' },
          { name: 'unit-tests', status: 'fail', details: 'jest output snippet' }
        ],
        notes: 'Request reroute to Roo VSCode agent.'
      });

      const logPath = path.join(tmp, 'data', 'state', 'supervisor.log.json');
      const raw = await fs.readFile(logPath, 'utf8');
      const entries = JSON.parse(raw);

      expect(entries).toHaveLength(1);
      expect(entries[0]).toMatchObject({
        taskId: 'S2.1',
        status: 'fail',
        rerouteTo: 'roo-vscode'
      });
      expect(entries[0].timestamp).toBeDefined();
      expect(entries[0].checkpoints).toHaveLength(2);
    });
  });
});
