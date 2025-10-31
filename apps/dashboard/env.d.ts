/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_RUN_TASK_ENDPOINT?: string;
  readonly VITE_MCP_TOKEN?: string;
  readonly VITE_GITHUB_OWNER?: string;
  readonly VITE_GITHUB_REPO?: string;
  readonly VITE_GITHUB_BRANCH?: string;
  readonly VITE_GITHUB_WORKFLOW?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
