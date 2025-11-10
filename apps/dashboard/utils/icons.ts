import claudeIcon from "../assets/agents/claude.svg?url";
import deepseekIcon from "../assets/agents/deepseek.svg?url";
import geminiIcon from "../assets/agents/gemini.svg?url";
import openaiIcon from "../assets/agents/openai.svg?url";
import kimiIcon from "../assets/agents/kimi.svg?url";
import chatglmIcon from "../assets/agents/chatglm.svg?url";
import minimaxIcon from "../assets/agents/minimax.svg?url";
import mistralIcon from "../assets/agents/mistral.svg?url";
import grokIcon from "../assets/agents/grok.svg?url";
import metaIcon from "../assets/agents/meta.svg?url";
import qwenIcon from "../assets/agents/qwen.svg?url";

const ICON_BASE = "https://cdn.jsdelivr.net/gh/lobehub/lobe-icons@latest/assets";

const LOCAL_ICON_MAP: Array<{ match: RegExp; path: string }> = [
  { match: /claude|anthropic/i, path: claudeIcon },
  { match: /deepseek/i, path: deepseekIcon },
  { match: /gemini|google/i, path: geminiIcon },
  { match: /openai|gpt|turbo/i, path: openaiIcon },
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

