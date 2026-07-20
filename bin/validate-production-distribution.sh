#!/usr/bin/env bash

set -euo pipefail

: "${DISTRIBUTION_CONTEXT_PATH:?DISTRIBUTION_CONTEXT_PATH is required}"
: "${EXPECTED_COMMIT_SHA:?EXPECTED_COMMIT_SHA is required}"
: "${PRODUCTION_TAG:?PRODUCTION_TAG is required}"
: "${SOURCE_RUN_ID:?SOURCE_RUN_ID is required}"

if [[ ! "${PRODUCTION_TAG}" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}\.[1-9][0-9]*-production$ ]]; then
  echo "Production tag does not match YYYY-MM-DD.N-production: ${PRODUCTION_TAG}" >&2
  exit 1
fi

git ls-remote --exit-code --tags origin "refs/tags/${PRODUCTION_TAG}" >/dev/null
git fetch --no-tags origin "refs/tags/${PRODUCTION_TAG}:refs/tags/${PRODUCTION_TAG}"

if [[ "$(git cat-file -t "refs/tags/${PRODUCTION_TAG}")" != 'tag' ]]; then
  echo "Production tag ${PRODUCTION_TAG} is not an annotated tag." >&2
  exit 1
fi

production_tag_commit_sha="$(git rev-parse "refs/tags/${PRODUCTION_TAG}^{commit}")"
manifest_path="${DISTRIBUTION_CONTEXT_PATH}/distribution-manifest.json"

validation_options=(
  --artifact-metadata-path "${DISTRIBUTION_CONTEXT_PATH}/apps/server/dist/version.json"
  --manifest-path "${manifest_path}"
  --production-tag "${PRODUCTION_TAG}"
  --production-tag-commit-sha "${production_tag_commit_sha}"
  --source-run-id "${SOURCE_RUN_ID}"
)

if [[ -n "${EXPECTED_COMMIT_SHA}" ]]; then
  validation_options+=(--expected-commit-sha "${EXPECTED_COMMIT_SHA}")
fi

./bin/yarn ts-node --project ./tsconfig.bin.json ./bin/productionDistributionCli.ts \
  validate-manifest "${validation_options[@]}"

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
    echo "Required Docker context path is missing: ${required_context_path}" >&2
    exit 1
  fi
done

cloud_artifact_checksum="$(jq --raw-output '.cloudArtifactChecksum' "${manifest_path}")"
actual_cloud_artifact_checksum="$(sha256sum "${DISTRIBUTION_CONTEXT_PATH}/apps/server/dist/s3/ebs.zip" | awk '{print $1}')"
if [[ "${actual_cloud_artifact_checksum}" != "${cloud_artifact_checksum}" ]]; then
  echo 'The distribution context EBS checksum does not match its manifest.' >&2
  exit 1
fi

echo "production_tag_commit_sha=${production_tag_commit_sha}" >> "${GITHUB_OUTPUT}"
