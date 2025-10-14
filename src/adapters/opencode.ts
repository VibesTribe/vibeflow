export async function runOpenCodeTask(packet) {
  const res = await fetch("https://api.opencodelabs.ai/v1/run", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENCODE_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: packet.model || "glm-4.6",
      prompt: packet.prompt,
      context: packet.context
    })
  });
  if (!res.ok) throw new Error(`OpenCode error ${res.status}`);
  return await res.json();
}
