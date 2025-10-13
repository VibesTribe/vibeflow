import { createHash } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import type { GeneratedPlanArtifacts, PlannerConfig, PlannerTaskConfig, TaskPacket } from './types';
import { getModelDefinition } from '../config/registry';
import { directories } from '../config/paths';
import { assertIdeaReadyForPlanning, markIdeaStage } from '../ideas/status';

const MIN_CONFIDENCE = 0.95;

function ensureConfidence(value?: number): number {
  const confidence = value ?? 0.97;
  if (confidence < MIN_CONFIDENCE) {
    throw new Error(`Planner task confidence ${confidence} is below ${MIN_CONFIDENCE}. Refine the decomposition.`);
  }
  return Number(confidence.toFixed(3));
}

function computeSnapshotId(config: PlannerConfig): string {
  const payload = JSON.stringify({ slice: config.slice, timestamp: new Date().toISOString() });
  return createHash('sha256').update(payload).digest('hex');
}

function normalizeDependencies(task: PlannerTaskConfig): { depends_on: string[]; artifacts: string[]; notes: string[] } {
  const deps = task.dependsOn ?? [];
  const depends_on = deps
    .filter((item) => item.startsWith('task:'))
    .map((item) => item.replace(/^task:/, '').trim())
    .filter(Boolean);
  const artifacts = deps
    .filter((item) => item.startsWith('artifact:'))
    .map((item) => item.replace(/^artifact:/, '').trim())
    .filter(Boolean);
  const notes = deps
    .filter((item) => item.startsWith('note:'))
    .map((item) => item.replace(/^note:/, '').trim())
    .filter(Boolean);
  return { depends_on, artifacts, notes };
}

function buildTaskPacket(config: PlannerConfig, task: PlannerTaskConfig, confidence: number): TaskPacket {
  const contextNotes: string[] = [];
  if (task.notes) {
    contextNotes.push(task.notes);
  }
  const { depends_on, artifacts, notes } = normalizeDependencies(task);
  if (notes.length) {
    contextNotes.push(...notes);
  }
  const handoffExpectations: string[] = [];
  if (task.execution.require_chat_url) {
    handoffExpectations.push('Include execution.chat_url in the completion so supervisors can audit hosted platform runs.');
  }

  return {
    task_id: task.taskId,
    title: task.title,
    purpose: task.purpose,
    confidence,
    context: {
      goal: config.slice.goal,
      snapshot_path: config.contextSnapshotPath,
      notes: contextNotes.length ? contextNotes : undefined
    },
    dependencies: [...depends_on.map((id) => `task:${id}`), ...artifacts.map((p) => `artifact:${p}`)],
    deliverables: task.deliverables,
    output_format: {
      language: task.output.language,
      version: task.output.version,
      format: task.output.format,
      files: task.output.files
    },
    instructions: task.instructions,
    acceptance_criteria: task.acceptanceCriteria,
    review_policy: task.reviewPolicy,
    validation: task.validation,
    execution: {
      platform: task.execution.platform,
      model: task.execution.model,
      budget_usd: task.execution.budget_usd,
      max_tokens: task.execution.max_tokens,
      latency_slo_ms: task.execution.latency_slo_ms,
      require_chat_url: task.execution.require_chat_url
    },
    handoff_expectations: handoffExpectations.length ? handoffExpectations : undefined
  };
}

function buildContract(config: PlannerConfig, task: PlannerTaskConfig, confidence: number) {
  const { depends_on, artifacts } = normalizeDependencies(task);
  return {
    task_id: task.taskId,
    title: task.title,
    context_snapshot_id: 'pending',
    parent_task_id: null,
    task_type: task.taskType,
    domain_tag: task.domainTag,
    stage: 'planned',
    review_policy: task.reviewPolicy,
    constraints: {
      budget_usd: task.execution.budget_usd,
      max_tokens: task.execution.max_tokens ?? 8000,
      latency_slo_ms: task.execution.latency_slo_ms ?? 60000,
      model_behavior_required: {
        topic_affinity: task.modelBehavior?.topic_affinity ?? task.purpose,
        policy_flags: task.modelBehavior?.policy_flags ?? ['PII_FREE'],
        max_token_context: task.modelBehavior?.max_token_context ?? 32000
      }
    },
    inputs: {
      artifacts,
      env: [],
      dependencies: depends_on
    },
    acceptance_criteria: task.acceptanceCriteria,
    output_schema: {
      files: task.deliverables.map((filePath) => ({ path: filePath, type: 'text' })),
      format: task.output.format ?? 'text'
    },
    model_preferences: {
      temperature: 0,
      top_p: 0.1
    },
    validation_checkpoints: task.validation,
    metadata: {
      confidence,
      deliverable_language: task.output.language,
      deliverable_version: task.output.version,
      requires_chat_url: task.execution.require_chat_url ?? false
    }
  };
}

export function buildPlanArtifacts(config: PlannerConfig): GeneratedPlanArtifacts {
  const contextSnapshotId = computeSnapshotId(config);
  const slice = config.slice;

  const taskPackets: Record<string, TaskPacket> = {};
  const planTasks = slice.tasks.map((task) => {
    const confidence = ensureConfidence(task.confidence);
    const packet = buildTaskPacket(config, task, confidence);
    taskPackets[task.taskId] = packet;
    const contract = buildContract(config, task, confidence);
    contract.context_snapshot_id = contextSnapshotId;
    const { depends_on } = normalizeDependencies(task);
    return {
      task_id: task.taskId,
      task_type: task.taskType,
      domain_tag: task.domainTag,
      contract,
      confidence,
      depends_on,
      notes: task.notes ?? ''
    };
  });

  const plan = {
    context_snapshot_id: contextSnapshotId,
    echo_check: slice.echo_check ?? config.echoCheck ?? '',
    open_questions: config.openQuestions ?? [],
    slices: [
      {
        slice_id: slice.id,
        name: slice.name,
        goal: slice.goal,
        tasks: planTasks
      }
    ]
  };

  return { plan, taskPackets };
}

export async function writePlanArtifacts(config: PlannerConfig, outputRoot: string): Promise<GeneratedPlanArtifacts> {
  if (config.ideaId) {
    await assertIdeaReadyForPlanning(config.ideaId);
  }

  const artifacts = buildPlanArtifacts(config);
  await Promise.all(
    Object.values(artifacts.taskPackets).map(async (packet) => {
      const modelId = packet.execution?.model;
      if (modelId) {
        const model = await getModelDefinition(modelId);
        if (!model) {
          throw new Error(`Unknown execution model: ${modelId}`);
        }
      }
    })
  );

  const planRoot = config.ideaId ? path.join(outputRoot, config.ideaId) : outputRoot;
  const sliceDir = path.join(planRoot, config.slice.id);
  await fs.mkdir(sliceDir, { recursive: true });
  const planPath = path.join(sliceDir, 'plan.json');
  await fs.writeFile(planPath, JSON.stringify(artifacts.plan, null, 2) + '\n', 'utf8');
  await Promise.all(
    Object.entries(artifacts.taskPackets).map(([taskId, packet]) => {
      const taskPath = path.join(sliceDir, `${taskId}.json`);
      return fs.writeFile(taskPath, JSON.stringify(packet, null, 2) + '\n', 'utf8');
    })
  );

  if (config.ideaId) {
    const reportsDir = path.join(directories.root, 'docs/reports/ideas', config.ideaId);
    await fs.mkdir(reportsDir, { recursive: true });
    const lines: string[] = [];
    const sliceSummary = artifacts.plan.slices[0];
    lines.push('# Plan Summary');
    lines.push(`Slice: ${sliceSummary?.name ?? config.slice.name} (${config.slice.id})`);
    lines.push(`Goal: ${sliceSummary?.goal ?? config.slice.goal}`);
    lines.push('');
    lines.push('## Tasks');
    sliceSummary?.tasks.forEach((task: any) => {
      const packet = artifacts.taskPackets[task.task_id];
      const title = packet.title ?? task.contract?.title ?? 'Untitled';
      lines.push(`- **${task.task_id} - ${title}**`);
      lines.push(`  - Purpose: ${packet.purpose}`);
      lines.push(`  - Deliverables: ${packet.deliverables.join(', ') || 'n/a'}`);
      lines.push(
        `  - Platform: ${packet.execution.platform} (${packet.execution.model ?? 'model:unknown'})`
      );
      lines.push(`  - Confidence: ${packet.confidence.toFixed(3)}`);
      if (packet.handoff_expectations?.length) {
        lines.push(`  - Handoff: ${packet.handoff_expectations.join('; ')}`);
      }
      lines.push('');
    });
    await fs.writeFile(path.join(reportsDir, 'plan.md'), lines.join('\n'), 'utf8');
    await markIdeaStage(config.ideaId, 'plan_generated');
  }

  return artifacts;
}

export async function readPlannerConfig(configPath: string): Promise<PlannerConfig> {
  const raw = await fs.readFile(configPath, 'utf8');
  const data = JSON.parse(raw);
  return data as PlannerConfig;
}
