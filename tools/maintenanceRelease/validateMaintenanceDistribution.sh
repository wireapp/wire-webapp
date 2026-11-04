#!/usr/bin/env bash

set -euo pipefail

: "${DISTRIBUTION_ARTIFACT_PATH:?DISTRIBUTION_ARTIFACT_PATH is required}"
: "${DISTRIBUTION_CONTEXT_PATH:?DISTRIBUTION_CONTEXT_PATH is required}"
: "${DISTRIBUTION_ARTIFACT_NAME:?DISTRIBUTION_ARTIFACT_NAME is required}"
: "${EXPECTED_MAINTENANCE_COMMIT_SHA:?EXPECTED_MAINTENANCE_COMMIT_SHA is required}"
: "${MAINTENANCE_LINE_KEY:?MAINTENANCE_LINE_KEY is required}"
: "${MAINTENANCE_TAG:?MAINTENANCE_TAG is required}"
: "${SOURCE_WORKFLOW_RUN_ID:?SOURCE_WORKFLOW_RUN_ID is required}"

script_directory="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
workflow_source_directory="$(cd "${script_directory}/../.." && pwd)"
archive_path="${DISTRIBUTION_ARTIFACT_PATH}/maintenance-docker-context.tar.gz"
manifest_path="${DISTRIBUTION_ARTIFACT_PATH}/distribution-manifest.json"
tag_ref="refs/tags/${MAINTENANCE_TAG}"

node "${workflow_source_directory}/tools/releaseCli/releaseMetadataCli.mts" \
  validate-maintenance-tag "${MAINTENANCE_TAG}" >/dev/null

validated_line_key="$(node "${workflow_source_directory}/tools/releaseCli/maintenanceReleaseCli.mts" \
  maintenance-line-key "${MAINTENANCE_TAG}")"

if [[ "${validated_line_key}" != "${MAINTENANCE_LINE_KEY}" ]]; then
  echo "Maintenance tag ${MAINTENANCE_TAG} does not belong to line ${MAINTENANCE_LINE_KEY}." >&2
  exit 1
fi

if [[ "$(git cat-file -t "${tag_ref}")" != 'tag' ]]; then
  echo "Maintenance tag ${MAINTENANCE_TAG} is not annotated." >&2
  exit 1
fi

maintenance_tag_commit_sha="$(git rev-parse --verify "${tag_ref}^{commit}")"
checked_out_commit_sha="$(git rev-parse --verify HEAD)"

if [[ "${maintenance_tag_commit_sha}" != "${EXPECTED_MAINTENANCE_COMMIT_SHA}" ]] ||
  [[ "${checked_out_commit_sha}" != "${EXPECTED_MAINTENANCE_COMMIT_SHA}" ]]; then
  echo "Maintenance tag ${MAINTENANCE_TAG} does not resolve to the expected source commit." >&2
  exit 1
fi

tag_annotation="$(git for-each-ref --format='%(contents)' "${tag_ref}")"
tag_source_workflow_run_id="$(awk -F': ' '$1 == "Source workflow run ID" { print substr($0, index($0, ": ") + 2); exit }' <<< "${tag_annotation}")"
tag_distribution_artifact_name="$(awk -F': ' '$1 == "Distribution artifact" { print substr($0, index($0, ": ") + 2); exit }' <<< "${tag_annotation}")"
tag_archive_checksum="$(awk -F': ' '$1 == "Distribution archive SHA-256" { print substr($0, index($0, ": ") + 2); exit }' <<< "${tag_annotation}")"
tag_ebs_artifact_checksum="$(awk -F': ' '$1 == "EBS artifact SHA-256" { print substr($0, index($0, ": ") + 2); exit }' <<< "${tag_annotation}")"
tag_validation_status="$(awk -F': ' '$1 == "Maintenance validation" { print substr($0, index($0, ": ") + 2); exit }' <<< "${tag_annotation}")"
tag_source_production_tag="$(awk -F': ' '$1 == "Source Production tag" { print substr($0, index($0, ": ") + 2); exit }' <<< "${tag_annotation}")"
if [[ "${tag_source_workflow_run_id}" != "${SOURCE_WORKFLOW_RUN_ID}" ]] ||
  [[ "${tag_distribution_artifact_name}" != "${DISTRIBUTION_ARTIFACT_NAME}" ]] ||
  [[ "${tag_validation_status}" != 'passed' ]]; then
  echo "Maintenance tag ${MAINTENANCE_TAG} does not record the validated source workflow and artifact." >&2
  exit 1
fi

node "${workflow_source_directory}/tools/releaseCli/maintenanceReleaseCli.mts" \
  validate-distribution-artifact-name \
  --distribution-artifact-name "${tag_distribution_artifact_name}" \
  --maintenance-tag "${MAINTENANCE_TAG}" >/dev/null

node "${workflow_source_directory}/tools/releaseCli/releaseMetadataCli.mts" \
  validate-maintenance-source "${MAINTENANCE_LINE_KEY}" "${tag_source_production_tag}" >/dev/null

if [[ ! -f "${archive_path}" ]] || [[ ! -f "${manifest_path}" ]]; then
  echo 'Maintenance distribution artifact is missing its context archive or identity manifest.' >&2
  exit 1
fi

actual_docker_context_checksum="$(sha256sum "${archive_path}" | awk '{print $1}')"

if [[ "${actual_docker_context_checksum}" != "${tag_archive_checksum}" ]]; then
  echo 'Maintenance Docker context checksum does not match the immutable tag metadata.' >&2
  exit 1
fi

mkdir -p "${DISTRIBUTION_CONTEXT_PATH}"
tar -xzf "${archive_path}" -C "${DISTRIBUTION_CONTEXT_PATH}"

actual_ebs_artifact_checksum="$(sha256sum "${DISTRIBUTION_CONTEXT_PATH}/apps/server/dist/s3/ebs.zip" | awk '{print $1}')"

if [[ "${actual_ebs_artifact_checksum}" != "${tag_ebs_artifact_checksum}" ]]; then
  echo 'Maintenance EBS artifact checksum does not match the immutable tag metadata.' >&2
  exit 1
fi

node "${workflow_source_directory}/tools/releaseCli/maintenanceReleaseCli.mts" \
  validate-distribution \
  --manifest-path "${manifest_path}" \
  --artifact-metadata-path "${DISTRIBUTION_CONTEXT_PATH}/apps/server/dist/version.json" \
  --maintenance-tag "${MAINTENANCE_TAG}" \
  --distribution-artifact-name "${DISTRIBUTION_ARTIFACT_NAME}" \
  --maintenance-commit-sha "${EXPECTED_MAINTENANCE_COMMIT_SHA}" \
  --source-run-id "${SOURCE_WORKFLOW_RUN_ID}" \
  --ebs-checksum "${actual_ebs_artifact_checksum}" \
  --context-checksum "${actual_docker_context_checksum}"

(
  cd "${workflow_source_directory}"
  BUILD_ARTIFACT_PATH="${DISTRIBUTION_CONTEXT_PATH}/apps/server/dist/s3/ebs.zip" \
    EXPECTED_COMMIT="${EXPECTED_MAINTENANCE_COMMIT_SHA}" \
    EXPECTED_VERSION="${MAINTENANCE_TAG}" \
    npx just validate-build-artifact
)

for required_context_path in \
  "${DISTRIBUTION_CONTEXT_PATH}/apps/server/Dockerfile" \
  "${DISTRIBUTION_CONTEXT_PATH}/apps/server/dist" \
  "${DISTRIBUTION_CONTEXT_PATH}/libraries/config/lib" \
  "${DISTRIBUTION_CONTEXT_PATH}/package.json" \
  "${DISTRIBUTION_CONTEXT_PATH}/apps/server/package.json" \
  "${DISTRIBUTION_CONTEXT_PATH}/libraries/config/package.json" \
  "${DISTRIBUTION_CONTEXT_PATH}/run.sh" \
  "${DISTRIBUTION_CONTEXT_PATH}/.env.defaults"; do
  if [[ ! -e "${required_context_path}" ]]; then
    echo "Required maintenance Docker context path is missing: ${required_context_path}" >&2
    exit 1
  fi
done

echo "maintenance_tag_commit_sha=${maintenance_tag_commit_sha}" >> "${GITHUB_OUTPUT}"
echo "maintenance_artifact_name=${tag_distribution_artifact_name}" >> "${GITHUB_OUTPUT}"
