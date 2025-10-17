// src/adapters/glmAdapter.mjs
import fetch from "node-fetch";

/**
 * Adapter for Z.AI DevPack (GLM-4.6 and related models)
 * Docs: https://docs.z.ai/devpack/overview
 */
export async function executeTask(packet) {
  const start = Date.now();
  const apiKey = process.env.GLM_API_KEY;
  if (!apiKey) throw new Error("Missing GLM_API_KEY in GitHub Secrets");

  const res = await fetch("https://api.zai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: packet.model || "glm-4-6",
      messages: [
        { role: "system", content: "You are a precise, deterministic coding assistant." },
        { role: "user", content: packet.prompt }
      ],
      temperature: packet.temperature ?? 0.2,
      max_tokens: packet.max_tokens ?? 2048
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Z.AI API error: ${res.status} ${errText}`);
  }

  const data = await res.json();
  const latency = Date.now() - start;
  const output = data.choices?.[0]?.message?.content?.trim() || "";

  return {
    success: true,
    output,
    tokens_in: data.usage?.prompt_tokens || 0,
    tokens_out: data.usage?.completion_tokens || 0,
    latency_ms: latency,
    model: packet.model || "glm-4-6",
    adapter: "glm"
  };
}
