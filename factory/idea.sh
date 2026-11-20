#!/usr/bin/env bash
# Turns a rough idea into specs/idea.md.
# Usage: factory/idea.sh [--interview] [your idea in a sentence]
#   with text, or with an idea already in specs/idea.md: refines it without asking anything
#   --interview, or no text and no idea yet: asks you questions in the terminal
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

interview=no
if [ "${1:-}" = "--interview" ]; then
  interview=yes
  shift
fi
seed="$*"
tools="Read,Glob,Grep,Write,Edit"
mkdir -p specs

# An untouched template is not an idea, and would only confuse the refiner.
if [ -f specs/idea.md ] && cmp -s specs/idea.md "$factory_dir/templates/idea.md"; then
  rm specs/idea.md
fi

# With nothing to start from, only the person can say what they want.
if [ -z "$seed" ] && [ ! -s specs/idea.md ]; then
  interview=yes
fi

if [ "$interview" = yes ]; then
  [ -t 0 ] && [ -t 1 ] || fail "there is no terminal to ask questions in. Give the idea as text: factory idea \"<your idea>\""
  prompt="$(cat "$factory_dir/prompts/interviewer.md")

## Inputs for this run

Mode: interview
Starting point: ${seed:-none given}"
  "${FACTORY_AGENT:-claude}" "$prompt" --allowedTools "$tools" || true
  [ -s specs/idea.md ] || fail "no idea was saved. Run this again, or write specs/idea.md by hand."
  say "Idea saved in specs/idea.md. Next: factory plan"
  exit 0
fi

agent interviewer "$tools" "Mode: refine
Starting point: ${seed:-the idea already in specs/idea.md}"

require_file specs/idea.md "the idea refiner"
for section in "What it is" "What a user can do" "Rules" "Out of scope" "Assumptions" "Undecided"; do
  require_line specs/idea.md "^## $section\$" "The refined idea is missing a section."
done

say "Refined idea, saved in specs/idea.md:"
echo
cat specs/idea.md
say "Read the Assumptions: each is a decision made for you."
echo "Edit specs/idea.md where one is wrong, answer anything under Undecided, then run: factory plan"
