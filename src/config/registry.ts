import fs from "fs/promises";
import path from "path";
import { directories } from "./paths";
import { runOpenCodeTask } from "../adapters/opencode"; // <— NEW

// ---------- Type definitions ----------

export interface ModelDefinition {
  id: string;
  vendor: string;
  display_name: string;
  task_types: string[];
  supports_tools: boolean;
  supports_vision: boolean;
  max_context_tokens: number;
  cost_per_1k_prompt: number;
  cost_per_1k_completion: number;
  tags: string[];
  policy_flags: string[];
  recommended_for: string[];
  notes?: string;
}

export interface ToolDefinition {
  slug: string;
  description: string;
  entrypoint: string;
  allowed_args: string[];
  tags: string[];
  outputs: string[];
  policy_flags: string[];
}

export interface RoutingRule {
  match: Record<string, unknown>;
  route: Record<string, unknown>;
}

export interface ModelRegistryJSON {
  models: ModelDefinition[];
}

export interface ToolRegistryJSON {
  tools: ToolDefinition[];
}

export interface RoutingPolicyJSON {
  defaults: Record<string, unknown>;
  rules: RoutingRule[];
}

// ---------- JSON loaders ----------

async function readJson<T>(relative: string, fallback: T): Promise<T> {
  try {
    const filePath = path.join(directories.root, relative);
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch (error: any) {
    if (error.code === "ENOENT") {
      return fallback;
    }
    throw error;
  }
}

let cachedModels: ModelRegistryJSON | null = null;
let cachedTools: ToolRegistryJSON | null = null;
let cachedRouting: RoutingPolicyJSON | null = null;

export async function loadModelRegistry(): Promise<ModelRegistryJSON> {
  if (!cachedModels) {
    cachedModels = await readJson<ModelRegistryJSON>(
      "data/registry/models.json",
      { models: [] }
    );
  }
  return cachedModels;
}

export async function loadToolRegistry(): Promise<ToolRegistryJSON> {
  if (!cachedTools) {
    cachedTools = await readJson<ToolRegistryJSON>(
      "data/registry/tools.json",
      { tools: [] }
    );
  }
  return cachedTools;
}

export async function loadRoutingPolicy(): Promise<RoutingPolicyJSON> {
  if (!cachedRouting) {
    cachedRouting = await readJson<RoutingPolicyJSON>(
      "data/policies/routing.json",
      { defaults: {}, rules: [] }
    );
  }
  return cachedRouting;
}

export async function getModelDefinition(
  id: string
): Promise<ModelDefinition | undefined> {
  const registry = await loadModelRegistry();
  return registry.models.find((model) => model.id === id);
}

export async function getToolDefinition(
  slug: string
): Promise<ToolDefinition | undefined> {
  const registry = await loadToolRegistry();
  return registry.tools.find((tool) => tool.slug === slug);
}

// ---------- Provider map (runtime registry) ----------

/**
 * At runtime, providers map a `vendor` key to the handler that executes
 * its tasks. Add new integrations here (OpenCode, Gemini, DeepSeek, etc.).
 */
export const providers: Record<
  string,
  {
    channel: "cli" | "web" | "browser";
    run: (packet: any) => Promise<any>;
  }
> = {
  opencode: {
    channel: "cli",
    run: runOpenCodeTask, // uses adapter in ../adapters/opencode.ts
  },

  // Other existing providers are auto-loaded elsewhere.
};


