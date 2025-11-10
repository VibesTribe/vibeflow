const UNPKG_SVG = "https://unpkg.com/@lobehub/icons-static-svg@latest/icons";
const UNPKG_PNG_LIGHT = "https://unpkg.com/@lobehub/icons-static-png@latest/light";
const ICON_BASE = "https://cdn.jsdelivr.net/gh/lobehub/lobe-icons@latest/assets";

const REMOTE_ICON_MAP: Array<{ match: RegExp; path: string }> = [
  { match: /gemini|google/i, path: `${UNPKG_SVG}/gemini.svg` },
  { match: /openai|gpt|turbo/i, path: `${UNPKG_PNG_LIGHT}/openai.png` },
  { match: /claude|anthropic/i, path: `${UNPKG_SVG}/claude.svg` },
  { match: /deepseek/i, path: `${UNPKG_SVG}/deepseek.svg` },
  { match: /moonshot|kimi/i, path: `${UNPKG_SVG}/kimi.svg` },
  { match: /glm|chatglm|zhipu/i, path: `${UNPKG_SVG}/chatglm.svg` },
  { match: /minimax/i, path: `${UNPKG_SVG}/minimax.svg` },
  { match: /mistral/i, path: `${UNPKG_SVG}/mistral.svg` },
  { match: /grok/i, path: `${UNPKG_SVG}/grok.svg` },
  { match: /meta|llama|facebook/i, path: `${UNPKG_SVG}/meta.svg` },
  { match: /qwen|gwen|alibaba/i, path: `${UNPKG_SVG}/qwen.svg` },
  { match: /roo|roo ide/i, path: `${ICON_BASE}/platforms/roo-color.svg` },
  { match: /cursor/i, path: `${ICON_BASE}/platforms/cursor-color.svg` },
  { match: /cl|cline/i, path: `${ICON_BASE}/platforms/cline-color.svg` },
  { match: /openrouter/i, path: `${ICON_BASE}/platforms/openrouter-color.svg` },
  { match: /groq/i, path: `${ICON_BASE}/platforms/groq-color.svg` },
];

export const FALLBACK_ICON = `${ICON_BASE}/misc/robot-color.svg`;

export function resolveProviderIcon(name: string): string {
  for (const mapping of REMOTE_ICON_MAP) {
    if (mapping.match.test(name)) {
      return mapping.path;
    }
  }
  return FALLBACK_ICON;
}
