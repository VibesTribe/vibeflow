#!/usr/bin/env node

import { promises as fs } from "fs";
import path from "path";

async function main() {
  const metricsPath = path.resolve("data/metrics/run_metrics.json");
  const capabilityPath = path.resolve("data/metrics/capability_vector.json");
  const reportPath = path.resolve("data/metrics/nightly_summary.json");

  const metrics = JSON.parse(await fs.readFile(metricsPath, "utf8"));
  const capability = JSON.parse(await fs.readFile(capabilityPath, "utf8"));

  const summary = {
    generated_at: new Date().toISOString(),
    roi_score: metrics.roi_score,
    success_rate: metrics.success_rate,
    top_skill: capability.skills[0]?.id ?? null,
    observations: [
      metrics.notes?.[0] ?? "No notes provided",
      `Skill portfolio size: ${capability.skills.length}`
    ],
  };

  await fs.writeFile(reportPath, JSON.stringify(summary, null, 2));
  console.log(`[analyst] summary written to ${reportPath}`);
}

main();
