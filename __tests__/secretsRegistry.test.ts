import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';

describe('secrets registry guardrail', () => {
  async function withRegistry(run: (tmp: string, mod: typeof import('../src/guardrails/secretsRegistry')) => Promise<void>) {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'vibeflow-secrets-'));
    const registryDir = path.join(tmp, 'data', 'tasks');
    await fs.mkdir(registryDir, { recursive: true });
    const payload = [
      { name: 'EXAMPLE_SECRET', description: 'Example', required: true }
    ];
    await fs.writeFile(path.join(registryDir, 'secrets-registry.json'), JSON.stringify(payload));

    process.env.VIBEFLOW_ROOT = tmp;
    jest.resetModules();
    const mod = await import('../src/guardrails/secretsRegistry');
    try {
      await run(tmp, mod);
    } finally {
      delete process.env.VIBEFLOW_ROOT;
    }
  }

  it('detects missing secrets', async () => {
    await withRegistry(async (_tmp, mod) => {
      expect(await mod.isSecretRegistered('EXAMPLE_SECRET')).toBe(true);
      expect(await mod.isSecretRegistered('MISSING_SECRET')).toBe(false);
      const missing = await mod.assertSecretsRegistered(['EXAMPLE_SECRET', 'MISSING_SECRET']);
      expect(missing).toEqual(['MISSING_SECRET']);
    });
  });
});
