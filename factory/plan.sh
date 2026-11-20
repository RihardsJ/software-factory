#!/usr/bin/env bash
# Idea (see idea.sh) -> stories -> (your approval) -> intel -> tickets -> ticket review.
# Run it again after each stop; it continues from what is on disk.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

read_only="Read,Glob,Grep"
writer="Read,Glob,Grep,Write,Edit"

# An untouched template is not an idea yet.
if [ ! -s specs/idea.md ] || cmp -s specs/idea.md "$factory_dir/templates/idea.md"; then
  mkdir -p specs
  cp "$factory_dir/templates/idea.md" specs/idea.md
  say "There is no idea yet."
  echo "Run: factory idea \"<what you want, in a sentence>\"   to have it refined and written for you,"
  echo "or fill in specs/idea.md by hand. Then run this again."
  exit 0
fi

outside_before="$(changes_outside specs tickets)"

# Each role may write only under specs/ and tickets/.
stayed_inside() {
  [ "$(changes_outside specs tickets)" = "$outside_before" ] \
    || fail "the $1 changed files outside specs/ and tickets/. Inspect with: git status"
}

if [ ! -s specs/stories.md ]; then
  agent strategist-stories "$writer"
  stayed_inside strategist
  require_file specs/stories.md "the strategist"
  require_line specs/stories.md '^Status: draft$' "The stories must start as a draft."
  require_line specs/stories.md '^## S[0-9]+ .*\((Must|Should|Could|Won.t)\)$' "Every story needs a MoSCoW rank."
  require_line specs/stories.md '^- \[ \] WHEN .* THEN ' "Stories need WHEN/THEN acceptance lines."
  commit_paths "factory: draft stories" specs
  say "Stories drafted in specs/stories.md."
  echo "Read them, edit what is wrong, answer the open questions, then change"
  echo "'Status: draft' to 'Status: approved' and run this again."
  exit 0
fi

# No approval is never read as approval.
if ! grep -q '^Status: approved$' specs/stories.md; then
  fail "specs/stories.md is not approved. Change 'Status: draft' to 'Status: approved' when you agree with it."
fi

if [ ! -s specs/intel.md ]; then
  agent scout "$writer"
  stayed_inside scout
  require_file specs/intel.md "the scout"
  require_line specs/intel.md '^Check command: `.+`$' "The scout found no check command in the project's AGENTS.md or CLAUDE.md."
  commit_paths "factory: intel" specs
fi

if ls tickets/[0-9][0-9][0-9]-*.md > /dev/null 2>&1; then
  say "Tickets already exist in tickets/. Delete them to plan again, or run factory/build.sh."
  exit 0
fi

mkdir -p tickets
review=""
for round in 1 2; do
  agent strategist-tickets "$writer" "$review"
  stayed_inside strategist

  ls tickets/[0-9][0-9][0-9]-*.md > /dev/null 2>&1 || fail "the strategist wrote no tickets."
  for ticket in tickets/[0-9][0-9][0-9]-*.md; do
    require_line "$ticket" '^Status: todo$' "Every ticket starts as todo."
    require_line "$ticket" '^Story: S[0-9]+' "Every ticket names its story."
    require_line "$ticket" '^- \[ \] WHEN .* THEN ' "Every ticket needs WHEN/THEN lines under Done when."
  done

  # A fresh run that did not write the tickets judges them.
  agent ticket-review "$read_only"
  cp "$last_log" tickets/review.md
  if grep -q '^Verdict: pass$' tickets/review.md; then
    break
  fi
  [ "$round" = 2 ] || say "The review found problems. Asking the strategist to fix them."
  review="A reviewer read your earlier draft and found these problems. The draft tickets are in tickets/. Edit them in place to fix every finding; do not create duplicates.

$(cat tickets/review.md)"
done

commit_paths "factory: tickets" specs tickets
say "Tickets written: $(ls tickets/[0-9][0-9][0-9]-*.md | wc -l | tr -d ' ')"
grep -m1 '^Verdict: ' tickets/review.md || echo "The ticket review gave no verdict. Read tickets/review.md."
echo "Read tickets/ and tickets/review.md, then run factory/build.sh."
