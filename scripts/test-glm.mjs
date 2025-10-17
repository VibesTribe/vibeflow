import { executeTask } from "../src/adapters/glmAdapter.mjs";

const packet = {
  model: "glm-4-6",
  prompt: "Write a single line of JavaScript that reverses a string."
};

executeTask(packet)
  .then(result => {
    console.log("✅ Z.AI Test Success");
    console.log("Model:", result.model);
    console.log("Output:", result.output);
    console.log("Latency:", result.latency_ms, "ms");
    console.log("Tokens:", result.tokens_in, "→", result.tokens_out);
  })
  .catch(err => console.error("❌ Test failed:", err.message));
