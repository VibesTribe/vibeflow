const ICON_BASE = "https://cdn.jsdelivr.net/gh/lobehub/lobe-icons@latest/assets";

const LOCAL_ICON_MAP: Array<{ match: RegExp; path: string }> = [
  { match: /claude|anthropic/i, path: "/agents/claude.svg" },
  { match: /deepseek/i, path: "/agents/deepseek.svg" },
  { match: /gemini|google/i, path: "/agents/gemini.svg" },
];

const REMOTE_ICON_MAP: Array<{ match: RegExp; path: string }> = [
  { match: /openai|gpt|turbo/i, path: `${ICON_BASE}/platforms/openai-color.svg` },
  { match: /roo|roo ide/i, path: `${ICON_BASE}/platforms/roo-color.svg` },
  { match: /cursor/i, path: `${ICON_BASE}/platforms/cursor-color.svg` },
  { match: /cl|cline/i, path: `${ICON_BASE}/platforms/cline-color.svg` },
  { match: /openrouter/i, path: `${ICON_BASE}/platforms/openrouter-color.svg` },
  { match: /groq/i, path: `${ICON_BASE}/platforms/groq-color.svg` },
];

export const FALLBACK_ICON = `${ICON_BASE}/misc/robot-color.svg`;

export function resolveProviderIcon(name: string): string {
  for (const mapping of LOCAL_ICON_MAP) {
    if (mapping.match.test(name)) {
      return mapping.path;
    }
  }
  for (const mapping of REMOTE_ICON_MAP) {
    if (mapping.match.test(name)) {
      return mapping.path;
    }
  }
  return FALLBACK_ICON;
}

