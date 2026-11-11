#!/usr/bin/env bash

set -euo pipefail

artifact_path="${1:?Deployment ZIP path is required}"

if [[ ! -s "${artifact_path}" ]]; then
  echo "Deployment ZIP is missing or empty: ${artifact_path}" >&2
  exit 1
fi

if ! unzip -tq "${artifact_path}"; then
  echo "Deployment ZIP failed integrity verification: ${artifact_path}" >&2
  exit 1
fi

archive_entries="$(unzip -Z1 "${artifact_path}")"
required_entry_scripts=(
  static/min/app.js
  static/min/auth.js
  static/min/checkBrowser.js
  static/min/runtime.js
  static/min/vendor.js
  static/min/dexie.js
  static/min/pdf.worker.mjs
  static/min/worker.js
)

for entry_script_path in "${required_entry_scripts[@]}"; do
  if ! grep -Fqx -- "${entry_script_path}" <<< "${archive_entries}"; then
    echo "Public Rspack deployment package is missing required entry script: ${entry_script_path}" >&2
    exit 1
  fi
done

public_rspack_runtime="$(unzip -p "${artifact_path}" static/min/runtime.js)"
if ! grep -Fq 'rspackChunk_wireapp_webapp' <<< "${public_rspack_runtime}"; then
  echo 'Public deployment package does not contain the Rspack runtime fingerprint.' >&2
  exit 1
fi

if grep -Fq 'webpackChunk_wireapp_webapp' <<< "${public_rspack_runtime}"; then
  echo 'Public deployment package contains the Webpack runtime fingerprint.' >&2
  exit 1
fi
