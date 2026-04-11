import { promises as fs } from "fs";
import path from "path";
import { Orchestrator } from "@core/orchestrator";
import { Planner } from "@core/planner";
import { Router } from "@core/router";
import { EventEmitter } from "@core/eventEmitter";

const PLATFORM_REGISTRY_PATH = path.resolve("data/registry/platforms/index.json");

interface RouterOptionsShape {
  weights?: {
    priority: number;
    confidence: number;
    successRate: number;
    latency: number;
    penalty: number;
  };
  latencyTarget?: number;
  minConfidence?: number;
}

interface PlatformRegistry {
  providers: PlatformEntry[];
  weights?: Partial<Record<"priority" | "confidence" | "success_rate" | "latency" | "penalty", number>>;
  latency_target_seconds?: number;
}

interface PlatformEntry {
  id: string;
  model?: string;
  priority: number;
  confidence: number;
  success_rate: number;
  latency_avg: number;
  token_penalty?: number;
}

interface CreateOrchestratorOptions {
  registryPath?: string;
}

interface OrchestratorRuntime {
  orchestrator: Orchestrator;
  events: EventEmitter;
}

export async function createOrchestrator(options: CreateOrchestratorOptions = {}): Promise<OrchestratorRuntime> {
  const registryPath = options.registryPath ?? PLATFORM_REGISTRY_PATH;
  const registry = await loadPlatformRegistry(registryPath);
  const routerOptions: RouterOptionsShape = {};
  if (registry.weights) {
    routerOptions.weights = {
      priority: registry.weights.priority ?? 0,
      confidence: registry.weights.confidence ?? 0,
      successRate: registry.weights.success_rate ?? 0,
      latency: registry.weights.latency ?? 0,
      penalty: registry.weights.penalty ?? 0,
    };
  }

  if (registry.latency_target_seconds) {
    routerOptions.latencyTarget = registry.latency_target_seconds;
  }

  const planner = new Planner();
  const router = new Router(registry.providers.map(normalizeProvider), routerOptions);
  const events = new EventEmitter();
  const orchestrator = new Orchestrator(planner, router, events);

  return { orchestrator, events };
}

async function loadPlatformRegistry(registryPath: string): Promise<PlatformRegistry> {
  try {
    const raw = await fs.readFile(registryPath, "utf8");
    return JSON.parse(raw) as PlatformRegistry;
  } catch (error) {
    throw new Error(`Failed to load platform registry at ${registryPath}: ${(error as Error).message}`);
  }
}

function normalizeProvider(entry: PlatformEntry) {
  return {
    provider: entry.id,
    model: entry.model,
    priority: entry.priority,
    confidence: entry.confidence,
    successRate: entry.success_rate,
    latency: entry.latency_avg,
    tokenPenalty: entry.token_penalty,
  };
}

