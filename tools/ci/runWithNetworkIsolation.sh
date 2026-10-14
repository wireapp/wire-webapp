#!/usr/bin/env bash

set -euo pipefail

if [[ $# -eq 0 ]]; then
  echo "Usage: $0 <command> [arguments...]" >&2
  exit 1
fi

if [[ "$(uname -s)" != "Linux" ]]; then
  exec "$@"
fi

if ! command -v unshare >/dev/null 2>&1; then
  echo "The 'unshare' command is required on Linux to isolate network access during tests." >&2
  exit 1
fi

original_user="$(id -un)"
original_home="${HOME}"
original_path="${PATH}"

if unshare --map-root-user -n true >/dev/null 2>&1; then
  if command -v ip >/dev/null 2>&1; then
    exec unshare --map-root-user -n bash -c '
      set -euo pipefail
      ip link set lo up
      exec "$@"
    ' bash "$@"
  fi

  exec unshare --map-root-user -n "$@"
fi

if unshare -n true >/dev/null 2>&1; then
  exec unshare -n "$@"
fi

if command -v sudo >/dev/null 2>&1; then
  if sudo unshare -n true >/dev/null 2>&1; then
    if command -v runuser >/dev/null 2>&1; then
      if command -v ip >/dev/null 2>&1; then
        exec sudo unshare -n bash -c '
          set -euo pipefail
          ip link set lo up
          exec runuser -u "$1" -- env HOME="$2" PATH="$3" "${@:4}"
        ' bash "${original_user}" "${original_home}" "${original_path}" "$@"
      fi

      exec sudo unshare -n runuser -u "${original_user}" -- env HOME="${original_home}" PATH="${original_path}" "$@"
    fi

    echo "The 'runuser' command is required for the privileged unshare fallback on this Linux runner." >&2
    exit 1
  fi
fi

echo "Unable to create a network-isolated namespace with unshare on this Linux runner." >&2
exit 1
