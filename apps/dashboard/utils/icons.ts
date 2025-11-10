const ICON_BASE = "https://cdn.jsdelivr.net/gh/lobehub/lobe-icons@latest/assets";

function withBase(path: string): string {
  const base = (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.BASE_URL) || "/";
  const sanitizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
  const sanitizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${sanitizedBase}${sanitizedPath}`;
}

const LOCAL_ICON_MAP: Array<{ match: RegExp; path: string }> = [
  { match: /gemini|google/i, path: withBase("agents/gemini.svg") },
  { match: /openai|gpt|turbo/i, path: withBase("agents/openai.svg") },
  { match: /claude|anthropic/i, path: withBase("agents/claude.svg") },
  { match: /deepseek/i, path: withBase("agents/deepseek.svg") },
  { match: /moonshot|kimi/i, path: withBase("agents/kimi.svg") },
  { match: /glm|chatglm|zhipu/i, path: withBase("agents/chatglm.svg") },
  { match: /minimax/i, path: withBase("agents/minimax.svg") },
  { match: /mistral/i, path: withBase("agents/mistral.svg") },
  { match: /grok/i, path: withBase("agents/grok.svg") },
  { match: /meta|llama|facebook/i, path: withBase("agents/meta.svg") },
  { match: /qwen|gwen|alibaba/i, path: withBase("agents/qwen.svg") },
];

const REMOTE_FALLBACK_MAP: Array<{ match: RegExp; path: string }> = [
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
  for (const mapping of REMOTE_FALLBACK_MAP) {
    if (mapping.match.test(name)) {
      return mapping.path;
    }
  }
  return FALLBACK_ICON;
}

