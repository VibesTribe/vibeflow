const geminiIcon = new URL("../assets/agents/gemini.svg", import.meta.url).href;
const claudeIcon = new URL("../assets/agents/claude.svg", import.meta.url).href;
const deepseekIcon = new URL("../assets/agents/deepseek.svg", import.meta.url).href;
const openaiIcon = new URL("../assets/agents/openai.svg", import.meta.url).href;
const kimiIcon = new URL("../assets/agents/kimi.svg", import.meta.url).href;
const chatglmIcon = new URL("../assets/agents/chatglm.svg", import.meta.url).href;
const minimaxIcon = new URL("../assets/agents/minimax.svg", import.meta.url).href;
const mistralIcon = new URL("../assets/agents/mistral.svg", import.meta.url).href;
const grokIcon = new URL("../assets/agents/grok.svg", import.meta.url).href;
const metaIcon = new URL("../assets/agents/meta.svg", import.meta.url).href;
const qwenIcon = new URL("../assets/agents/qwen.svg", import.meta.url).href;

const ICON_BASE = "https://cdn.jsdelivr.net/gh/lobehub/lobe-icons@latest/assets";

const LOCAL_ICON_MAP: Array<{ match: RegExp; path: string }> = [
  { match: /gemini|google/i, path: geminiIcon },
  { match: /claude|anthropic/i, path: claudeIcon },
  { match: /deepseek/i, path: deepseekIcon },
  { match: /openai|gpt|turbo|oai/i, path: openaiIcon },
  { match: /moonshot|kimi/i, path: kimiIcon },
  { match: /glm|chatglm|zhipu/i, path: chatglmIcon },
  { match: /minimax/i, path: minimaxIcon },
  { match: /mistral/i, path: mistralIcon },
  { match: /grok/i, path: grokIcon },
  { match: /meta|llama|facebook/i, path: metaIcon },
  { match: /qwen|gwen|alibaba/i, path: qwenIcon },
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

