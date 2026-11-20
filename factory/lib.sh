#!/usr/bin/env bash
# Shared by the factory's scripts. The scripts own the order of steps, the
# checks and the decision that work is done; an agent only works inside one step.

factory_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
project_dir="$(cd "$factory_dir/.." && pwd)"
cd "$project_dir"

read_only="Read,Glob,Grep"
writer="Read,Glob,Grep,Write,Edit"
step=0
rounds="${FACTORY_REVIEW_ROUNDS:-3}"

# Commands no role has a reason to run: publishing, changing where Git points,
# and reaching other machines. This is a deny list, not a sandbox.
no_reach="Bash(git push:*),Bash(git remote:*),Bash(git config:*),Bash(gh:*),Bash(sudo:*),Bash(ssh:*),Bash(scp:*)"
last_log=""
run_dir=""

# status.sh only looks; every other script records a run it can be watched by.
if [ -z "${FACTORY_LOOK_ONLY:-}" ]; then
  run_dir="$factory_dir/runs/$(date +%Y%m%d-%H%M%S)"
  mkdir -p "$run_dir"
  echo "$$ $(basename "$0" .sh) $run_dir" > "$factory_dir/runs/.active"
  trap 'rm -f "$factory_dir/runs/.active"' EXIT
fi

event() {
  [ -z "$run_dir" ] || echo "$(date +%H:%M:%S) $*" >> "$run_dir/events.log"
}
say() { printf '\n== %s\n' "$*"; event "$*"; }
note() { echo "   $*"; event "  $*"; }
fail() { echo "factory: $*" >&2; event "STOPPED: $*"; exit 1; }

# agent <role> <allowed tools> [inputs] [denied tools]
# Runs one role in a fresh context. Its reply lands in $last_log.
agent() {
  local role="$1" tools="$2" inputs="${3:-}" denied="${4:-}" prompt
  prompt="$(cat "$factory_dir/prompts/$role.md")"
  if [ -n "$inputs" ]; then
    prompt="$prompt

## Inputs for this run

$inputs"
  fi

  step=$((step + 1))
  last_log="$run_dir/$(printf '%02d' "$step")-$role.md"
  say "$role  (reply: ${last_log#"$project_dir"/})"

  local args=(-p "$prompt" --allowedTools "$tools" --max-budget-usd "${FACTORY_BUDGET_USD:-5}")
  [ -z "${FACTORY_MODEL:-}" ] || args+=(--model "$FACTORY_MODEL")
  [ -z "$denied" ] || args+=(--disallowedTools "$denied")

  # An agent run gets no GitHub or Git credentials, so even a command that
  # slips past the deny list cannot publish anything.
  # Warnings go to their own file so a reply holds only what the role said.
  mkdir -p "$run_dir/.no-credentials"
  if ! env GH_CONFIG_DIR="$run_dir/.no-credentials" GH_TOKEN= GITHUB_TOKEN= \
      GIT_TERMINAL_PROMPT=0 GIT_SSH_COMMAND=false \
      GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=credential.helper GIT_CONFIG_VALUE_0= \
      "${FACTORY_AGENT:-claude}" "${args[@]}" < /dev/null > "$last_log" 2> "$last_log.err"; then
    tail -5 "$last_log" "$last_log.err" >&2
    fail "the $role run did not finish. See $last_log"
  fi
}

# judge <reviewer role> <lint function> <review file> [reviewer inputs]
# A document moves on only after a mechanical lint and then a reviewer in a
# fresh context both pass it. Lint runs first because it is free.
judge() {
  local role="$1" lint="$2" file="$3" inputs="${4:-}" findings
  findings="$("$lint")"
  if [ -n "$findings" ]; then
    printf 'Verdict: fail\n\n## Findings\n\n%s\n' "$findings" > "$file"
    note "lint: $(echo "$findings" | wc -l | tr -d ' ') problem(s)"
    return 1
  fi
  note "lint: clean"
  agent "$role" "$read_only" "$inputs"
  cp "$last_log" "$file"
  if grep -q '^Verdict: pass$' "$file"; then
    note "review: pass"
  else
    note "review: fail"
    return 1
  fi
}

# Lines under one "## heading" of a Markdown file.
section() {
  awk -v heading="## $2" '$0 == heading { inside = 1; next } /^## / { inside = 0 } inside && NF' "$1"
}

# Bullets under a heading, leaving out a lone "None."
open_items() {
  section "$1" "$2" | grep '^- ' | grep -v -i -E '^- none\.?$' || true
}

idea_sections="What it is|Why|What a user can do|Rules|Done means|Out of scope|Assumptions|Undecided"

lint_idea() {
  local name vague
  echo "$idea_sections" | tr '|' '\n' | while IFS= read -r name; do
    [ -n "$(section specs/idea.md "$name")" ] || echo "- The section \"$name\" is missing or empty."
  done
  grep -n -E '^(- )?<[A-Za-z]' specs/idea.md | sed 's/^/- A template placeholder is still in the file, at line /' || true
  if [ "$(open_items specs/idea.md Undecided | wc -l | tr -d ' ')" -gt 3 ]; then
    echo "- More than three things are Undecided. Decide the ones with a conventional answer and list them under Assumptions."
  fi
  for name in "What a user can do" "Rules" "Done means"; do
    vague="$(section specs/idea.md "$name" | grep -i -w -o -E 'sensible|appropriate|reasonable|user-friendly|intuitive|as needed|if needed|etc|TBD|and so on|some kind of' | sort -u | tr '\n' ' ' || true)"
    [ -z "$vague" ] || echo "- \"$name\" uses words that cannot be checked: $vague. Replace each with a real value or result."
  done
}

lint_stories() {
  grep -o -E '^## S[0-9]+' specs/stories.md | sort | uniq -d | sed 's/^## /- This story number is used twice: /' || true
  awk '
    /^## S[0-9]+ / { if (title != "" && lines == 0) print "- This story has no WHEN/THEN acceptance line: " title; title = $0; lines = 0; next }
    /^## /         { if (title != "" && lines == 0) print "- This story has no WHEN/THEN acceptance line: " title; title = "" }
    /^- \[ \] WHEN .* THEN / { lines++ }
    END            { if (title != "" && lines == 0) print "- This story has no WHEN/THEN acceptance line: " title }
  ' specs/stories.md
  grep -n '^- \[ \] ' specs/stories.md | grep -v -E 'WHEN .* THEN ' | sed 's/^/- This acceptance line is not in the WHEN ... THEN ... form, at line /' || true
}

# Acceptance lines of Must and Should stories: the lines tickets must carry.
required_lines() {
  awk '/^## S[0-9]+ / { keep = ($0 ~ /\((Must|Should)\)$/) } /^## [^S]/ { keep = 0 } keep && /^- \[ \] WHEN /' specs/stories.md
}

lint_tickets() {
  local line count ticket number dependency
  required_lines | while IFS= read -r line; do
    count="$(cat tickets/[0-9][0-9][0-9]-*.md | grep -c -x -F -- "$line" || true)"
    [ "$count" = 1 ] || echo "- This line from specs/stories.md appears $count times across the tickets. It must appear exactly once, word for word: $line"
  done
  for ticket in tickets/[0-9][0-9][0-9]-*.md; do
    number="${ticket#tickets/}"
    number="${number%%-*}"
    for dependency in $(sed -n 's/^Depends on: //p' "$ticket" | grep -o -E '[0-9]{3}' || true); do
      [ "$((10#$dependency))" -lt "$((10#$number))" ] || echo "- $ticket depends on $dependency, which is not an earlier ticket."
      ls tickets/"$dependency"-*.md > /dev/null 2>&1 || echo "- $ticket depends on $dependency, which does not exist."
    done
  done
}

# Paths with uncommitted changes outside the folders given as arguments.
changes_outside() {
  local allowed
  allowed="$(printf '%s|' "$@")"
  git status --porcelain --untracked-files=all | cut -c4- | grep -v -E "^(${allowed%|})/" || true
}

require_file() {
  [ -s "$1" ] || fail "$2 did not write $1."
}

require_line() {
  grep -q -E "$2" "$1" || fail "$1 has no line matching '$2'. $3"
}

# The project names its check command; the scout copies it into intel.
# FACTORY_CHECK overrides it for a machine that cannot run the full command.
check_command() {
  if [ -n "${FACTORY_CHECK:-}" ]; then
    echo "$FACTORY_CHECK"
  else
    sed -n 's/^Check command: `\(.*\)`$/\1/p' specs/intel.md 2>/dev/null | head -1
  fi
}

commit_paths() {
  local message="$1"
  shift
  git add --all -- "$@"
  git diff --cached --quiet || git commit --quiet --message "$message"
}
