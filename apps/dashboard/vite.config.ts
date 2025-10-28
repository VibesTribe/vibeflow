/**
 * vibeflow-meta:
 * id: apps/dashboard/vite.config.ts
 * task: REBUILD-V5
 * regions:
 *   - id: vite-config
 *     hash: 00000000
 * locked: false
 * last_commit: null
 */

/* @editable:vite-config */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: dirname,
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
  },
  build: {
    outDir: path.resolve(dirname, "../../dist/dashboard"),
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      "@core": path.resolve(dirname, "../../src/core"),
      "@agents": path.resolve(dirname, "../../src/agents"),
    },
  },
});
/* @endeditable */
