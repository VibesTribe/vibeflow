import path from 'path';
import { buildPlanArtifacts, readPlannerConfig } from '../src/planner/planBuilder';

describe('planner plan builder', () => {
  it('produces high-confidence plan artifacts', async () => {
    const configPath = path.join(process.cwd(), 'planner/examples/shared-context.json');
    const config = await readPlannerConfig(configPath);
    const artifacts = buildPlanArtifacts(config);

    expect(artifacts.plan.slices).toHaveLength(1);
    const slice = artifacts.plan.slices[0];
    expect(slice.tasks.length).toBeGreaterThan(0);

    slice.tasks.forEach((task: any) => {
      expect(task.confidence).toBeGreaterThanOrEqual(0.95);
    });

    const packets = Object.values(artifacts.taskPackets);
    packets.forEach((packet) => {
      expect(packet.confidence).toBeGreaterThanOrEqual(0.95);
      expect(packet.instructions.length).toBeGreaterThan(0);
    });
  });
});
