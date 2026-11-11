#!/usr/bin/env bash

set -euo pipefail

context_directory="${1:?Distribution context path is required}"
source_commit_sha="${2:?Validated distribution source commit is required}"

if ! git cat-file -e "${source_commit_sha}^{commit}"; then
  echo "Cannot inspect distribution source commit: ${source_commit_sha}" >&2
  exit 1
fi

# Use the immutable source's production recipe, not the contents of the downloaded
# artifact. Phase 1 sources also had an opt-in bundle recipe but deployed tsc output.
source_build_recipes=''
if git cat-file -e "${source_commit_sha}:justfile" 2>/dev/null; then
  source_build_recipes="$(git show "${source_commit_sha}:justfile")"
fi

required_runtime_paths=(
  apps/server/Dockerfile
  run.sh
  .env.defaults
  apps/server/dist/index.js
)

if grep -Eq '^package-server-public:.*[[:space:]]build-server-bundle([[:space:]]|$)' <<< "${source_build_recipes}"; then
  required_runtime_paths+=(apps/server/dist/index.js.map apps/server/dist/dbs/GeoLite2-Country.mmdb)
else
  # Historical Dockerfiles install dependencies from their source-era manifests.
  required_runtime_paths+=(package.json apps/server/package.json)
fi

for runtime_path in "${required_runtime_paths[@]}"; do
  if [[ ! -f "${context_directory}/${runtime_path}" ]] || [[ ! -s "${context_directory}/${runtime_path}" ]]; then
    echo "Required distribution runtime file is missing or empty: ${context_directory}/${runtime_path} (source ${source_commit_sha})" >&2
    exit 1
  fi
done
