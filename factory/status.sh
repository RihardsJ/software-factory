#!/usr/bin/env bash
# Shows where the project stands: each document, its gate, the tickets, and
# what the factory is doing right now. Usage: factory/status.sh [--watch]
set -euo pipefail
FACTORY_LOOK_ONLY=1
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

verdict() {
  if [ ! -s "$1" ]; then
    echo "not reviewed"
  elif grep -q '^Verdict: pass$' "$1"; then
    echo "review passed"
  else
    echo "REVIEW FAILED, see $1"
  fi
}

count() {
  grep -l "^Status: $1\$" tickets/[0-9][0-9][0-9]-*.md 2>/dev/null | wc -l | tr -d ' '
}

show() {
  echo "Factory $(sed -n 's/^version=//p' "$factory_dir/.installed" 2>/dev/null)   project: $(basename "$project_dir")"
  echo

  if [ -s specs/idea.md ]; then
    printf '  %-9s %s assumptions, %s undecided; %s\n' "Idea" \
      "$(open_items specs/idea.md Assumptions | wc -l | tr -d ' ')" \
      "$(open_items specs/idea.md Undecided | wc -l | tr -d ' ')" "$(verdict specs/idea.review.md)"
  else
    printf '  %-9s %s\n' "Idea" "none yet. Run: factory idea \"<what you want>\""
  fi

  if [ -s specs/stories.md ]; then
    printf '  %-9s %s; %s stories, %s open questions; %s\n' "Stories" \
      "$(sed -n 's/^Status: //p' specs/stories.md | head -1)" \
      "$(grep -c -E '^## S[0-9]+ ' specs/stories.md)" \
      "$(open_items specs/stories.md "Open questions" | wc -l | tr -d ' ')" "$(verdict specs/stories.review.md)"
  else
    printf '  %-9s %s\n' "Stories" "none yet"
  fi

  printf '  %-9s %s\n' "Intel" "$(sed -n 's/^Check command: /check command /p' specs/intel.md 2>/dev/null | head -1 | grep . || echo "none yet")"

  if ls tickets/[0-9][0-9][0-9]-*.md > /dev/null 2>&1; then
    printf '  %-9s %s done, %s to do, %s blocked; %s\n' "Tickets" "$(count done)" "$(count todo)" "$(count blocked)" "$(verdict tickets/review.md)"
    for ticket in tickets/[0-9][0-9][0-9]-*.md; do
      case "$(sed -n 's/^Status: //p' "$ticket" | head -1)" in
        done) mark="[x]" ;;
        blocked) mark="[!]" ;;
        *) mark="[ ]" ;;
      esac
      echo "            $mark $(sed -n '1s/^# //p' "$ticket")"
    done
  else
    printf '  %-9s %s\n' "Tickets" "none yet"
  fi
  echo

  local active latest
  active="$(cat "$factory_dir/runs/.active" 2>/dev/null || true)"
  if [ -n "$active" ] && kill -0 "${active%% *}" 2> /dev/null; then
    echo "  Running now: $(echo "$active" | cut -d' ' -f2)"
  else
    echo "  Nothing is running."
  fi

  latest="$(ls -d "$factory_dir"/runs/*/ 2>/dev/null | tail -1 || true)"
  if [ -n "$latest" ] && [ -s "$latest/events.log" ]; then
    echo "  Latest run: ${latest#"$project_dir"/}"
    tail -12 "$latest/events.log" | sed 's/^/    /'
    echo
    echo "  Each agent reply and check output from that run is a file in that folder."
  fi
  echo "  Documents: specs/idea.md  specs/stories.md  specs/intel.md  tickets/"
}

if [ "${1:-}" = "--watch" ]; then
  while :; do
    clear
    show
    echo
    echo "  Refreshing every 3 seconds. Ctrl+C to stop."
    sleep 3
  done
else
  show
fi
