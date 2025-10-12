#!/usr/bin/env node
require('ts-node/register/transpile-only');

const { collectMaintenanceTasks } = require('../../src/maintenance');
const { loadStatusRecords, mergeTasksIntoStatus, saveStatusRecords, getStatusPath } = require('../../src/maintenance/status');

async function main() {
  const tasks = await collectMaintenanceTasks();
  const current = await loadStatusRecords();
  const merged = mergeTasksIntoStatus(current, tasks);
  await saveStatusRecords(merged);
  console.log([maintenance:process-inbox] merged  task(s). Status table at );
}

main().catch((error) => {
  console.error('[maintenance:process-inbox] failed:', error.message ?? error);
  process.exit(1);
});
