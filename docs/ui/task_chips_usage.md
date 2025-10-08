# UI Snippet — TaskChips (mock-safe)

Use this (read-only) ROI strip on task cards. It fails closed (renders nothing) if `enabled=false`
or if you don’t pass numbers.

```tsx
import TaskChips from "@/src/components/dashboard/TaskChips";

// inside a task card:
<TaskChips
  enabled={Boolean(task?.roi)}              // feature flag in your state
  cfUsd={task?.roi?.cf_usd ?? 0}
  vfUsd={task?.roi?.vf_usd ?? 0}
  roiPct={task?.roi?.roi_pct ?? 0}
  attempts={task?.attempts ?? 0}
  status={task?.status as any}
/>
```
