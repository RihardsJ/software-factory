#!/usr/bin/env bash
# Installs or updates the factory in a host project.
# Usage: /path/to/software-factory/install.sh [host-project-dir]
set -euo pipefail

source_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
host_dir="$(cd "${1:-.}" && pwd)"
import_line='@factory/FACTORY.md'
manifest="$host_dir/factory/.installed"

fail() {
  echo "install: $1" >&2
  exit 1
}

[ "$host_dir" != "$source_dir" ] || fail "run this against a host project, not the factory repository itself."

# The factory reads the host's commands and never assumes them, so a host
# that records none cannot be worked on.
if ! grep -qis 'check command' "$host_dir/AGENTS.md" "$host_dir/CLAUDE.md"; then
  fail "no check command found in $host_dir.
Add an AGENTS.md or CLAUDE.md at the project root that names the project's check command,
for example: \`npm run check\` is the project's check command."
fi

# Files from the previous install are removed first, so a file dropped from
# the factory does not linger. Files the host created under factory/ stay.
if [ -f "$manifest" ]; then
  while IFS= read -r installed; do
    case "$installed" in
      version=*|'') ;;
      *) rm -f "$host_dir/factory/$installed" ;;
    esac
  done < "$manifest"
fi

mkdir -p "$host_dir/factory"
version="$(git -C "$source_dir" rev-parse --short HEAD 2>/dev/null || echo unknown)"
echo "version=$version" > "$manifest"

(cd "$source_dir/factory" && find . -type f | sed 's|^\./||' | sort) | while IFS= read -r file; do
  mkdir -p "$host_dir/factory/$(dirname "$file")"
  cp "$source_dir/factory/$file" "$host_dir/factory/$file"
  echo "$file" >> "$manifest"
done

if [ ! -f "$host_dir/CLAUDE.md" ]; then
  printf '@AGENTS.md\n%s\n' "$import_line" > "$host_dir/CLAUDE.md"
elif ! grep -qxF "$import_line" "$host_dir/CLAUDE.md"; then
  printf '\n%s\n' "$import_line" >> "$host_dir/CLAUDE.md"
fi

echo "Factory $version installed in $host_dir/factory"
