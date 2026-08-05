#!/usr/bin/env bash

set -euo pipefail

: "${CHART_REPOSITORY_NAME:?CHART_REPOSITORY_NAME is required}"
: "${CHART_REPOSITORY_URL:?CHART_REPOSITORY_URL is required}"
: "${DOCKER_IMAGE_TAG:?DOCKER_IMAGE_TAG is required}"

script_directory="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
"${script_directory}/publish-immutable-helm.sh"
