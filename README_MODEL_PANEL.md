# Vibeflow Model Dashboard Page & Status Panel

## Structure
- **ModelDashboardPage.tsx** — standalone page (for future `/dashboard/models` route)
- **ModelStatusPanel.tsx** — reusable card grid displaying model health
- **ModelStatus.ts** — type definition
- **modelStatusData.ts** — optional mock fallback

## Usage
```tsx
import ModelDashboardPage from './src/pages/dashboard/ModelDashboardPage';
```
or include `<ModelStatusPanel />` directly in your own dashboard container.

## Behavior
- Loads `/data/status/models/*.json` automatically.
- Falls back to mock data if no live files found.
- Auto-refreshes every 30 seconds.
- Displays color-coded cards:
  - 🟢 healthy
  - 🟡 near_limit
  - 🔴 cooldown

## Future Extensions
- Add props for `taskStats`, `tokenUsage`, `roiEstimates`
- Integrate into overall dashboard router:
```tsx
<Route path="/dashboard/models" element={<ModelDashboardPage />} />
```
