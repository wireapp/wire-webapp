#!/usr/bin/env bash

set -euo pipefail

environment_label="${ENVIRONMENT_LABEL:-unknown}"
required_environment_variable_names=(
  ENVIRONMENT_LABEL
  WEBAPP_URL
  EXPECTED_VERSION
  EXPECTED_ASSET_VERSION
  EXPECTED_COMMIT
  EXPECTED_BUILT_AT
  EXPECTED_BACKEND_REST
  EXPECTED_BACKEND_WS
)

for required_environment_variable_name in "${required_environment_variable_names[@]}"; do
  if [[ -z "${!required_environment_variable_name:-}" ]]; then
    echo "Missing required runtime verification input ${required_environment_variable_name} for environment ${environment_label}." >&2
    exit 1
  fi
done

function normalize_url() {
  local url="$1"

  while [[ "${url}" == */ ]]; do
    url="${url%/}"
  done

  printf '%s' "${url}"
}

normalized_webapp_url="$(normalize_url "${WEBAPP_URL}")"
version_endpoint="${normalized_webapp_url}/version"
runtime_config_endpoint="${normalized_webapp_url}/config.js"
expected_backend_rest="$(normalize_url "${EXPECTED_BACKEND_REST}")"
expected_backend_ws="$(normalize_url "${EXPECTED_BACKEND_WS}")"
validation_script_path="${GITHUB_WORKSPACE}/bin/validateRuntimeResponses.mts"

for attempt_number in {1..10}; do
  version_response="$(curl --fail --silent --show-error --connect-timeout 5 --max-time 15 "${version_endpoint}" || true)"
  runtime_config="$(curl --fail --silent --show-error --connect-timeout 5 --max-time 15 "${runtime_config_endpoint}" || true)"

  if validation_message="$(
    printf '%s' "${version_response}" |
      RUNTIME_CONFIG_RESPONSE="${runtime_config}" node "${validation_script_path}" 2>&1
  )"; then
    runtime_validation_succeeded=true
  else
    runtime_validation_succeeded=false
  fi

  if [[ "${runtime_validation_succeeded}" == 'true' ]]; then
    echo "${environment_label} runtime verification succeeded on attempt ${attempt_number}: VERSION=${EXPECTED_VERSION}, ASSET_VERSION=${EXPECTED_ASSET_VERSION}, COMMIT=${EXPECTED_COMMIT}, BUILT_AT=${EXPECTED_BUILT_AT}, REST=${expected_backend_rest}, WS=${expected_backend_ws}."
    exit 0
  fi

  echo "${environment_label} runtime verification mismatch on attempt ${attempt_number}." >&2
  echo "Expected: VERSION=${EXPECTED_VERSION}, ASSET_VERSION=${EXPECTED_ASSET_VERSION}, COMMIT=${EXPECTED_COMMIT}, BUILT_AT=${EXPECTED_BUILT_AT}, REST=${expected_backend_rest}, WS=${expected_backend_ws}." >&2
  echo "Validation details: ${validation_message:-missing}." >&2

  if [[ "${attempt_number}" -lt 10 ]]; then
    sleep 6
  fi
done

echo "${environment_label} runtime verification failed after 10 attempts." >&2
exit 1
