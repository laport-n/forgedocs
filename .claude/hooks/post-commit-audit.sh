#!/usr/bin/env bash
# Forgedocs post-commit documentation audit hook
# Installed by: forgedocs install
# Runs after git commit via Claude Code PostToolUse hook
# Checks for documentation drift and warns if found

set -euo pipefail

# Read hook input from stdin
INPUT=$(cat)

# Extract the command that was executed
COMMAND=$(echo "$INPUT" | grep -o '"command"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*: *"//;s/"$//' 2>/dev/null || true)

# Only run on git commit commands
case "$COMMAND" in
  git\ commit*|git\ merge*) ;;
  *) exit 0 ;;
esac

# Run forgedocs audit if available
if command -v forgedocs &>/dev/null; then
  AUDIT_CMD="forgedocs"
elif command -v npx &>/dev/null; then
  AUDIT_CMD="npx --yes forgedocs"
else
  exit 0
fi

RESULT=$($AUDIT_CMD check . --json 2>/dev/null || echo '{}')

# Parse results
LINT_ERRORS=$(echo "$RESULT" | node -e "
  try {
    const r=JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8'));
    const repos=r.repos||{};
    const total=Object.values(repos).reduce((s,v)=>s+(v.lint?.errors||0),0);
    console.log(total);
  } catch { console.log(0); }
" 2>/dev/null || echo 0)

DRIFT_ISSUES=$(echo "$RESULT" | node -e "
  try {
    const r=JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8'));
    const repos=r.repos||{};
    const total=Object.values(repos).reduce((s,v)=>{
      const d=v.drift||{};
      return s+(d.added?.length||0)+(d.removed?.length||0)+(d.stale?.length||0)+(d.staleDataFlowRefs?.length||0);
    },0);
    console.log(total);
  } catch { console.log(0); }
" 2>/dev/null || echo 0)

TOTAL=$((LINT_ERRORS + DRIFT_ISSUES))

if [ "$TOTAL" -gt 0 ]; then
  echo "Documentation drift detected: ${LINT_ERRORS} lint error(s), ${DRIFT_ISSUES} drift issue(s). Run /doc-sync to update docs." >&2
  exit 1
fi

exit 0
