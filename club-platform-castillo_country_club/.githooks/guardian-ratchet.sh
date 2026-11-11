#!/usr/bin/env bash
# G10 Ola 0.3 — guardian ratchet local (invocado por .pre-commit-config.yaml)
set -o pipefail
cd "$(dirname "$0")/../frontend" || exit 1
pnpm run guardian > /tmp/guardian-hook.log 2>&1
grep -E "errors:|score:" /tmp/guardian-hook.log | head -2
ERRS=$(grep -oE "errors: +[0-9]+" /tmp/guardian-hook.log | grep -oE "[0-9]+" | head -1 | tr -d '[:space:]')
BASE=$(python3 -c "import json;print(json.load(open('../backend/docs/evidence/ci-baseline.json'))['guardian_errors'])")
# ERRS puede venir multilinea si hay varios "errors:" — tomar el primero
ERRS=$(echo "$ERRS" | head -1)
echo "guardian errors=$ERRS baseline=$BASE (ratchet - no puede subir)"
if [ -z "$ERRS" ]; then ERRS=0; fi
[ "$ERRS" -le "$BASE" ]
