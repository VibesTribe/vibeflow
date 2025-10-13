import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';

describe('memory store', () => {
  async function withMemory(run: (tmp: string, mod: typeof import('../src/memory/memoryStore')) => Promise<void>) {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'vibeflow-memory-'));
    process.env.VIBEFLOW_ROOT = tmp;
    jest.resetModules();
    const mod = await import('../src/memory/memoryStore');
    try {
      await run(tmp, mod);
    } finally {
      delete process.env.VIBEFLOW_ROOT;
    }
  }

  it('appends memory entries', async () => {
    await withMemory(async (tmp, mod) => {
      await mod.appendMemory({ kind: 'plan', taskId: 'S1.1', summary: 'Initial slice plan' });
      const entries = await mod.listMemory();
      expect(entries).toHaveLength(1);
      expect(entries[0]).toMatchObject({ kind: 'plan', taskId: 'S1.1', summary: 'Initial slice plan' });
      const logPath = path.join(tmp, 'data', 'state', 'memory.log.json');
      await expect(fs.stat(logPath)).resolves.toBeDefined();
    });
  });
});
