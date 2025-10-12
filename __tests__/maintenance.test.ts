import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';

async function withTempRoot(run: (root: string) => Promise<void>) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'vibeflow-maintenance-'));
  try {
    process.env.VIBEFLOW_ROOT = root;
    jest.resetModules();
    await run(root);
  } finally {
    delete process.env.VIBEFLOW_ROOT;
    await fs.rm(root, { recursive: true, force: true });
  }
}

describe('maintenance ingestion', () => {
  it('reads digests from inbox', async () => {
    await withTempRoot(async (root) => {
      const { readMaintenanceDigests, digestItemsToTasks } = await import('../src/maintenance');
      const envelope = {
        source: 'test',
        imported_at: new Date().toISOString(),
        payload: {
          items: [
            { title: 'A', priority: 'high', url: 'https://example.com/a' },
            { title: 'B', priority: 'low' }
          ]
        }
      };
      const inboxDir = path.join(root, 'data', 'maintenance', 'inbox');
      await fs.mkdir(inboxDir, { recursive: true });
      await fs.writeFile(path.join(inboxDir, 'sample.json'), JSON.stringify(envelope, null, 2));

      const digests = await readMaintenanceDigests();
      expect(digests).toHaveLength(1);
      const tasks = digestItemsToTasks(digests[0]);
      expect(tasks).toHaveLength(1);
      expect(tasks[0].title).toBe('A');
    });
  });

  it('collects tasks from multiple digests', async () => {
    await withTempRoot(async (root) => {
      const { collectMaintenanceTasks } = await import('../src/maintenance');
      const inboxDir = path.join(root, 'data', 'maintenance', 'inbox');
      await fs.mkdir(inboxDir, { recursive: true });
      for (let i = 0; i < 2; i++) {
        await fs.writeFile(
          path.join(inboxDir, `digest-${i}.json`),
          JSON.stringify(
            {
              source: `digest-${i}`,
              imported_at: new Date().toISOString(),
              payload: { items: [{ title: `Task ${i}`, priority: 'medium' }] }
            },
            null,
            2
          )
        );
      }
      const tasks = await collectMaintenanceTasks();
      expect(tasks).toHaveLength(2);
      expect(tasks.map((t) => t.title)).toContain('Task 0');
      expect(tasks.map((t) => t.title)).toContain('Task 1');
    });
  });
});
