/**
 * vibeflow-meta:
 * id: apps/dashboard/vite.config.ts
 * task: REBUILD-V5
 * regions:
 *   - id: vite-config
 *     hash: 20251104
 * locked: false
 * last_commit: VibesMissionControl-Fix
 */

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

// ✅ Fixed: correct outDir and base for GitHub Pages
// ✅ Keeps same dev server + aliases for local work
export default defineConfig({
  root: dirname,
  plugins: [react()],

  base: "/vibeflow/", // GitHub Pages subpath
  server: {
    host: true,
    port: 5173,
  },

  build: {
    outDir: path.resolve(dirname, "dist"), // ✅ local dist inside apps/dashboard
    emptyOutDir: true,
  },

  resolve: {
    alias: {
      "@core": path.resolve(dirname, "../../src/core"),
      "@agents": path.resolve(dirname, "../../src/agents"),
    },
  },
});
