# Codex Vibeflow

A minimal Node.js + TypeScript project scaffold with Jest testing and GitHub Actions workflows.

## Requirements
- Node.js 20.x
- npm 9+

## Getting Started
1. Install dependencies:
   ```bash
   npm install
   ```
2. Run tests (scaffolded to pass with no tests):
   ```bash
   npm test
   ```
3. Build TypeScript (optional):
   ```bash
   npm run build
   ```

## GitHub Actions
- `tests.yml`: Runs Jest on pushes and pull requests with Node 20.
- `approval.yml`: A manual workflow designed to use the `release` environment for approvers. To require approvals, configure the `release` environment in your repository settings and add required reviewers.

## Notes
- Jest is configured with `ts-jest` and `passWithNoTests` so `npm test` succeeds even before you add tests.
- TypeScript compiles from `src` to `dist` using `tsconfig.json`.

