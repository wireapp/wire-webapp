#!/usr/bin/env bash

set -euo pipefail

export WIRE_BUILDS_TARGET_BRANCH=dev
exec "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/update-wire-builds.sh"
