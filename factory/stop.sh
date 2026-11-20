#!/usr/bin/env bash
# Stops the factory run in this project, and the agent or check it started.
# It touches nothing else on the machine. Usage: factory/stop.sh
set -euo pipefail
FACTORY_LOOK_ONLY=1
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

active="$(cat "$factory_dir/runs/.active" 2>/dev/null || true)"
pid="${active%% *}"
if [ -z "$pid" ] || ! kill -0 "$pid" 2> /dev/null; then
  rm -f "$factory_dir/runs/.active"
  echo "Nothing is running in this project."
  exit 0
fi

# Children first, so a stopped script cannot leave an agent working.
stop_tree() {
  local child
  for child in $(pgrep -P "$1" 2> /dev/null || true); do
    stop_tree "$child"
  done
  kill "$1" 2> /dev/null || true
}

stop_tree "$pid"
rm -f "$factory_dir/runs/.active"
echo "Stopped: $(echo "$active" | cut -d' ' -f2). Its replies so far are in $(echo "$active" | cut -d' ' -f3)"
if [ -n "$(git status --porcelain 2> /dev/null)" ]; then
  echo "It left unfinished changes. See them with 'git status'; 'factory build' needs a clean tree before it runs again."
fi
