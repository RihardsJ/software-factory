#!/usr/bin/env bash
# Builds tickets one at a time, each in fresh agent runs, until none are left
# or a cap is reached. Usage: factory/build.sh [max-tickets]
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

max_tickets="${1:-${FACTORY_MAX_TICKETS:-3}}"
max_attempts="${FACTORY_MAX_ATTEMPTS:-3}"
builder_tools="Read,Glob,Grep,Write,Edit,Bash"
reviewer_tools="Read,Glob,Grep,Bash(git diff:*),Bash(git status:*),Bash(git log:*),Bash(git show:*)"

check="$(check_command)"
[ -n "$check" ] || fail "no check command. Run factory/plan.sh first, or set FACTORY_CHECK."
[ -z "$(git status --porcelain)" ] || fail "the working tree has uncommitted changes. Commit or stash them first."

run_check() {
  step=$((step + 1))
  check_log="$run_dir/$(printf '%02d' "$step")-check.log"
  bash -c "$check" > "$check_log" 2>&1
}

# A check that is red before any work can never be turned green by a builder.
say "Preflight: $check"
run_check || fail "the check command fails before any work has started. Fix the project, or set FACTORY_CHECK to a command this machine can run. Output: $check_log"

built=0
while [ "$built" -lt "$max_tickets" ]; do
  ticket="$(grep -l '^Status: todo$' tickets/[0-9][0-9][0-9]-*.md 2>/dev/null | sort | head -1 || true)"
  if [ -z "$ticket" ]; then
    say "No tickets left to build."
    break
  fi
  title="$(sed -n '1s/^# //p' "$ticket")"
  say "Ticket: $title"

  feedback=""
  accepted=no
  attempt=0
  while [ "$attempt" -lt "$max_attempts" ]; do
    attempt=$((attempt + 1))
    agent builder "$builder_tools" "Ticket: $ticket
Attempt: $attempt of $max_attempts
$feedback"

    # The agent proposes; these checks decide.
    protected="$(git status --porcelain --untracked-files=all -- specs factory tickets | cut -c4- | grep -v '^tickets/memory\.md$' || true)"
    if [ -n "$protected" ]; then
      git checkout --quiet HEAD -- specs factory tickets 2>/dev/null || true
      git clean --quiet -fd -- specs factory tickets
      feedback="Your last attempt changed files you must never touch, so they were restored:
$protected"
      echo "   rejected: protected files changed"
      continue
    fi

    if [ -z "$(git status --porcelain)" ]; then
      feedback="Your last attempt changed no files. The ticket is not done."
      echo "   rejected: nothing changed"
      continue
    fi

    if ! run_check; then
      feedback="The project's check command exited with a failure after your last attempt. Fix the cause. The end of its output:

$(tail -c 4000 "$check_log")"
      echo "   rejected: check command failed"
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
    echo "   rejected: reviewer asked for changes"
  done

  if [ "$accepted" = yes ]; then
    sed -i.bak -e 's/^Status: todo$/Status: done/' -e 's/^- \[ \] /- [x] /' "$ticket"
    rm -f "$ticket.bak"
    git add --all
    git commit --quiet --message "factory: $title"
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
    git commit --quiet --message "factory: block $title"
    fail "$title was not accepted after $max_attempts attempts. It is marked blocked with the reason. Replies and check output: $run_dir"
  fi
done

say "Built $built ticket(s) this run. Remaining: $(grep -l '^Status: todo$' tickets/[0-9][0-9][0-9]-*.md 2>/dev/null | wc -l | tr -d ' ')"
