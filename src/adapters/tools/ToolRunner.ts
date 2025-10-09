import fs from "node:fs/promises";
import path from "node:path";

export type ToolCall = { tool: string; args: any };

type ToolSpec = {
  name: string;
  input: any;
  output: any;
  allowlistPaths?: string[];
};

function withinAllowlist(fullPath: string, root: string, allow: string[]) {
  const norm = path.normalize(fullPath);
  return allow.some(a => norm.startsWith(path.join(root, a)));
}

export class ToolRunner {
  private specs: Record<string, ToolSpec> = {};
  constructor(specs: ToolSpec[]) {
    for (const s of specs) this.specs[s.name] = s;
  }
  get names() { return Object.keys(this.specs); }

  async run(call: ToolCall) {
    const spec = this.specs[call.tool];
    if (!spec) throw new Error(`Unknown tool ${call.tool}`);
    if (typeof call.args !== "object" || Array.isArray(call.args)) throw new Error("Args must be an object");

    if (call.tool === "OpenSpecWriter@v1") {
      return await this.openSpecWriter(spec, call.args);
    }
    throw new Error(`No handler for ${call.tool}`);
  }

  private async openSpecWriter(spec: ToolSpec, args: any) {
    const { slug, title, rationale, acceptance_criteria } = args as {
      slug: string; title: string; rationale: string; acceptance_criteria: string[];
    };
    if (!slug || !/^[a-z0-9-]+$/.test(slug)) throw new Error("Invalid slug");
    if (!title) throw new Error("Missing title");
    if (!Array.isArray(acceptance_criteria)) throw new Error("acceptance_criteria must be array");

    const root = process.cwd();
    const file = path.join(root, "openspec", "changes", `${slug}.md`);

    if (spec.allowlistPaths && !withinAllowlist(file, root, spec.allowlistPaths)) {
      throw new Error("Path outside allowlist");
    }

    const header =
`# ${title}

${rationale}

## Acceptance Criteria
${acceptance_criteria.map((x:string) => `- ${x}`).join("\n")}
`;

    let updated = false;
    try { await fs.stat(file); updated = true; } catch {}
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, header, "utf8");
    return { path: path.relative(root, file), updated };
  }
}
