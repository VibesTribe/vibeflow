export type ReviewPolicy = 'auto' | 'visual_agent' | 'human' | 'merge_gate';
export type TaskType = 'code' | 'config' | 'test' | 'mcp' | 'ci' | 'docs';
export type DomainTag = 'backend' | 'frontend' | 'data' | 'infra' | 'docs' | 'design' | string;

export interface PlannerTaskConfig {
  taskId: string;
  title: string;
  purpose: string;
  taskType: TaskType;
  domainTag: DomainTag;
  notes?: string;
  dependsOn?: string[];
  deliverables: string[];
  output: {
    language: string;
    version?: string;
    format?: string;
    files: string[];
  };
  instructions: string[];
  acceptanceCriteria: string[];
  reviewPolicy: ReviewPolicy;
  validation: Array<{ name: string; tool: string }>;
  execution: {
    platform: string;
    model: string;
    budget_usd: number;
    max_tokens?: number;
    latency_slo_ms?: number;
    require_chat_url?: boolean;
  };
  modelBehavior?: {
    topic_affinity?: string;
    policy_flags?: string[];
    max_token_context?: number;
  };
  confidence?: number;
}

export interface PlannerConfig {
  ideaId?: string;
  contextSnapshotPath?: string;
  echoCheck?: string;
  openQuestions?: Array<{ q: string; reason: string; blocked_tasks?: string[] }>;
  slice: {
    id: string;
    name: string;
    goal: string;
    echo_check: string;
    tasks: PlannerTaskConfig[];
  };
}

export interface TaskPacket {
  task_id: string;
  title: string;
  purpose: string;
  confidence: number;
  context: {
    goal: string;
    snapshot_path?: string;
    notes?: string[];
  };
  dependencies: string[];
  deliverables: string[];
  output_format: {
    language: string;
    version?: string;
    format?: string;
    files: string[];
  };
  instructions: string[];
  acceptance_criteria: string[];
  review_policy: ReviewPolicy;
  validation: Array<{ name: string; tool: string }>;
  execution: {
    platform: string;
    model: string;
    budget_usd: number;
    max_tokens?: number;
    latency_slo_ms?: number;
    require_chat_url?: boolean;
  };
  handoff_expectations?: string[];
}

export interface GeneratedPlanArtifacts {
  plan: any;
  taskPackets: Record<string, TaskPacket>;
}
