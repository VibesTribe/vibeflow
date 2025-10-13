#!/usr/bin/env node
import fs from "fs/promises";
import path from "path";
import process from "process";
import { fileURLToPath } from "url";

const ideaId = process.argv[2];
if (!ideaId) {
  console.error('Usage: node scripts/ideas/build-prd.mjs <ideaId>');
  process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const vibeflowRoot = process.env.VIBEFLOW_ROOT ?? path.resolve(__dirname, '..', '..');

function resolveInRoot(...segments) {
  return path.join(vibeflowRoot, ...segments);
}

async function loadJson(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  const sanitized = raw.replace(/^\uFEFF/, "");
  return JSON.parse(sanitized);
}

function bumpVersion(previousVersion) {
  const match = /^v(\d+)\.(\d+)$/.exec(previousVersion ?? '');
  if (!match) {
    return 'v0.1';
  }
  const major = Number(match[1]);
  const minor = Number(match[2]) + 1;
  return `v${major}.${minor}`;
}

function templateValue(value, replacements) {
  if (typeof value === 'string') {
    return value.replace(/{{(.*?)}}/g, (_, key) => replacements[key] ?? `{{${key}}}`);
  }
  if (Array.isArray(value)) {
    return value.map((item) => templateValue(item, replacements));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, templateValue(v, replacements)]));
  }
  return value;
}

const ideaDir = resolveInRoot('data', 'ideas', ideaId);
const researchPath = path.join(ideaDir, 'research.brief.json');
const analystPath = path.join(ideaDir, 'analyst.review.json');
const prdPath = path.join(ideaDir, 'prd.summary.json');

const [research, analyst, canonical] = await Promise.all([
  loadJson(researchPath),
  loadJson(analystPath),
  loadJson(resolveInRoot('docs', 'prd', 'canonical.constraints.json'))
]);

let version = 'v0.1';
try {
  const existing = await loadJson(prdPath);
  version = bumpVersion(existing.version ?? 'v0.1');
} catch (error) {
  if (error.code !== 'ENOENT') {
    throw error;
  }
}

const replacements = { idea_id: ideaId };
const canonicalWithIdea = templateValue(canonical, replacements);

const approvedCore = analyst.approved_features?.core ?? research.core_features ?? [];
const approvedGap = analyst.approved_features?.gap ?? [];
const futureFeatureSet = new Set(research.gap_features ?? []);
approvedGap.forEach((feature) => futureFeatureSet.delete(feature));
const futureFeatures = Array.from(futureFeatureSet);

const techStack = (research.recommended_stack ?? []).map((entry) => ({
  layer: entry.layer,
  choice: entry.technologies?.[0] ?? 'TBD',
  alternatives: (entry.technologies ?? []).slice(1),
  rationale: `Per research recommended stack for ${entry.layer}`
}));

const modelPolicies = canonicalWithIdea.model_policies;

const acceptance = [
  `Planner slices stay within approved features: ${approvedCore.join(', ')} + ${approvedGap.join(', ')}`,
  `Confidence >= ${modelPolicies.min_confidence} on every task before supervisor approval`,
  `Supervisor gate validates plan.json against ${canonicalWithIdea.registries.models}, ${canonicalWithIdea.registries.tools}, and ${canonicalWithIdea.registries.routing}`
];

const statusFlow = [
  'idea_submitted',
  'research_completed',
  'analyst_approved',
  'prd_approved',
  'plan_generated',
  'supervisor_ready',
  'orchestration_started'
];

const prdSummary = {
  idea_id: ideaId,
  version,
  approved: analyst.verdict === 'approve',
  summary: research.summary ?? analyst.rationale,
  tech_stack: techStack,
  features: {
    core: approvedCore,
    gap: approvedGap,
    future: futureFeatures
  },
  acceptance,
  created_at: research.created_at ?? new Date().toISOString(),
  approved_at: analyst.reviewed_at ?? new Date().toISOString(),
  architecture: {
    services: ['orchestrator', 'planner', 'supervisor', 'maintenance', 'dashboard'],
    data_flows: [
      'research -> analyst -> prd',
      'planner -> supervisor -> orchestrator -> agents',
      'agents -> telemetry -> dashboard'
    ],
    observability: 'All agents emit run metrics to docs/state + Supabase dashboards'
  },
  vibeflow_constraints: {
    registry: [
      `Models locked to ${canonicalWithIdea.registries.models}`,
      `Tools locked to ${canonicalWithIdea.registries.tools}`
    ],
    routing: [
      `Delegations follow ${canonicalWithIdea.registries.routing}`,
      `Visual tasks must leverage ${canonicalWithIdea.model_policies.visual_platform} with human approval`
    ],
    testing: [
      'npm test must pass for every code task before promotion',
      "Visual artifacts require Browser-Use checklist + human sign-off"
    ],
    security: [
      'Secrets live in data/tasks/secrets-registry.json only',
      'Status promotion scripts enforce stage ordering before orchestration'
    ],
    status_flow: statusFlow
  },
  artifacts: canonicalWithIdea.artifacts,
  registries: canonicalWithIdea.registries,
  model_policies: canonicalWithIdea.model_policies,
  philosophy: canonicalWithIdea.philosophy
};

await fs.writeFile(prdPath, JSON.stringify(prdSummary, null, 2) + '\n', 'utf8');

console.log(`PRD summary updated for ${ideaId} at ${prdPath}`);
