#!/usr/bin/env node
require('ts-node/register/transpile-only');

const fs = require('fs/promises');
const path = require('path');
const { loadStatusRecords } = require('../../src/maintenance/status');

const vibeflowRoot = process.env.VIBEFLOW_ROOT ?? process.cwd();
const outputDir = path.join(vibeflowRoot, 'docs', 'state', 'maintenance');
const outputPath = path.join(outputDir, 'status.md');

const STATUS_ORDER = [
  'recommended',
  'supervisor_review',
  'supervisor_approved',
  'needs_revision',
  'maintenance_in_progress',
  'implemented',
  'watchlist'
];

function headingForStatus(status) {
  const map = {
    recommended: 'Recommended',
    supervisor_review: 'Awaiting Supervisor Review',
    supervisor_approved: 'Approved for Maintenance',
    needs_revision: 'Needs Revision',
    maintenance_in_progress: 'Maintenance In Progress',
    implemented: 'Implemented',
    watchlist: 'Watchlist'
  };
  return map[status] ?? status;
}

async function main() {
  const records = await loadStatusRecords();
  await fs.mkdir(outputDir, { recursive: true });

  let markdown = '# Maintenance Status

';
  if (!records.length) {
    markdown += '*No maintenance items recorded.*
';
  } else {
    for (const status of STATUS_ORDER) {
      const items = records.filter((record) => record.status === status);
      if (!items.length) continue;
      markdown += `## ${headingForStatus(status)}

`;
      for (const item of items) {
        markdown += `- **${item.title}** (_${item.priority}_) — ${item.source}
`;
        if (item.url) {
          markdown += `  - Link: ${item.url}
`;
        }
        if (item.notes) {
          markdown += `  - Notes: ${item.notes}
`;
        }
        markdown += `  - Updated: ${item.updated_at}
`;
      }
      markdown += '
';
    }
  }

  await fs.writeFile(outputPath, markdown, 'utf8');
  console.log(`[maintenance:render-status] wrote ${path.relative(vibeflowRoot, outputPath)}`);
}

main().catch((error) => {
  console.error('[maintenance:render-status] failed:', error.message ?? error);
  process.exit(1);
});
