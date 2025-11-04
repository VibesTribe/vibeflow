/**
 * vibeflow-meta:
 * id: apps/dashboard/vite.config.ts
 * task: STABLE-GHPAGES-ROOT
 */

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

// ✅ Standard GitHub Pages base
const base = "/vibeflow/";

export default defineConfig({
  root: dirname,
  plugins: [react()],
  base,
  server: {
    host: true,
    port: 5173,
  },
  // ✅ Output to project root /dist (where Pages will look)
  build: {
    outDir: path.resolve(dirname, "../../dist"),
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      "@core": path.resolve(dirname, "../../src/core"),
      "@agents": path.resolve(dirname, "../../src/agents"),
    },
  },
});
