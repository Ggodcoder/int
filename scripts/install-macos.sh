#!/usr/bin/env bash
set -euo pipefail

step() {
  printf '[int] %s\n' "$1"
}

inside() {
  case "$1" in
    "$2"/*|"$2") return 0 ;;
    *) return 1 ;;
  esac
}

remove_if_inside() {
  local target="$1"
  local root="$2"
  local label="$3"

  if [ -z "$target" ] || { [ ! -e "$target" ] && [ ! -L "$target" ]; }; then
    return 0
  fi

  local full_target
  local full_root
  full_target="$(cd "$(dirname "$target")" && pwd -P)/$(basename "$target")"
  full_root="$(cd "$root" && pwd -P)"

  if ! inside "$full_target" "$full_root"; then
    printf '[int] refusing to remove %s outside %s: %s\n' "$label" "$full_root" "$full_target" >&2
    exit 1
  fi

  step "Removing stale $label: $full_target"
  rm -rf "$full_target"
}

if ! command -v npm >/dev/null 2>&1; then
  printf '[int] npm is required but was not found.\n' >&2
  exit 1
fi

npm_root="$(npm root -g)"
npm_prefix="$(npm prefix -g)"
npm_bin="$npm_prefix/bin"

step "Stopping running Int CLI processes"
pkill -f 'int-cli/.*/src/cli\.mjs' 2>/dev/null || true
pkill -f 'int-cli/src/cli\.mjs' 2>/dev/null || true

step "Cleaning stale global package state"
remove_if_inside "$npm_root/int-cli" "$npm_root" "int-cli package"
remove_if_inside "$npm_prefix/bin/int" "$npm_prefix" "int executable"

find "$npm_root" -maxdepth 1 \( -name '.int-cli-*' -o -name 'int-cli-*' \) -print0 2>/dev/null |
  while IFS= read -r -d '' path; do
    remove_if_inside "$path" "$npm_root" "npm temp folder"
  done

step "Verifying npm cache"
npm cache verify

step "Installing Int CLI from GitHub"
npm install -g github:Ggodcoder/int

step "Installing Playwright Chromium"
playwright_cli="$npm_root/int-cli/node_modules/playwright/cli.js"
if [ ! -f "$playwright_cli" ]; then
  printf '[int] Playwright CLI was not found after install: %s\n' "$playwright_cli" >&2
  exit 1
fi
node "$playwright_cli" install chromium

export PATH="$npm_bin:$PATH"
hash -r 2>/dev/null || true

int_cmd="$npm_bin/int"
if [ ! -x "$int_cmd" ]; then
  if command -v int >/dev/null 2>&1; then
    int_cmd="$(command -v int)"
  else
    printf '[int] install finished, but the int executable was not found.\n' >&2
    printf '[int] expected: %s\n' "$npm_bin/int" >&2
    printf '[int] npm prefix: %s\n' "$npm_prefix" >&2
    printf '[int] npm root: %s\n' "$npm_root" >&2
    printf '[int] PATH: %s\n' "$PATH" >&2
    exit 1
  fi
fi

step "Verifying Int CLI"
"$int_cmd" --smoke

step "Done. Run int to start."
