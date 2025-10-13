import { promises as fs } from "fs";
import os from "os";
import path from "path";

describe('orchestrator runtime', () => {
  async function writeJson(root: string, relPath: string, data: unknown) {
    const target = path.join(root, relPath);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, JSON.stringify(data, null, 2) + '\n', 'utf8');
  }

  async function withTempRoot<T>(run: (tmp: string, mod: typeof import('../src/orchestrator/runtime.ts')) => Promise<T>) {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'vibeflow-orchestrator-'));
    process.env.VIBEFLOW_ROOT = tmp;
    jest.resetModules();
    const mod = await import('../src/orchestrator/runtime.ts');
    try {
      return await run(tmp, mod);
    } finally {
      delete process.env.VIBEFLOW_ROOT;
      await fs.rm(tmp, { recursive: true, force: true });
    }
  }

  async function seedIdea(root: string, stage: string, supervisorStatus: string = 'approved') {
    await writeJson(root, 'data/ideas/alpha/status.json', {
      idea_id: 'alpha',
      stage,
      history: [{ stage, timestamp: '2025-10-10T10:00:00Z' }]
    });

    await writeJson(root, 'docs/reports/supervisor/alpha.json', {
      idea_id: 'alpha',
      status: supervisorStatus,
      validated_at: '2025-10-10T10:05:00Z',
      slices: [],
      checks: []
    });

    await writeJson(root, 'data/taskpackets/alpha/S1/plan.json', {
      slices: [{ slice_id: 'S1', tasks: [] }]
    });
    await writeJson(root, 'data/taskpackets/alpha/S1/S1.1.json', {
      task_id: 'S1.1'
    });
  }

  it('requires supervisor_ready stage before loading context', async () => {
    await withTempRoot(async (root, mod) => {
      await seedIdea(root, 'plan_generated');
      try {
        await mod.loadOrchestratorContext('alpha');
        throw new Error('Expected supervisor_ready gate to fail');
      } catch (error: any) {
        expect(error.message).toMatch(/supervisor_ready/);
      }
    });
  });

  it('throws when supervisor report is missing approval', async () => {
    await withTempRoot(async (root, mod) => {
      await seedIdea(root, 'supervisor_ready', 'rejected');
      await expect(mod.loadOrchestratorContext('alpha')).rejects.toThrow(/Supervisor report/);
    });
  });

  it('returns context when supervisor gate passes', async () => {
    await withTempRoot(async (root, mod) => {
      await seedIdea(root, 'supervisor_ready');
      const context = await mod.loadOrchestratorContext('alpha');
      expect(context.ideaId).toBe('alpha');
      expect(context.slices).toHaveLength(1);
      expect(context.slices[0].taskPackets).toHaveLength(1);
    });
  });
});
