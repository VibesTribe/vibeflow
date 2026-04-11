export interface GitHubQueueOptions {
  owner: string;
  repo: string;
  token: string;
  branch?: string;
  workflow?: string;
}

export interface GitHubQueueResult {
  status: "queued";
  path: string;
  commitSha: string;
  workflowDispatched: boolean;
}

export async function queueTaskViaGitHub(
  payload: Record<string, unknown>,
  options: GitHubQueueOptions
): Promise<GitHubQueueResult> {
  const { owner, repo, token, branch = "main", workflow } = options;
  const resolver = new QueuePathResolver(payload);
  const path = resolver.resolve();
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
  };

  const commitResponse = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${encodePath(path)}`,
    {
      method: "PUT",
      headers,
      body: JSON.stringify({
        message: `queue: ${resolver.summary()}`,
        content: toBase64(JSON.stringify(payload, null, 2)),
        branch,
      }),
    }
  );

  if (!commitResponse.ok) {
    const errorText = await commitResponse.text();
    throw new Error(
      `GitHub queue commit failed (${commitResponse.status}): ${truncate(errorText, 240)}`
    );
  }

  const commitJson = (await commitResponse.json()) as { commit?: { sha?: string } };
  let workflowDispatched = false;

  if (workflow) {
    const dispatchResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflow}/dispatches`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ ref: branch }),
      }
    );
    workflowDispatched = dispatchResponse.ok;
  }

  return {
    status: "queued",
    path,
    commitSha: commitJson.commit?.sha ?? "",
    workflowDispatched,
  };
}

class QueuePathResolver {
  constructor(private readonly payload: Record<string, unknown>) {}

  resolve(): string {
    const id = this.taskId();
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    return `data/tasks/queued/${id}-${stamp}.json`;
  }

  summary(): string {
    const id = this.taskId();
    const title = typeof this.payload.title === "string" ? this.payload.title : "queued task";
    return `${title} (${id})`;
  }

  private taskId(): string {
    const explicit =
      (typeof this.payload.task_id === "string" && this.payload.task_id) ||
      (typeof this.payload.taskId === "string" && this.payload.taskId);
    if (explicit) {
      return explicit.replace(/[^a-z0-9/_-]+/gi, "-");
    }
    return `task-${Date.now().toString(36)}`;
  }
}

function encodePath(path: string): string {
  return path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function toBase64(value: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(value);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function truncate(value: string, limit: number): string {
  if (value.length <= limit) {
    return value;
  }
  return `${value.slice(0, limit)}…`;
}
