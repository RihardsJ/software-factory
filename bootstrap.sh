#!/usr/bin/env bash
# Puts the `factory` command on this machine, or updates it.
# Usage: curl -fsSL https://raw.githubusercontent.com/RihardsJ/software-factory/main/bootstrap.sh | bash
set -euo pipefail

repo="https://github.com/RihardsJ/software-factory.git"
factory_home="${FACTORY_HOME:-$HOME/.software-factory}"
bin_dir="$HOME/.local/bin"

command -v git >/dev/null || { echo "bootstrap: git is required." >&2; exit 1; }

if [ -d "$factory_home/.git" ]; then
  git -C "$factory_home" pull --quiet --ff-only
else
  git clone --quiet "$repo" "$factory_home"
fi

mkdir -p "$bin_dir"
ln -sf "$factory_home/bin/factory" "$bin_dir/factory"

echo "Installed: $bin_dir/factory -> $factory_home"
case ":$PATH:" in
  *":$bin_dir:"*) echo "Run: factory new <name>" ;;
  *) echo "$bin_dir is not on your PATH. Add this line to ~/.bashrc and open a new shell:"
     echo "  export PATH=\"\$HOME/.local/bin:\$PATH\"" ;;
esac
