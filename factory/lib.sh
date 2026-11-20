#!/usr/bin/env bash
# Shared by plan.sh and build.sh. The scripts own the order of steps, the
# checks and the decision that work is done; an agent only works inside one step.

factory_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
project_dir="$(cd "$factory_dir/.." && pwd)"
cd "$project_dir"

run_dir="$factory_dir/runs/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$run_dir"
step=0
last_log=""

say() { printf '\n== %s\n' "$*"; }
fail() { echo "factory: $*" >&2; exit 1; }

# agent <role> <allowed tools> [inputs]
# Runs one role in a fresh context. Its reply lands in $last_log.
agent() {
  local role="$1" tools="$2" inputs="${3:-}" prompt
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

  # Warnings go to their own file so a reply holds only what the role said.
  if ! "${FACTORY_AGENT:-claude}" "${args[@]}" < /dev/null > "$last_log" 2> "$last_log.err"; then
    tail -5 "$last_log" "$last_log.err" >&2
    fail "the $role run did not finish. See $last_log"
  fi
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
