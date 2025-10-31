export interface SliceBlueprint {
  id: string;
  name: string;
  keywords: string[];
  accent: string;
}

export const SLICE_BLUEPRINTS: SliceBlueprint[] = [
  {
    id: "data-ingestion",
    name: "Data Ingestion",
    keywords: ["ingest", "pipeline", "ingestion"],
    accent: "#38bdf8",
  },
  {
    id: "data-analysis",
    name: "Data Analysis",
    keywords: ["analysis", "analytics", "insight"],
    accent: "#22d3ee",
  },
  {
    id: "auth-rbac",
    name: "Auth & RBAC",
    keywords: ["auth", "rbac", "security", "permission"],
    accent: "#a855f7",
  },
  {
    id: "orchestration",
    name: "Orchestration",
    keywords: ["orchestr", "mission", "dispatch"],
    accent: "#34d399",
  },
  {
    id: "quality",
    name: "Quality & QA",
    keywords: ["test", "qa", "validate", "review"],
    accent: "#facc15",
  },
];
