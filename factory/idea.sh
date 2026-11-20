#!/usr/bin/env bash
# Opens a line of work and turns what was asked into its idea, linted and reviewed.
# Usage: factory/idea.sh [--bug] [--interview] [what you want, or what is wrong]
#   with text: starts a new line, a feature by default or a bug with --bug, and refines it headless
#   without text: refines the idea of the current line again
#   --interview: opens a session that asks you questions. Nothing else is ever interactive.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

kind=feature
interview=no
while [ "${1:-}" = "--bug" ] || [ "${1:-}" = "--interview" ]; do
  [ "$1" = "--bug" ] && kind=bug || interview=yes
  shift
done
seed="$*"

if [ -n "$seed" ]; then
  new_line "$kind" "$seed"
  say "New $kind line: $line_dir"
elif [ "$interview" = yes ]; then
  new_line "$kind" "interview"
else
  line_dir="$(current_line)"
  [ -n "$line_dir" ] && [ -s "$line_dir/idea.md" ] \
    || fail "say what you want: factory idea \"<a sentence>\". Add --bug for something that is wrong, or --interview to be asked questions."
fi
case "$line_dir" in work/bugs/*) kind=bug ;; *) kind=feature ;; esac
idea="$line_dir/idea.md"

if [ "$interview" = yes ]; then
  [ -t 0 ] && [ -t 1 ] || fail "there is no terminal to ask questions in. Give the idea as text: factory idea \"<your idea>\""
  prompt="$(sed "s|{line}|$line_dir|g" "$factory_dir/prompts/interviewer.md")

## Inputs for this run

Line folder: $line_dir
Kind: $kind
Mode: interview
Starting point: ${seed:-none given}"
  "${FACTORY_AGENT:-claude}" "$prompt" --allowedTools "$writer" || true
  [ -s "$idea" ] || fail "no idea was saved. Run this again."
  say "Idea saved in $idea. Next: factory plan, which lints and reviews it first."
  exit 0
fi

# What the person asked for, kept so the reviewer can check nothing was lost.
starting_point="$(cat "$line_dir/request.md" 2>/dev/null || cat "$idea")"

feedback=""
passed=no
for round in $(seq 1 "$rounds"); do
  agent interviewer "$writer" "Kind: $kind
Mode: refine
Starting point: $starting_point
$feedback"
  require_file "$idea" "the idea refiner"

  if judge idea-review lint_idea "$line_dir/idea.review.md" "Starting point: $starting_point"; then
    passed=yes
    break
  fi
  feedback="
A review of your last draft found these problems. Edit $idea in place to fix every one:

$(cat "$line_dir/idea.review.md")"
done

commit_paths "factory($(line_name)): idea" work

say "Refined idea, saved in $idea:"
echo
cat "$idea"

if [ "$passed" != yes ]; then
  echo
  cat "$line_dir/idea.review.md"
  fail "the idea did not pass its review after $rounds rounds. The findings are above and in $line_dir/idea.review.md. Fix $idea, then run: factory plan"
fi

undecided="$(open_items "$idea" Undecided)"
say "The idea passed its lint and review."
echo "Read the Assumptions: each is a decision made for you, the ones you would notice most first."
if [ -n "$undecided" ]; then
  echo "It also needs an answer from you, under Undecided, before planning can finish:"
  echo "$undecided"
fi
echo "Edit $idea where something is wrong, then run: factory plan"
