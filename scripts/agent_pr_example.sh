#!/usr/bin/env bash
# Requires: GH_REPO (owner/repo), GH_TOKEN (PAT or App token), TASK_ID
set -euo pipefail
: "${GH_REPO:?Set GH_REPO like owner/repo}"
: "${GH_TOKEN:?Set GH_TOKEN}"
: "${TASK_ID:?Set TASK_ID like SL-0123}"

BR="agent/${TASK_ID}-demo"
git config user.name "vibeflow-bot"
git config user.email "vibeflow-bot@users.noreply.github.com"

git checkout -b "$BR"
mkdir -p demo && echo "hello from $TASK_ID" > demo/README.md
git add .
git commit -m "feat(${TASK_ID}): demo change"
git push -u origin "$BR"

API="https://api.github.com/repos/${GH_REPO}/pulls"
TITLE="Agent PR: ${TASK_ID} → testing"
BODY="Automated PR for task ${TASK_ID}."
DATA=$(jq -nc --arg title "$TITLE" --arg head "$BR" --arg base "testing" --arg body "$BODY" '{title:$title, head:$head, base:$base, body:$body}')
curl -sS -H "Authorization: token ${GH_TOKEN}" -H "Accept: application/vnd.github+json" -d "$DATA" "$API" | jq .html_url
