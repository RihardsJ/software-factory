#!/usr/bin/env bash
# Turns a rough idea into specs/idea.md, then lints and reviews it.
# Usage: factory/idea.sh [--interview] [your idea in a sentence]
#   with text, or with an idea already in specs/idea.md: refines it headless, asking nothing
#   --interview: opens a session that asks you questions. Nothing else is ever interactive.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

interview=no
if [ "${1:-}" = "--interview" ]; then
  interview=yes
  shift
fi
seed="$*"
mkdir -p specs

# An untouched template is not an idea, and would only confuse the refiner.
if [ -f specs/idea.md ] && cmp -s specs/idea.md "$factory_dir/templates/idea.md"; then
  rm specs/idea.md
fi

# Every step runs headless unless a person asks to be interviewed.
if [ "$interview" != yes ] && [ -z "$seed" ] && [ ! -s specs/idea.md ]; then
  fail "say what you want: factory idea \"<a sentence>\". Add --interview to be asked questions instead."
fi

if [ "$interview" = yes ]; then
  [ -t 0 ] && [ -t 1 ] || fail "there is no terminal to ask questions in. Give the idea as text: factory idea \"<your idea>\""
  prompt="$(cat "$factory_dir/prompts/interviewer.md")

## Inputs for this run

Mode: interview
Starting point: ${seed:-none given}"
  "${FACTORY_AGENT:-claude}" "$prompt" --allowedTools "$writer" || true
  [ -s specs/idea.md ] || fail "no idea was saved. Run this again, or write specs/idea.md by hand."
  say "Idea saved in specs/idea.md. Next: factory plan, which lints and reviews it first."
  exit 0
fi

# What the person asked for, kept so the reviewer can check nothing was lost.
if [ -n "$seed" ]; then
  starting_point="$seed"
else
  starting_point="$(cat specs/idea.md)"
fi

feedback=""
passed=no
for round in $(seq 1 "$rounds"); do
  agent interviewer "$writer" "Mode: refine
Starting point: $starting_point
$feedback"
  require_file specs/idea.md "the idea refiner"

  if judge idea-review lint_idea specs/idea.review.md "Starting point: $starting_point"; then
    passed=yes
    break
  fi
  feedback="
A review of your last draft found these problems. Edit specs/idea.md in place to fix every one:

$(cat specs/idea.review.md)"
done

say "Refined idea, saved in specs/idea.md:"
echo
cat specs/idea.md

if [ "$passed" != yes ]; then
  echo
  cat specs/idea.review.md
  fail "the idea did not pass its review after $rounds rounds. The findings are above and in specs/idea.review.md. Fix specs/idea.md, then run: factory plan"
fi

undecided="$(open_items specs/idea.md Undecided)"
say "The idea passed its lint and review."
echo "Read the Assumptions: each is a decision made for you, the ones you would notice most first."
if [ -n "$undecided" ]; then
  echo "It also needs an answer from you, under Undecided, before planning can finish:"
  echo "$undecided"
fi
echo "Edit specs/idea.md where something is wrong, then run: factory plan"
