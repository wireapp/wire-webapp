#!/usr/bin/env bash

set -euo pipefail

environment_label="${ENVIRONMENT_LABEL:-unknown}"
required_environment_variable_names=(
  ENVIRONMENT_LABEL
  WEBAPP_URL
  EXPECTED_VERSION
  EXPECTED_COMMIT
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
commit_endpoint="${normalized_webapp_url}/commit"
runtime_config_endpoint="${normalized_webapp_url}/config.js"
expected_backend_rest="$(normalize_url "${EXPECTED_BACKEND_REST}")"
expected_backend_ws="$(normalize_url "${EXPECTED_BACKEND_WS}")"

for attempt_number in {1..10}; do
  version_response="$(curl --fail --silent --show-error --connect-timeout 5 --max-time 15 "${version_endpoint}" || true)"
  commit_response="$(curl --fail --silent --show-error --connect-timeout 5 --max-time 15 "${commit_endpoint}" || true)"
  runtime_config="$(curl --fail --silent --show-error --connect-timeout 5 --max-time 15 "${runtime_config_endpoint}" || true)"

  actual_version="$(
    printf '%s' "${version_response}" |
      jq --exit-status --raw-output '.version | strings | select(length > 0)'
  )" || actual_version=''
  actual_commit="$(
    printf '%s' "${commit_response}" |
      tr -d '\r\n'
  )"
  actual_backend_rest="$(printf '%s' "${runtime_config}" | sed -n 's/.*"BACKEND_REST":"\([^"]*\)".*/\1/p')"
  actual_backend_ws="$(printf '%s' "${runtime_config}" | sed -n 's/.*"BACKEND_WS":"\([^"]*\)".*/\1/p')"
  normalized_actual_backend_rest="$(normalize_url "${actual_backend_rest}")"
  normalized_actual_backend_ws="$(normalize_url "${actual_backend_ws}")"

  if [[
    "${actual_version}" == "${EXPECTED_VERSION}" &&
    "${actual_commit}" == "${EXPECTED_COMMIT}" &&
    "${normalized_actual_backend_rest}" == "${expected_backend_rest}" &&
    "${normalized_actual_backend_ws}" == "${expected_backend_ws}"
  ]]; then
    echo "${environment_label} runtime verification succeeded on attempt ${attempt_number}: VERSION=${actual_version}, COMMIT=${actual_commit}, REST=${normalized_actual_backend_rest}, WS=${normalized_actual_backend_ws}."
    exit 0
  fi

  echo "${environment_label} runtime verification mismatch on attempt ${attempt_number}." >&2
  echo "Expected: VERSION=${EXPECTED_VERSION}, COMMIT=${EXPECTED_COMMIT}, REST=${expected_backend_rest}, WS=${expected_backend_ws}." >&2
  echo "Observed: VERSION=${actual_version:-missing}, COMMIT=${actual_commit:-missing}, REST=${normalized_actual_backend_rest:-missing}, WS=${normalized_actual_backend_ws:-missing}." >&2

  if [[ "${attempt_number}" -lt 10 ]]; then
    sleep 6
  fi
done

echo "${environment_label} runtime verification failed after 10 attempts." >&2
exit 1
