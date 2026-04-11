export interface SliceBlueprint {
  id: string;
  name: string;
  keywords: string[];
  accent: string;
}

export const SLICE_BLUEPRINTS: SliceBlueprint[] = [
  {
    id: "daily_research",
    name: "Daily Research",
    keywords: ["research", "daily", "scan", "sources"],
    accent: "#8b5cf6",
  },
  {
    id: "inquiry_research",
    name: "Inquiry Research",
    keywords: ["inquiry", "investigate", "analyze"],
    accent: "#7c3aed",
  },
  {
    id: "output_integration",
    name: "Output Integration",
    keywords: ["output", "publish", "findings"],
    accent: "#6d28d9",
  },
  {
    id: "cost_tracking",
    name: "Cost Tracking",
    keywords: ["cost", "roi", "tracking", "tokens"],
    accent: "#5b21b6",
  },
];
