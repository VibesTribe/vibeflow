// src/adapters/memory/OpenMemoryAdapter.ts
export type MemoryItem = {
  projectId: string;
  kind: "preference" | "architecture" | "testing" | "convention" | "decision";
  key: string;
  value: string;
  source?: "user" | "planner" | "supervisor" | "task_agent" | "analyst";
  createdAt?: string;
};

export interface MemoryAdapter {
  remember(item: MemoryItem): Promise<void>;
  recall(query: { projectId: string; key?: string; text?: string; limit?: number }): Promise<MemoryItem[]>;
  syncFromMcp?(opts: { projectId: string }): Promise<number>;
  syncToMcp?(opts: { projectId: string }): Promise<number>;
}

export class OpenMemoryAdapter implements MemoryAdapter {
  constructor(private opts: { apiBase?: string; apiKey?: string }) {}

  async remember(item: MemoryItem): Promise<void> {
    console.trace("[OpenMemoryAdapter.remember]", item);
  }

  async recall(q: { projectId: string; key?: string; text?: string; limit?: number }): Promise<MemoryItem[]> {
    console.trace("[OpenMemoryAdapter.recall]", q);
    return [];
  }

  async syncFromMcp(opts: { projectId: string }): Promise<number> {
    console.trace("[OpenMemoryAdapter.syncFromMcp]", opts);
    return 0;
  }

  async syncToMcp(opts: { projectId: string }): Promise<number> {
    console.trace("[OpenMemoryAdapter.syncToMcp]", opts);
    return 0;
  }
}
