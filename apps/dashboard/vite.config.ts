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
const onVercel = process.env.VERCEL === "1";
const base = onVercel ? "/" : "/vibeflow/";
const outDir = onVercel
  ? path.resolve(dirname, "dist")
  : path.resolve(dirname, "../../dist");

export default defineConfig({
  root: dirname,
  plugins: [react()],
  base,
  server: {
    host: true,
    port: 5173,
  },
  build: {
    outDir,
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      "@core": path.resolve(dirname, "../../src/core"),
      "@agents": path.resolve(dirname, "../../src/agents"),
    },
  },
});
