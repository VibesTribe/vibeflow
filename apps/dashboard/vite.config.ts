/**
 * vibeflow-meta:
 * id: apps/dashboard/vite.config.ts
 * task: FIX-GHPAGES-ROOT-OUTPUT
 */

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

// ✅ Base path for GitHub Pages
const base = "/vibeflow/v2/";

export default defineConfig({
  root: dirname,
  plugins: [react()],
  base,
  server: {
    host: true,
    port: 5173,
  },
  // ✅ Output directly to /dist so Pages finds index.html at the root
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
