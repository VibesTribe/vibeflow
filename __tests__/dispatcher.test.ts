import { promises as fs } from "fs";
import os from "os";
import path from "path";

async function writeJson(root: string, relPath: string, data: unknown) {
  const target = path.join(root, relPath);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

describe('orchestrator dispatcher', () => {
  async function withTempRoot<T>(run: (tmp: string) => Promise<T>) {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'vibeflow-dispatcher-'));
    try {
      return await run(tmp);
    } finally {
      await fs.rm(tmp, { recursive: true, force: true });
    }
  }

  async function seedRegistry(root: string) {
    await writeJson(root, 'data/registry/models.json', {
      models: [
        {
          id: 'codex:cli',
          vendor: 'vibeflow',
          display_name: 'Codex CLI Assistant',
          task_types: ['code'],
          supports_tools: false,
          supports_vision: false,
          max_context_tokens: 100000,
          cost_per_1k_prompt: 0,
          cost_per_1k_completion: 0,
          tags: ['cli_agent'],
          policy_flags: ['PII_FREE'],
          recommended_for: ['task_agents']
        },
        {
          id: 'openrouter:deepseek-r1',
          vendor: 'openrouter',
          display_name: 'DeepSeek R1 (Free)',
          task_types: ['code'],
          supports_tools: true,
          supports_vision: false,
          max_context_tokens: 32000,
          cost_per_1k_prompt: 0,
          cost_per_1k_completion: 0,
          tags: ['web_studio', 'free'],
          policy_flags: ['PII_FREE'],
          recommended_for: ['task_agents']
        }
      ]
    });
  }

  async function seedIdea(root: string) {
    await writeJson(root, 'data/ideas/alpha/status.json', {
      idea_id: 'alpha',
      stage: 'supervisor_ready',
      history: [{ stage: 'supervisor_ready', timestamp: '2025-10-10T10:05:00Z' }]
    });

    await writeJson(root, 'docs/reports/supervisor/alpha.json', {
      idea_id: 'alpha',
      status: 'approved',
      validated_at: '2025-10-10T10:05:00Z',
      slices: [],
      checks: []
    });

    await writeJson(root, 'data/taskpackets/alpha/S1/plan.json', {
      slices: [{ slice_id: 'S1', tasks: [] }]
    });

    await writeJson(root, 'data/taskpackets/alpha/S1/S1.1.json', {
      task_id: 'S1.1',
      title: 'CLI Task',
      deliverables: ['README.md'],
      context: { goal: 'Demo', notes: [] },
      instructions: ['Do CLI thing'],
      acceptance_criteria: ['works'],
      validation: [],
      review_policy: 'auto',
      purpose: 'Run CLI operations',
      confidence: 0.97,
      output_format: { language: 'Markdown', files: ['README.md'] },
      execution: {
        platform: 'codex:cli',
        model: 'codex:cli',
        budget_usd: 0
      }
    });

    await writeJson(root, 'data/taskpackets/alpha/S1/S1.2.json', {
      task_id: 'S1.2',
      title: 'Web Studio Task',
      deliverables: ['docs/report.md'],
      context: { goal: 'Use studio', notes: [] },
      instructions: ['Use studio interface'],
      acceptance_criteria: ['report generated'],
      validation: [],
      review_policy: 'auto',
      purpose: 'Run via OpenRouter',
      confidence: 0.95,
      output_format: { language: 'Markdown', files: ['docs/report.md'] },
      execution: {
        platform: 'openrouter:deepseek-r1',
        model: 'openrouter:deepseek-r1',
        budget_usd: 0,
        require_chat_url: true
      },
      handoff_expectations: ['Return chat URL']
    });
  }

  async function withQueuedAssignments<T>(seed: boolean, run: (queueAssignmentsForIdea: typeof import("../src/orchestrator/dispatcher").queueAssignmentsForIdea, root: string) => Promise<T>) {
    return withTempRoot(async (root) => {
      process.env.VIBEFLOW_ROOT = root;
      jest.resetModules();
      if (seed) {
        await seedRegistry(root);
        await seedIdea(root);
      }
      const { queueAssignmentsForIdea } = await import('../src/orchestrator/dispatcher');
      try {
        return await run(queueAssignmentsForIdea, root);
      } finally {
        delete process.env.VIBEFLOW_ROOT;
      }
    });
  }

  it('builds assignments without writing when dry run is enabled', async () => {
    await withQueuedAssignments(true, async (queueAssignmentsForIdea, root) => {
      const assignments = await queueAssignmentsForIdea('alpha', { dryRun: true });
      expect(assignments).toHaveLength(2);
      expect(assignments.find((assignment) => assignment.channel === 'cli')).toBeDefined();
      expect(assignments.find((assignment) => assignment.channel === 'web_studio')).toBeDefined();

      const queueDir = path.join(root, 'data/tasks/queued/alpha');
      await expect(fs.stat(queueDir)).rejects.toThrow();
    });
  });

  it('writes queue files and assignment log when not dry run', async () => {
    await withQueuedAssignments(true, async (queueAssignmentsForIdea, root) => {
      const assignments = await queueAssignmentsForIdea('alpha');
      expect(assignments).toHaveLength(2);

      const queueDir = path.join(root, 'data/tasks/queued/alpha');
      const files = await fs.readdir(queueDir);
      expect(files.sort()).toEqual(['S1.1.json', 'S1.2.json']);

      const logPath = path.join(root, 'data/state/assignment.log.json');
      const logRaw = await fs.readFile(logPath, 'utf8');
      const logEntries = JSON.parse(logRaw);
      expect(logEntries).toHaveLength(2);
      expect(logEntries[0]).toHaveProperty('status', 'assigned');
    });
  });
  it('falls back when primary platform is rate limited', async () => {
    await withQueuedAssignments(true, async (queueAssignmentsForIdea, root) => {
      await writeJson(
        root,
        'data/policies/rate_limits.json',
        {
          platforms: [
            {
              id: 'codex:cli',
              mode: 'enforce',
              window_hours: 24,
              max_assignments: 1
            }
          ]
        }
      );

      const timestamp = new Date().toISOString();
      await writeJson(root, 'data/state/assignment.log.json', [
        {
          taskId: 'previous',
          attempt: 1,
          status: 'assigned',
          platform: 'codex:cli',
          timestamp
        }
      ]);

      const assignments = await queueAssignmentsForIdea('alpha');
      expect(assignments).toHaveLength(2);
      expect(assignments[0].platform).toBe('openrouter:deepseek-r1');
    });
  });

});
