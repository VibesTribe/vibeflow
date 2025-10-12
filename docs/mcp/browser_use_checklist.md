# Browser‑Use / DevTools MCP Checklist

- Auth via Gateway; never emit raw secrets to prompts.
- Capture console errors, network failures; measure LCP.
- Run a11y scan; emit DOM snapshot diff for Supervisor.
- Store provenance: URL, timestamp, agent, run id.
