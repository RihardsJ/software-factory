#!/usr/bin/env bash
# One command from a request to built, audited and documented work.
# Usage: factory/run.sh [--bug] [what you want, or what is wrong]
#   with text: opens a new line, a feature by default or a bug with --bug
#   without text: carries on with the current line
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ "${1:-}" = "--bug" ] && [ $# -lt 2 ]; then
  echo "factory: say what is wrong: factory fix \"<what was expected, and what happens instead>\"" >&2
  exit 1
fi

# Each step stops the chain if its gate fails.
if [ $# -gt 0 ]; then
  "$here/idea.sh" "$@"
fi
"$here/plan.sh"

line="$(FACTORY_LOOK_ONLY=1 bash -c 'source "$1/lib.sh"; current_line' _ "$here")"
if [ -n "$line" ] && grep -q '^Verdict: pass$' "$line/tickets/review.md" 2> /dev/null; then
  exec "$here/build.sh"
fi
echo "Planning stopped before the tickets were ready, so nothing was built. See above."
