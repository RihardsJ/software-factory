#!/usr/bin/env bash
# Shows every line of work, then the current one in detail: its documents,
# their gates, its tickets, and what the factory is doing right now.
# Usage: factory/status.sh [--watch]
set -euo pipefail
FACTORY_LOOK_ONLY=1
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

verdict() {
  if [ ! -s "$1" ]; then
    echo "not reviewed"
  elif grep -q -E '^Verdict: (pass|accepted)$' "$1"; then
    echo "review passed"
  else
    echo "REVIEW FAILED, see $1"
  fi
}

count() {
  grep -l "^Status: $2\$" "$1"/tickets/[0-9][0-9][0-9]-*.md 2>/dev/null | wc -l | tr -d ' '
}

# One word for where a line stands.
stage() {
  if line_accepted "$1"; then echo "accepted"
  elif [ "$(count "$1" blocked)" != 0 ]; then echo "blocked"
  elif ls "$1"/tickets/[0-9][0-9][0-9]-*.md > /dev/null 2>&1; then echo "building ($(count "$1" done) of $(ls "$1"/tickets/[0-9][0-9][0-9]-*.md | wc -l | tr -d ' ') tickets)"
  elif [ -s "$1/stories.md" ]; then echo "planning"
  elif [ -s "$1/idea.md" ]; then echo "idea"
  else echo "started"
  fi
}

show() {
  local dir current L active latest
  echo "Factory $(sed -n 's/^version=//p' "$factory_dir/.installed" 2>/dev/null)   project: $(basename "$project_dir")"
  echo
  current="$(current_line)"
  if [ -z "$(all_lines)" ]; then
    echo "  No lines of work yet. Start one: factory run \"<what you want>\""
  fi
  for dir in $(all_lines); do
    printf '  %s %-8s %-44s %s\n' "$([ "$dir" = "$current" ] && echo '>' || echo ' ')" \
      "$(basename "$(dirname "$dir")" | sed 's/s$//')" "$(basename "$dir")" "$(stage "$dir")"
  done
  echo

  L="$current"
  if [ -n "$L" ]; then
    echo "  Current line: $L"
    if [ -s "$L/idea.md" ]; then
      printf '    %-9s %s assumptions, %s undecided; %s\n' "Idea" \
        "$(open_items "$L/idea.md" Assumptions | wc -l | tr -d ' ')" \
        "$(open_items "$L/idea.md" Undecided | wc -l | tr -d ' ')" "$(verdict "$L/idea.review.md")"
    fi
    if [ -s "$L/stories.md" ]; then
      printf '    %-9s %s; %s stories, %s open questions; %s\n' "Stories" \
        "$(sed -n 's/^Status: //p' "$L/stories.md" | head -1)" \
        "$(grep -c -E '^## S[0-9]+ ' "$L/stories.md")" \
        "$(open_items "$L/stories.md" "Open questions" | wc -l | tr -d ' ')" "$(verdict "$L/stories.review.md")"
    fi
    [ ! -s "$L/intel.md" ] || printf '    %-9s %s\n' "Intel" "$(sed -n 's/^Check command: /check command /p' "$L/intel.md" | head -1)"
    if ls "$L"/tickets/[0-9][0-9][0-9]-*.md > /dev/null 2>&1; then
      printf '    %-9s %s done, %s to do, %s blocked; %s\n' "Tickets" "$(count "$L" done)" "$(count "$L" todo)" "$(count "$L" blocked)" "$(verdict "$L/tickets/review.md")"
      for ticket in "$L"/tickets/[0-9][0-9][0-9]-*.md; do
        case "$(sed -n 's/^Status: //p' "$ticket" | head -1)" in
          done) mark="[x]" ;;
          blocked) mark="[!]" ;;
          *) mark="[ ]" ;;
        esac
        echo "              $mark $(sed -n '1s/^# //p' "$ticket")"
      done
    fi
    echo
  fi

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
  fi
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
