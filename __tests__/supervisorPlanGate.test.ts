import { promises as fs } from "fs";
import os from "os";
import path from "path";

describe('supervisor plan gate', () => {
  async function writeJson(root: string, relPath: string, data: unknown) {
    const fullPath = path.join(root, relPath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
  }

  async function setupIdea(root: string, deliverable: string) {
    const ideaDir = 'data/ideas/example-app';
    await writeJson(root, path.join(ideaDir, 'research.brief.json'), {
      idea_id: 'example-app',
      summary: 'Demo idea',
      recommended_stack: [{ layer: 'backend', technologies: ['Node.js'] }],
      core_features: ['Feature A', 'Feature B'],
      gap_features: ['Feature C'],
      created_at: '2025-10-01T00:00:00Z'
    });
    await writeJson(root, path.join(ideaDir, 'analyst.review.json'), {
      idea_id: 'example-app',
      verdict: 'approve',
      approved_features: { core: ['Feature A', 'Feature B'], gap: ['Feature C'] },
      reviewed_at: '2025-10-02T00:00:00Z'
    });
    await writeJson(root, path.join(ideaDir, 'prd.summary.json'), {
      idea_id: 'example-app',
      version: 'v0.1',
      approved: true,
      tech_stack: [],
      features: { core: ['Feature A', 'Feature B'], gap: ['Feature C'], future: [] },
      acceptance: [],
      created_at: '2025-10-01T00:00:00Z',
      approved_at: '2025-10-02T00:00:00Z',
      architecture: {
        services: ['planner'],
        data_flows: ['planner -> supervisor'],
        observability: 'demo'
      },
      vibeflow_constraints: {
        registry: [],
        routing: [],
        testing: [],
        security: [],
        status_flow: []
      },
      artifacts: {
        required: [],
        supporting: [],
        validation_scripts: []
      },
      registries: {
        models: 'data/registry/models.json',
        tools: 'data/registry/tools.json',
        routing: 'data/policies/routing.json',
        policies: []
      },
      model_policies: {
        default_model: 'openai:gpt-4.1-mini',
        visual_platform: 'browser-use:devtools-mcp',
        required_policy_flags: ['PII_FREE'],
        min_confidence: 0.95,
        temperature: 0,
        top_p: 0.1,
        require_chat_url_when: ''
      },
      philosophy: []
    });
    await writeJson(root, path.join(ideaDir, 'status.json'), {
      idea_id: 'example-app',
      stage: 'plan_generated',
      history: [{ stage: 'plan_generated', timestamp: '2025-10-03T00:00:00Z' }]
    });

    await writeJson(root, 'data/registry/models.json', {
      models: [
        {
          id: 'openai:gpt-4.1-mini',
          vendor: 'openai',
          display_name: 'OpenAI GPT-4.1 Mini',
          task_types: ['code'],
          supports_tools: true,
          supports_vision: false,
          max_context_tokens: 8000,
          cost_per_1k_prompt: 0,
          cost_per_1k_completion: 0,
          tags: [],
          policy_flags: ['PII_FREE'],
          recommended_for: []
        }
      ]
    });

    await writeJson(root, 'data/taskpackets/example-app/S0/plan.json', {
      slices: [
        {
          slice_id: 'S0',
          name: 'Demo Slice',
          goal: 'Demo goal',
          tasks: [
            {
              task_id: 'S0.1',
              confidence: 0.97,
              title: 'Demo Task'
            }
          ]
        }
      ]
    });

    await writeJson(root, 'data/taskpackets/example-app/S0/S0.1.json', {
      title: 'Demo Task',
      confidence: 0.97,
      deliverables: [deliverable],
      execution: {
        platform: 'vscode-codex',
        model: 'openai:gpt-4.1-mini',
        require_chat_url: false
      }
    });
  }

  async function withTempRoot(run: (root: string) => Promise<void>) {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'vibeflow-supervisor-'));
    try {
      await run(root);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  }

  it('approves planner output that matches the PRD and registry', async () => {
    await withTempRoot(async (root) => {
      await setupIdea(root, 'scripts/demo-task.ts');
      process.env.VIBEFLOW_ROOT = root;
      jest.resetModules();
      const { validatePlannerOutput } = await import('../src/supervisor/planGate');
      const report = await validatePlannerOutput('example-app');
      expect(report.status).toBe('approved');
      const statusRaw = await fs.readFile(path.join(root, 'data/ideas/example-app/status.json'), 'utf8');
      const status = JSON.parse(statusRaw);
      expect(status.stage).toBe('supervisor_ready');
      delete process.env.VIBEFLOW_ROOT;
    });
  });

  it('rejects deliverables that attempt to escape the repository', async () => {
    await withTempRoot(async (root) => {
      await setupIdea(root, '../outside.txt');
      process.env.VIBEFLOW_ROOT = root;
      jest.resetModules();
      const { validatePlannerOutput } = await import('../src/supervisor/planGate');
      await expect(validatePlannerOutput('example-app')).rejects.toThrow(/rejected plan/);
      const reportRaw = await fs.readFile(path.join(root, 'docs/reports/supervisor/example-app.json'), 'utf8');
      const report = JSON.parse(reportRaw);
      const deliverableCheck = report.checks.find((check: any) => check.name.startsWith('deliverables:'));
      expect(deliverableCheck?.status).toBe('fail');
      const statusRaw = await fs.readFile(path.join(root, 'data/ideas/example-app/status.json'), 'utf8');
      const status = JSON.parse(statusRaw);
      expect(status.stage).toBe('plan_generated');
      delete process.env.VIBEFLOW_ROOT;
    });
  });
});
