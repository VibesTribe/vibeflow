import claudeIconRaw from "../assets/agents/claude.svg?raw";
import deepseekIconRaw from "../assets/agents/deepseek.svg?raw";
import geminiIconRaw from "../assets/agents/gemini.svg?raw";
import openaiIconRaw from "../assets/agents/openai.svg?raw";
import kimiIconRaw from "../assets/agents/kimi.svg?raw";
import chatglmIconRaw from "../assets/agents/chatglm.svg?raw";
import minimaxIconRaw from "../assets/agents/minimax.svg?raw";
import mistralIconRaw from "../assets/agents/mistral.svg?raw";
import grokIconRaw from "../assets/agents/grok.svg?raw";
import metaIconRaw from "../assets/agents/meta.svg?raw";
import qwenIconRaw from "../assets/agents/qwen.svg?raw";

const ICON_BASE = "https://cdn.jsdelivr.net/gh/lobehub/lobe-icons@latest/assets";

const asDataUri = (svg: string) => `data:image/svg+xml,${encodeURIComponent(svg)}`;

const LOCAL_ICON_MAP: Array<{ match: RegExp; path: string }> = [
  { match: /claude|anthropic/i, path: asDataUri(claudeIconRaw) },
  { match: /deepseek/i, path: asDataUri(deepseekIconRaw) },
  { match: /gemini|google/i, path: asDataUri(geminiIconRaw) },
  { match: /openai|gpt|turbo|oai/i, path: asDataUri(openaiIconRaw) },
  { match: /moonshot|kimi/i, path: asDataUri(kimiIconRaw) },
  { match: /glm|chatglm|zhipu/i, path: asDataUri(chatglmIconRaw) },
  { match: /minimax/i, path: asDataUri(minimaxIconRaw) },
  { match: /mistral/i, path: asDataUri(mistralIconRaw) },
  { match: /grok/i, path: asDataUri(grokIconRaw) },
  { match: /meta|llama|facebook/i, path: asDataUri(metaIconRaw) },
  { match: /qwen|gwen|alibaba/i, path: asDataUri(qwenIconRaw) },
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

