#!/bin/bash
# Helper script to commit Codex-generated files and push to GitHub codex branch

TASK_ID=$1
if [ -z "$TASK_ID" ]; then
  echo "Usage: ./scripts/codex_push.sh <TASK_ID>"
  exit 1
fi

BRANCH="codex"

# Make sure we're in repo root
cd "$(dirname "$0")/.."

git checkout -B $BRANCH
git add .
git commit -m "[$TASK_ID] Auto-commit from Codex helper script"
git push origin $BRANCH
