/**
 * vibeflow-meta:
 * id: src/adapters/apiAdapter.template.ts
 * task: REBUILD-V5
 * regions:
 *   - id: api-adapter
 *     hash: 00000000
 * locked: false
 * last_commit: null
 */

/* @editable:api-adapter */
export interface ApiRequest {
  url: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
}

export async function callApi<T>(request: ApiRequest): Promise<T> {
  const response = await fetch(request.url, {
    method: request.method,
    headers: {
      "content-type": "application/json",
      ...(request.headers ?? {}),
    },
    body: request.body ? JSON.stringify(request.body) : undefined,
  });

  if (!response.ok) {
    throw new Error(`API ${request.url} failed with ${response.status}`);
  }

  return (await response.json()) as T;
}
/* @endeditable */
