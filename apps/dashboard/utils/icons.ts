import geminiIconRaw from "../assets/agents/gemini.svg?url";
import claudeIconRaw from "../assets/agents/claude.svg?url";
import deepseekIconRaw from "../assets/agents/deepseek.svg?url";
import openaiIconRaw from "../assets/agents/openai.svg?url";
import kimiIconRaw from "../assets/agents/kimi.svg?url";
import chatglmIconRaw from "../assets/agents/chatglm.svg?url";
import minimaxIconRaw from "../assets/agents/minimax.svg?url";
import mistralIconRaw from "../assets/agents/mistral.svg?url";
import grokIconRaw from "../assets/agents/grok.svg?url";
import metaIconRaw from "../assets/agents/meta.svg?url";
import qwenIconRaw from "../assets/agents/qwen.svg?url";

const ICON_BASE = "https://cdn.jsdelivr.net/gh/lobehub/lobe-icons@latest/assets";

function withBase(url: string): string {
  if (/^(https?:|data:)/.test(url)) {
    return url;
  }
  const base = import.meta.env.BASE_URL ?? "/";
  const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
  const normalizedUrl = url.startsWith("/") ? url : `/${url}`;
  return `${normalizedBase}${normalizedUrl}`;
}

const LOCAL_ICON_MAP: Array<{ match: RegExp; path: string }> = [
  { match: /gemini|google/i, path: withBase(geminiIconRaw) },
  { match: /claude|anthropic/i, path: withBase(claudeIconRaw) },
  { match: /deepseek/i, path: withBase(deepseekIconRaw) },
  { match: /openai|gpt|turbo|oai/i, path: withBase(openaiIconRaw) },
  { match: /moonshot|kimi/i, path: withBase(kimiIconRaw) },
  { match: /glm|chatglm|zhipu/i, path: withBase(chatglmIconRaw) },
  { match: /minimax/i, path: withBase(minimaxIconRaw) },
  { match: /mistral/i, path: withBase(mistralIconRaw) },
  { match: /grok/i, path: withBase(grokIconRaw) },
  { match: /meta|llama|facebook/i, path: withBase(metaIconRaw) },
  { match: /qwen|gwen|alibaba/i, path: withBase(qwenIconRaw) },
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

