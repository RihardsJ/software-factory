#!/usr/bin/env bash
# Turns a rough idea into specs/idea.md. In a terminal it interviews you;
# without one it drafts from the text you give. Usage: factory/idea.sh [your idea in a sentence]
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

seed="$*"
tools="Read,Glob,Grep,Write,Edit"
mkdir -p specs

# An untouched template is not an idea, and would only confuse the interviewer.
if [ -f specs/idea.md ] && cmp -s specs/idea.md "$factory_dir/templates/idea.md"; then
  rm specs/idea.md
fi

if [ -t 0 ] && [ -t 1 ]; then
  prompt="$(cat "$factory_dir/prompts/interviewer.md")

## Inputs for this run

Mode: interview
Starting point: ${seed:-none given}"
  "${FACTORY_AGENT:-claude}" "$prompt" --allowedTools "$tools" || true
else
  [ -n "$seed" ] || fail "there is no terminal to ask questions in. Give the idea as text: factory idea \"<your idea>\""
  agent interviewer "$tools" "Mode: draft
Starting point: $seed"
fi

if [ -s specs/idea.md ]; then
  say "Idea saved in specs/idea.md. Read it, then run: factory plan"
else
  say "No idea was saved. Run this again, or write specs/idea.md by hand."
fi
