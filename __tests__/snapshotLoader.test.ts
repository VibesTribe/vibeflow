import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';

describe('snapshot loader', () => {
  async function withSnapshot(run: (tmp: string, mod: typeof import('../src/memory/snapshotLoader')) => Promise<void>) {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'vibeflow-snapshot-'));
    const snapshotPath = path.join(tmp, 'docs', 'reports');
    await fs.mkdir(snapshotPath, { recursive: true });
    const payload = {
      files: [
        { path: 'src/example.ts', size: 5, modified: new Date().toISOString(), sha256: 'hash' }
      ]
    };
    await fs.writeFile(path.join(snapshotPath, 'repo-snapshot.json'), JSON.stringify(payload));

    process.env.VIBEFLOW_ROOT = tmp;
    jest.resetModules();
    const mod = await import('../src/memory/snapshotLoader');
    try {
      await run(tmp, mod);
    } finally {
      delete process.env.VIBEFLOW_ROOT;
    }
  }

  it('verifies paths against snapshot', async () => {
    await withSnapshot(async (_tmp, mod) => {
      const files = await mod.loadSnapshot();
      expect(files).toHaveLength(1);
      const { missing } = await mod.assertPathsExist(['src/example.ts', 'docs/missing.md'], files);
      expect(missing).toEqual(['docs/missing.md']);
    });
  });
});
