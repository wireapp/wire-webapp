#!/usr/bin/env bash

set -euo pipefail

script_directory="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repository_root="$(cd "${script_directory}/.." && pwd)"
sparse_fixture_directory="$(mktemp -d)"
runtime_fixture_directory="${sparse_fixture_directory}/runtime"

trap 'rm -rf "${sparse_fixture_directory}"' EXIT

function copy_sparse_runtime_files() {
  mkdir -p \
    "${sparse_fixture_directory}/.github/actions/verify-webapp-runtime" \
    "${sparse_fixture_directory}/bin" \
    "${runtime_fixture_directory}" \
    "${sparse_fixture_directory}/test-bin"

  cp \
    "${repository_root}/.nvmrc" \
    "${sparse_fixture_directory}/.nvmrc"
  cp \
    "${repository_root}/.github/actions/verify-webapp-runtime/action.yml" \
    "${sparse_fixture_directory}/.github/actions/verify-webapp-runtime/action.yml"
  cp \
    "${repository_root}/.github/actions/verify-webapp-runtime/verify-webapp-runtime.sh" \
    "${sparse_fixture_directory}/.github/actions/verify-webapp-runtime/verify-webapp-runtime.sh"
  cp \
    "${repository_root}/bin/validateRuntimeResponses.mts" \
    "${sparse_fixture_directory}/bin/validateRuntimeResponses.mts"
  cp \
    "${repository_root}/bin/validateRuntimeResponses.ts" \
    "${sparse_fixture_directory}/bin/validateRuntimeResponses.ts"

  printf '%s\n' '#!/usr/bin/env bash' 'exit 0' > "${sparse_fixture_directory}/test-bin/sleep"
  chmod +x "${sparse_fixture_directory}/test-bin/sleep"
  printf '%s\n' \
    '#!/usr/bin/env bash' \
    'set -euo pipefail' \
    'request_url="${@: -1}"' \
    'case "${request_url}" in' \
    '  */version) cat "${RUNTIME_FIXTURE_DIRECTORY}/version" ;;' \
    '  */config.js) cat "${RUNTIME_FIXTURE_DIRECTORY}/config.js" ;;' \
    '  *) exit 1 ;;' \
    'esac' \
    > "${sparse_fixture_directory}/test-bin/curl"
  chmod +x "${sparse_fixture_directory}/test-bin/curl"
}

function run_runtime_verification() {
  local version_response="$1"

  printf '%s\n' "${version_response}" > "${runtime_fixture_directory}/version"
  printf '%s\n' \
    'window.wire.env = {"BACKEND_REST":"https://backend.example.com","BACKEND_WS":"wss://backend.example.com"};' \
    > "${runtime_fixture_directory}/config.js"

  local verification_output
  local verification_exit_code

  if verification_output="$(
    cd "${sparse_fixture_directory}"
    PATH="${sparse_fixture_directory}/test-bin:${PATH}" \
      ENVIRONMENT_LABEL='Sparse runtime smoke test' \
      RUNTIME_FIXTURE_DIRECTORY="${runtime_fixture_directory}" \
      WEBAPP_URL='https://sparse-runtime.test' \
      EXPECTED_VERSION='main-bdb93c9' \
      EXPECTED_ASSET_VERSION='main-bdb93c9' \
      EXPECTED_COMMIT='bdb93c9269866d577c012f3a781cbe904f7bf47c' \
      EXPECTED_BUILT_AT='2026-07-20T14:43:21.123Z' \
      EXPECTED_BACKEND_REST='https://backend.example.com' \
      EXPECTED_BACKEND_WS='wss://backend.example.com' \
      GITHUB_WORKSPACE="${sparse_fixture_directory}" \
      GITHUB_ACTION_PATH="${sparse_fixture_directory}/.github/actions/verify-webapp-runtime" \
      bash "${sparse_fixture_directory}/.github/actions/verify-webapp-runtime/verify-webapp-runtime.sh" \
      2>&1
  )"; then
    printf '%s\n' "${verification_output}"
    return 0
  else
    verification_exit_code=$?
    printf '%s\n' "${verification_output}"
    return "${verification_exit_code}"
  fi
}

copy_sparse_runtime_files

matching_version_response='{"version":"main-bdb93c9","assetVersion":"main-bdb93c9","commit":"bdb93c9269866d577c012f3a781cbe904f7bf47c","builtAt":"2026-07-20T14:43:21.123Z"}'
mismatching_asset_version_response='{"version":"main-bdb93c9","assetVersion":"main-other-assets","commit":"bdb93c9269866d577c012f3a781cbe904f7bf47c","builtAt":"2026-07-20T14:43:21.123Z"}'

matching_output="$(run_runtime_verification "${matching_version_response}")"
if [[ "${matching_output}" != *'runtime verification succeeded'* ]]; then
  echo 'Sparse runtime validation did not report success for matching metadata.' >&2
  printf '%s\n' "${matching_output}" >&2
  exit 1
fi

set +e
mismatching_output="$(run_runtime_verification "${mismatching_asset_version_response}")"
mismatching_exit_code=$?
set -e

if [[ "${mismatching_exit_code}" -eq 0 ]]; then
  echo 'Sparse runtime validation unexpectedly accepted a mismatched assetVersion.' >&2
  printf '%s\n' "${mismatching_output}" >&2
  exit 1
fi

if [[ "${mismatching_output}" != *'assetVersion does not match the expected artifact metadata'* ]]; then
  echo 'Sparse runtime validation did not report the assetVersion mismatch.' >&2
  printf '%s\n' "${mismatching_output}" >&2
  exit 1
fi

echo 'Sparse runtime validation entry point passed matching and mismatch checks.'
