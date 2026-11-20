#!/usr/bin/env bash
# The Ralph loop, for the current line of work: the same builder prompt, run again and again in a fresh
# context, one ticket per run, with the project's check command as backpressure.
# What earlier runs did is on disk: the tickets, work/memory.md and Git.
# When no ticket is left, an auditor uses the result as a user would; any gap
# becomes a new ticket and the loop goes on. It ends when the audit accepts the
# work, a ticket is blocked, or a cap is reached. Accepted work is then documented.
# Usage: factory/build.sh [max-tickets]
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

max_tickets="${1:-${FACTORY_MAX_TICKETS:-25}}"
max_attempts="${FACTORY_MAX_ATTEMPTS:-3}"
max_audits="${FACTORY_MAX_AUDITS:-2}"
builder_tools="$writer,Bash"
auditor_tools="$read_only,Bash"
reviewer_tools="$read_only,Bash(git diff:*),Bash(git status:*),Bash(git log:*),Bash(git show:*)"

use_current_line
L="$line_dir"
say "Line: $L"

check="$(check_command)"
[ -n "$check" ] || fail "no check command. Run 'factory plan' first, or set FACTORY_CHECK."
[ -z "$(git status --porcelain)" ] || fail "the working tree has uncommitted changes. Commit or stash them first."

# Tickets that failed their review are not built.
grep -q '^Verdict: pass$' "$L/tickets/review.md" 2>/dev/null \
  || fail "the tickets of $L have not passed their review. See $L/tickets/review.md, or run: factory plan"

run_check() {
  step=$((step + 1))
  check_log="$run_dir/$(printf '%02d' "$step")-check.log"
  bash -c "$check" > "$check_log" 2>&1
}

tickets_with() {
  grep -l "^Status: $1\$" "$L"/tickets/[0-9][0-9][0-9]-*.md 2>/dev/null | sort || true
}

# The auditor uses the finished work as a user would. Returns 0 when it accepts
# it; otherwise it writes the gaps as a new ticket for the loop to build.
audit() {
  local number gaps
  agent auditor "$auditor_tools" "" "$no_reach"
  # An auditor only looks. Anything it left behind is removed.
  if [ -n "$(git status --porcelain)" ]; then
    git reset --quiet --hard HEAD
    git clean --quiet -fd
    note "the auditor changed files; they were restored"
  fi
  cp "$last_log" "$L/acceptance.md"
  if grep -q '^Verdict: accepted$' "$L/acceptance.md"; then
    commit_paths "factory($(line_name)): accepted against the idea" work
    return 0
  fi

  gaps="$(grep -E '^- \[ \] WHEN .* THEN ' "$L/acceptance.md" || true)"
  [ -n "$gaps" ] || fail "the audit did not accept the work and named no checkable gap. Read $L/acceptance.md."
  number="$(printf '%03d' $(( 10#$(ls "$L"/tickets/[0-9][0-9][0-9]-*.md | sed 's|.*/||; s|-.*||' | sort | tail -1) + 1 )))"
  cat > "$L/tickets/$number-close-acceptance-gaps.md" <<EOF
# $number Close acceptance gaps

Status: todo
Story: acceptance audit
Depends on: none

## Why

Every ticket was built and passed its checks, but using the result as a user would showed it does not yet do everything the idea says.

## Change

Each behaviour below was expected from $L/idea.md and was not observed. Make each one true. The full audit, with what was observed instead, is in $L/acceptance.md.

## Done when

$gaps

## Out of scope

- Anything the audit did not name.
EOF
  commit_paths "factory($(line_name)): audit found gaps" work
  note "audit: $(echo "$gaps" | wc -l | tr -d ' ') gap(s), written as ticket $number"
  return 1
}

# A check that is red before any work can never be turned green by a builder.
say "Preflight: $check"
run_check || fail "the check command fails before any work has started. Fix the project, or set FACTORY_CHECK to a command this machine can run. Output: $check_log"

built=0
audits=0
accepted_whole=unknown
while [ "$built" -lt "$max_tickets" ]; do
  ticket="$(tickets_with todo | head -1)"
  if [ -z "$ticket" ]; then
    # Each ticket passed alone. Whether the whole does what was asked is a separate question.
    if [ "$audits" -ge "$max_audits" ]; then
      break
    fi
    audits=$((audits + 1))
    say "No tickets left. Auditing the result against the idea ($audits of $max_audits)"
    if audit; then
      accepted_whole=yes
      break
    fi
    accepted_whole=no
    continue
  fi
  title="$(sed -n '1s/^# //p' "$ticket")"
  say "Ticket: $title"

  feedback=""
  accepted=no
  attempt=0
  while [ "$attempt" -lt "$max_attempts" ]; do
    attempt=$((attempt + 1))
    head_before="$(git rev-parse HEAD)"
    agent builder "$builder_tools" "Ticket: $ticket
Attempt: $attempt of $max_attempts
$feedback" "$no_reach"

    # The agent proposes; these checks decide.
    if [ "$(git rev-parse HEAD)" != "$head_before" ]; then
      git reset --quiet --soft "$head_before"
      note "the builder committed; the commit was undone and its changes kept"
    fi

    protected="$(git status --porcelain --untracked-files=all -- work factory | cut -c4- | grep -v '^work/memory\.md$' || true)"
    if [ -n "$protected" ]; then
      git reset --quiet -- work factory
      git checkout --quiet HEAD -- work factory 2>/dev/null || true
      git clean --quiet -fd -- work factory
      feedback="Your last attempt changed files you must never touch, so they were restored:
$protected"
      note "rejected: protected files changed"
      continue
    fi

    if [ -z "$(git status --porcelain)" ]; then
      feedback="Your last attempt changed no files. The ticket is not done."
      note "rejected: nothing changed"
      continue
    fi

    if ! run_check; then
      feedback="The project's check command exited with a failure after your last attempt. Fix the cause. The end of its output:

$(tail -c 4000 "$check_log")"
      note "rejected: check command failed"
      continue
    fi

    git add --all
    agent reviewer "$reviewer_tools" "Ticket: $ticket"
    if grep -q '^Verdict: approved$' "$last_log"; then
      accepted=yes
      break
    fi
    feedback="A reviewer read your last attempt and did not approve it. Fix every item:

$(cat "$last_log")"
    note "rejected: reviewer asked for changes"
  done

  if [ "$accepted" = yes ]; then
    sed -i.bak -e 's/^Status: todo$/Status: done/' -e 's/^- \[ \] /- [x] /' "$ticket"
    rm -f "$ticket.bak"
    git add --all
    git commit --quiet --message "factory($(line_name)): $title"
    built=$((built + 1))
    say "Done: $title  ($(git rev-parse --short HEAD))"
  else
    # Unaccepted work is thrown away so the next ticket starts from a green tree.
    git reset --quiet --hard HEAD
    git clean --quiet -fd
    sed -i.bak 's/^Status: todo$/Status: blocked/' "$ticket"
    rm -f "$ticket.bak"
    printf '\n## Blocked\n\nNot accepted after %s attempts. Last feedback:\n\n%s\n' "$max_attempts" "$feedback" >> "$ticket"
    git add --all
    git commit --quiet --message "factory($(line_name)): block $title"
    fail "$title was not accepted after $max_attempts attempts. It is marked blocked with the reason. Replies and check output: $run_dir"
  fi
done

remaining="$(tickets_with todo | wc -l | tr -d ' ')"
say "Built $built ticket(s) this run. Remaining: $remaining"

# Accepted work is written up: the project's own documentation, and a summary
# of the line that later questions can be answered from.
if [ "$accepted_whole" = yes ] && [ ! -s "$L/summary.md" ]; then
  agent documenter "$writer"
  touched="$(git status --porcelain --untracked-files=all | cut -c4- | grep -v '\.md$' || true)"
  outside="$(git status --porcelain --untracked-files=all -- work factory | cut -c4- | grep -v "^$L/summary\.md\$" || true)"
  if [ -n "$touched$outside" ] || ! run_check; then
    git reset --quiet --hard HEAD
    git clean --quiet -fd
    note "documentation rejected: it changed more than documentation, or the check failed. Nothing was kept."
  else
    git add --all
    git diff --cached --quiet || git commit --quiet --message "factory($(line_name)): document what was built"
    note "documentation updated; summary in $L/summary.md"
  fi
fi

case "$accepted_whole" in
  yes) echo "The audit accepted the result against the idea. See $L/acceptance.md." ;;
  no)
    if [ "$remaining" = 0 ]; then
      echo "The last audit found gaps and a ticket to close them was built, but the cap of $max_audits audits was reached before the result could be audited again. Run 'factory build' to audit it once more."
    else
      echo "The audit found gaps. They are in $L/acceptance.md and in the ticket still to do."
    fi
    ;;
  *) [ "$remaining" = 0 ] || echo "Stopped at the cap of $max_tickets. Run 'factory build' again to continue." ;;
esac
