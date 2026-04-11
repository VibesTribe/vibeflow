#!/bin/bash
# Sync Hermes agent context into vibeflow repo
set -e
VF=~/vibeflow/agent-context

cp ~/.hermes/memories/MEMORY.md "$VF/memories/"
cp ~/.hermes/memories/USER.md "$VF/memories/"

for skill in dashboard-action-bridge cloudflared-tunnel openrouter-cost-audit supabase-frontend-recon vibepilot-model-research; do
  if [ -f ~/.hermes/skills/devops/$skill/SKILL.md ]; then
    mkdir -p "$VF/skills/$skill"
    cp ~/.hermes/skills/devops/$skill/SKILL.md "$VF/skills/$skill/"
  fi
done

# Update current-state timestamp
sed -i "s/^> Last updated:.*/> Last updated: $(date '+%Y-%m-%d %H:%M') by Hermes/" "$VF/state/current-state.md"

cd ~/vibeflow
if git diff --quiet agent-context/ 2>/dev/null; then
  echo "No changes."
else
  git add agent-context/
  git commit -m "agent-context sync: $(date '+%Y-%m-%d %H:%M')"
  git pull --rebase origin main && git push origin main
  echo "Synced."
fi
