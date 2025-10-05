# Vibeflow Branch Promotion Pack

Place files exactly as follows:

- **.github/workflows/supervisor-gate.yml**
- **.github/workflows/ci-test.yml**
- **.github/workflows/promote-to-approved.yml**
- **.github/workflows/visual-gate.yml**
- **.github/workflows/promote-to-main.yml**

Create branches once:
- `testing` (empty commit is fine)
- `approved`

Typical flow:
1) Agent opens PR from `agent/<task-id>` → base `testing`.
2) Supervisor Gate labels pass, CI tests run.
3) On push to `testing`, Promotion PR to `approved` opens/updates.
4) Visual Gate runs on PRs to `approved` (only if labeled \"ui\").
5) On push to `approved`, Release PR to `main` opens.
