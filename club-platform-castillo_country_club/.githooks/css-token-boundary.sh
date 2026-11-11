#!/usr/bin/env bash
# G10 Ola 0.3 — fuga de sintaxis governance en staged CSS/TS
FAILED=0
for f in "$@"; do
  if grep -qE "var\(--(font|color)-\*\)" "$f" 2>/dev/null; then
    echo "::error:: $f contiene var(--font-*/--color-*) crudo (fuga de governance al output)"
    FAILED=1
  fi
done
exit $FAILED
