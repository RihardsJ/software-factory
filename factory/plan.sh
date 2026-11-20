#!/usr/bin/env bash
# Plans the current line of work: idea -> stories -> intel -> tickets.
# Each document is linted and reviewed before the next step reads it.
# It stops for you only when the stories have open questions.
# Run it again after a stop; it continues from what is on disk.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

use_current_line
L="$line_dir"
[ -s "$L/idea.md" ] || fail "$L has no idea yet. Run: factory idea"
say "Line: $L"

outside_before="$(changes_outside work)"

# Each role may write only under work/.
stayed_inside() {
  [ "$(changes_outside work)" = "$outside_before" ] \
    || fail "the $1 changed files outside work/. Inspect with: git status"
}

tickets_exist() {
  ls "$L"/tickets/[0-9][0-9][0-9]-*.md > /dev/null 2>&1
}

# --- Gate: the idea. Judged again whenever it changed after its last review.
if [ ! -s "$L/idea.review.md" ] || [ "$L/idea.md" -nt "$L/idea.review.md" ]; then
  say "Checking the idea"
  judge idea-review lint_idea "$L/idea.review.md" "Starting point: $(cat "$L/request.md" 2>/dev/null || echo "not recorded. Skip the faithful check and judge the idea as written.")" || true
fi
if ! grep -q '^Verdict: pass$' "$L/idea.review.md"; then
  cat "$L/idea.review.md"
  fail "the idea is not ready for stories. Fix what the findings name in $L/idea.md, or run 'factory idea' to have it reworked, then run this again."
fi

# --- Stories, with their gate.
if [ ! -s "$L/stories.md" ]; then
  feedback=""
  passed=no
  for round in $(seq 1 "$rounds"); do
    agent strategist-stories "$writer" "$feedback"
    stayed_inside strategist
    require_file "$L/stories.md" "the strategist"
    require_line "$L/stories.md" '^Status: draft$' "The stories must start as a draft."
    require_line "$L/stories.md" '^## S[0-9]+ .*\((Must|Should|Could|Won.t)\)$' "Every story needs a MoSCoW rank."
    require_line "$L/stories.md" '^## Open questions$' "Stories must say whether anything is still open."

    if judge stories-review lint_stories "$L/stories.review.md"; then
      passed=yes
      break
    fi
    feedback="A review of your last draft found these problems. Edit $L/stories.md in place to fix every one:

$(cat "$L/stories.review.md")"
  done
  if [ "$passed" != yes ]; then
    commit_paths "factory($(line_name)): draft stories, review failed" work
    cat "$L/stories.review.md"
    fail "the stories did not pass their review after $rounds rounds. Fix $L/stories.md by hand, or delete it to draft again."
  fi

  # The person already checked the idea. Stories with nothing left to ask add
  # no new decisions, so only an open question needs them back.
  questions="$(open_items "$L/stories.md" "Open questions")"
  if [ -z "$questions" ] && [ "${FACTORY_APPROVE:-auto}" = auto ]; then
    sed -i.bak 's/^Status: draft$/Status: approved/' "$L/stories.md"
    rm -f "$L/stories.md.bak"
    commit_paths "factory($(line_name)): stories, reviewed and approved with no open questions" work
    say "Stories passed review and have no open questions, so they are approved. Continuing."
  else
    commit_paths "factory($(line_name)): draft stories" work
    say "Stories drafted in $L/stories.md. They need you before anything is built."
    [ -z "$questions" ] || printf 'Open questions:\n%s\n\n' "$questions"
    echo "Edit the file, answer the questions and set them to 'None.', then change"
    echo "'Status: draft' to 'Status: approved' and run this again."
    exit 0
  fi
fi

# No approval is never read as approval.
if ! grep -q '^Status: approved$' "$L/stories.md"; then
  fail "$L/stories.md is not approved. Change 'Status: draft' to 'Status: approved' when you agree with it."
fi

# --- Intel.
if [ ! -s "$L/intel.md" ]; then
  agent scout "$writer"
  stayed_inside scout
  require_file "$L/intel.md" "the scout"
  require_line "$L/intel.md" '^Check command: `.+`$' "The scout found no check command in the project's AGENTS.md or CLAUDE.md."
  commit_paths "factory($(line_name)): intel" work
fi

# --- Tickets, with their gate.
if tickets_exist; then
  say "Tickets already exist in $L/tickets/. Delete them to plan again, or run: factory build"
  exit 0
fi

mkdir -p "$L/tickets"
feedback=""
passed=no
for round in $(seq 1 "$rounds"); do
  agent strategist-tickets "$writer" "$feedback"
  stayed_inside strategist

  tickets_exist || fail "the strategist wrote no tickets."
  for ticket in "$L"/tickets/[0-9][0-9][0-9]-*.md; do
    require_line "$ticket" '^Status: todo$' "Every ticket starts as todo."
    require_line "$ticket" '^Story: S[0-9]+' "Every ticket names its story."
    require_line "$ticket" '^- \[ \] WHEN .* THEN ' "Every ticket needs WHEN/THEN lines under Done when."
  done

  if judge ticket-review lint_tickets "$L/tickets/review.md"; then
    passed=yes
    break
  fi
  feedback="A review of your earlier draft found these problems. The draft tickets are in $L/tickets/. Edit them in place to fix every finding; do not create duplicates.

$(cat "$L/tickets/review.md")"
done

commit_paths "factory($(line_name)): tickets" work
count="$(ls "$L"/tickets/[0-9][0-9][0-9]-*.md | wc -l | tr -d ' ')"
if [ "$passed" != yes ]; then
  cat "$L/tickets/review.md"
  fail "$count tickets were written but did not pass their review after $rounds rounds. 'factory build' will refuse them. Fix the tickets the findings name, then set the first line of $L/tickets/review.md to 'Verdict: pass'."
fi

say "Tickets written and reviewed: $count"
echo "Read $L/tickets/ if you want to, then run: factory build"
