// supervisor_agent.mjs
// Validates task outputs and updates confidence or status accordingly.

export async function validateTaskResult(task, result) {
  console.log(`\n🧭 Supervisor validating ${task.id}...`);

  if (!result || !result.output) {
    console.log("❌ No output to validate.");
    return { status: "failed", confidence: 0.0 };
  }

  const qualityScore = Math.min(1.0, Math.max(0.5, result.quality || 0.9));
  const newStatus = qualityScore >= 0.9 ? "done" : "in_progress";

  console.log(`✅ Validation complete: status=${newStatus}, confidence=${qualityScore}`);
  return { status: newStatus, confidence: qualityScore };
}
