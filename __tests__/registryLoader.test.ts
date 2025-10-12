import { loadModelRegistry, getModelDefinition, loadToolRegistry, loadRoutingPolicy } from '../src/config/registry';

describe('registry loaders', () => {
  it('loads model registry and resolves model definitions', async () => {
    const registry = await loadModelRegistry();
    expect(registry.models.length).toBeGreaterThan(0);
    const model = await getModelDefinition('openai:gpt-4.1-mini');
    expect(model?.vendor).toBe('openai');
  });

  it('loads tool registry', async () => {
    const tools = await loadToolRegistry();
    expect(tools.tools.some((tool) => tool.slug === 'OpenSpecWriter@v1')).toBe(true);
  });

  it('loads routing policy', async () => {
    const routing = await loadRoutingPolicy();
    expect(Array.isArray(routing.rules)).toBe(true);
    expect(routing.rules.length).toBeGreaterThan(0);
  });
});
