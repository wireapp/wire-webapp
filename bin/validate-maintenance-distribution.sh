#!/usr/bin/env bash

set -euo pipefail

: "${DISTRIBUTION_CONTEXT_PATH:?DISTRIBUTION_CONTEXT_PATH is required}"
: "${MAINTENANCE_BRANCH:?MAINTENANCE_BRANCH is required}"
: "${MAINTENANCE_COMMIT_SHA:?MAINTENANCE_COMMIT_SHA is required}"
: "${MAINTENANCE_LINE_KEY:?MAINTENANCE_LINE_KEY is required}"
: "${MAINTENANCE_TAG:?MAINTENANCE_TAG is required}"
: "${SOURCE_PRODUCTION_COMMIT_SHA:?SOURCE_PRODUCTION_COMMIT_SHA is required}"
: "${SOURCE_PRODUCTION_TAG:?SOURCE_PRODUCTION_TAG is required}"
: "${WORKFLOW_RUN_ID:?WORKFLOW_RUN_ID is required}"
: "${WORKFLOW_RUN_ATTEMPT:?WORKFLOW_RUN_ATTEMPT is required}"

manifest_path="${DISTRIBUTION_CONTEXT_PATH}/distribution-manifest.json"
artifact_path="${DISTRIBUTION_CONTEXT_PATH}/apps/server/dist/s3/ebs.zip"

if [[ ! -f "${manifest_path}" ]]; then
  echo "Maintenance distribution manifest is missing: ${manifest_path}" >&2
  exit 1
fi

validation_options=(
  --artifact-metadata-path "${DISTRIBUTION_CONTEXT_PATH}/apps/server/dist/version.json"
  --manifest-path "${manifest_path}"
  --maintenance-line-key "${MAINTENANCE_LINE_KEY}"
  --maintenance-branch "${MAINTENANCE_BRANCH}"
  --source-production-tag "${SOURCE_PRODUCTION_TAG}"
  --source-production-commit-sha "${SOURCE_PRODUCTION_COMMIT_SHA}"
  --maintenance-commit-sha "${MAINTENANCE_COMMIT_SHA}"
  --maintenance-tag "${MAINTENANCE_TAG}"
  --workflow-run-id "${WORKFLOW_RUN_ID}"
  --workflow-run-attempt "${WORKFLOW_RUN_ATTEMPT}"
)

./bin/yarn ts-node --project ./tsconfig.bin.json ./bin/maintenanceDistributionCli.ts \
  validate-manifest "${validation_options[@]}"

BUILD_ARTIFACT_PATH="${artifact_path}" \
EXPECTED_COMMIT="${MAINTENANCE_COMMIT_SHA}" \
EXPECTED_VERSION="${MAINTENANCE_TAG}" \
node ./bin/validateBuildArtifact.mts

for required_context_path in \
  "${DISTRIBUTION_CONTEXT_PATH}/apps/server/Dockerfile" \
  "${DISTRIBUTION_CONTEXT_PATH}/apps/server/dist" \
  "${DISTRIBUTION_CONTEXT_PATH}/libraries/config/lib" \
  "${DISTRIBUTION_CONTEXT_PATH}/package.json" \
  "${DISTRIBUTION_CONTEXT_PATH}/yarn.lock" \
  "${DISTRIBUTION_CONTEXT_PATH}/.yarnrc.yml" \
  "${DISTRIBUTION_CONTEXT_PATH}/.npmrc" \
  "${DISTRIBUTION_CONTEXT_PATH}/.yarn" \
  "${DISTRIBUTION_CONTEXT_PATH}/bin/yarn" \
  "${DISTRIBUTION_CONTEXT_PATH}/apps/server/package.json" \
  "${DISTRIBUTION_CONTEXT_PATH}/libraries/config/package.json" \
  "${DISTRIBUTION_CONTEXT_PATH}/run.sh" \
  "${DISTRIBUTION_CONTEXT_PATH}/.env.defaults"; do
  if [[ ! -e "${required_context_path}" ]]; then
    echo "Required maintenance Docker context path is missing: ${required_context_path}" >&2
    exit 1
  fi
done

manifest_artifact_checksum="$(jq --raw-output '.artifactChecksum' "${manifest_path}")"
actual_artifact_checksum="$(sha256sum "${artifact_path}" | awk '{print $1}')"
if [[ "${actual_artifact_checksum}" != "${manifest_artifact_checksum}" ]]; then
  echo 'The maintenance distribution context EBS checksum does not match its manifest.' >&2
  exit 1
fi
