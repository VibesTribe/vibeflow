#!/usr/bin/env node
/**
 * Dispatch trusted tools (OpenSpecWriter@v1, VisualChecklist@v1).
 */
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

function parseArgs(argv) {
  const out = { flags: {}, rest: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const value = argv[i];
    if (value.startsWith('--')) {
      const key = value.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        out.flags[key] = next;
        i += 1;
      } else {
        out.flags[key] = true;
      }
    } else {
      out.rest.push(value);
    }
  }
  return out;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function writeFile(targetPath, content) {
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, content, 'utf8');
  return targetPath;
}

function sanitizeSlug(slug, label) {
  assert(typeof slug === 'string' && slug.trim().length > 0, label + ' is required.');
  const cleaned = slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
  assert(cleaned.length > 0, label + ' must contain alphanumeric characters.');
  return cleaned;
}

function buildMarkdown({ title, generated, sections }) {
  const lines = ['# ' + title, '', 'Generated: ' + generated];
  for (const section of sections) {
    if (!section || !section.content || section.content.length === 0) continue;
    lines.push('');
    lines.push('## ' + section.heading);
    if (Array.isArray(section.content)) {
      for (const item of section.content) {
        lines.push('- ' + item);
      }
    } else {
      lines.push(section.content);
    }
  }
  lines.push('');
  return lines.join('\n');
}

async function runOpenSpecWriter(args) {
  const slug = sanitizeSlug(args.slug ?? args.title, 'slug');
  const title = args.title ?? slug;
  const rationale = args.rationale ?? '';
  const acceptance = Array.isArray(args.acceptance_criteria) ? args.acceptance_criteria : [];
  const notes = Array.isArray(args.notes) ? args.notes : [];

  const filePath = path.join(ROOT, 'openspec', 'changes', slug + '.md');
  const markdown = buildMarkdown({
    title,
    generated: new Date().toISOString(),
    sections: [
      rationale ? { heading: 'Rationale', content: rationale } : null,
      acceptance.length ? { heading: 'Acceptance Criteria', content: acceptance } : null,
      notes.length ? { heading: 'Notes', content: notes } : null
    ]
  });

  await writeFile(filePath, markdown);
  return { path: filePath, slug };
}

async function runVisualChecklist(args) {
  const taskId = sanitizeSlug(args.task_id ?? args.slug, 'task_id');
  const title = args.title ?? 'Visual Checklist for ' + taskId;
  const summary = args.summary ?? '';
  const steps = Array.isArray(args.steps) ? args.steps : [];
  const outcomes = Array.isArray(args.status) ? args.status : Array.isArray(args.outcomes) ? args.outcomes : [];

  const filePath = path.join(ROOT, 'docs', 'visual', 'checklists', taskId + '.md');
  const markdown = buildMarkdown({
    title,
    generated: new Date().toISOString(),
    sections: [
      summary ? { heading: 'Summary', content: summary } : null,
      steps.length ? { heading: 'Steps', content: steps } : null,
      outcomes.length ? { heading: 'Status', content: outcomes } : null
    ]
  });

  await writeFile(filePath, markdown);
  return { path: filePath, task_id: taskId };
}

const TOOL_HANDLERS = {
  'OpenSpecWriter@v1': runOpenSpecWriter,
  'VisualChecklist@v1': runVisualChecklist
};

async function readJson(filePath) {
  const content = await fs.readFile(filePath, 'utf8');
  const sanitized = content.replace(/^\uFEFF/, '');
  return JSON.parse(sanitized);
}

async function main() {
  const parsed = parseArgs(process.argv.slice(2));
  let tool = parsed.flags.tool;
  let args = {};

  if (parsed.flags.payload) {
    const payload = await readJson(path.resolve(parsed.flags.payload));
    tool = payload.tool ?? tool;
    args = payload.args ?? {};
  } else if (parsed.flags.args) {
    args = await readJson(path.resolve(parsed.flags.args));
  }

  assert(tool, 'tool is required.');
  const handler = TOOL_HANDLERS[tool];
  assert(handler, 'Unsupported tool: ' + tool);

  const result = await handler(args);
  console.log('Trusted tool ' + tool + ' executed successfully:', result);
}

main().catch((error) => {
  console.error('[trusted-tool] failed:', error.message);
  process.exit(1);
});
