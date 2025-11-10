import geminiIconUrl from "../assets/agents/gemini.svg?url";
import claudeIconUrl from "../assets/agents/claude.svg?url";
import deepseekIconUrl from "../assets/agents/deepseek.svg?url";
import openaiIconUrl from "../assets/agents/openai.svg?url";
import kimiIconUrl from "../assets/agents/kimi.svg?url";
import chatglmIconUrl from "../assets/agents/chatglm.svg?url";
import minimaxIconUrl from "../assets/agents/minimax.svg?url";
import mistralIconUrl from "../assets/agents/mistral.svg?url";
import grokIconUrl from "../assets/agents/grok.svg?url";
import metaIconUrl from "../assets/agents/meta.svg?url";
import qwenIconUrl from "../assets/agents/qwen.svg?url";

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
  { match: /gemini|google/i, path: withBase(geminiIconUrl) },
  { match: /claude|anthropic/i, path: withBase(claudeIconUrl) },
  { match: /deepseek/i, path: withBase(deepseekIconUrl) },
  { match: /openai|gpt|turbo|oai/i, path: withBase(openaiIconUrl) },
  { match: /moonshot|kimi/i, path: withBase(kimiIconUrl) },
  { match: /glm|chatglm|zhipu/i, path: withBase(chatglmIconUrl) },
  { match: /minimax/i, path: withBase(minimaxIconUrl) },
  { match: /mistral/i, path: withBase(mistralIconUrl) },
  { match: /grok/i, path: withBase(grokIconUrl) },
  { match: /meta|llama|facebook/i, path: withBase(metaIconUrl) },
  { match: /qwen|gwen|alibaba/i, path: withBase(qwenIconUrl) },
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

