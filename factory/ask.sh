#!/usr/bin/env bash
# Asks the manager a question about the project and what was built in it.
# It answers from the work folders and the code, and names the next step.
# Usage: factory/ask.sh <your question>
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

question="$*"
[ -n "$question" ] || fail "ask something: factory ask \"<your question>\""

agent manager "$read_only,Bash(git log:*),Bash(git show:*),Bash(git diff:*),Bash(git status:*)" "Question: $question"
cp "$last_log" "$factory_dir/runs/last-answer.md"
echo
cat "$last_log"
