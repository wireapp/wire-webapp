#!/usr/bin/env bash

set -euo pipefail

: "${DOCKER_PASSWORD:?DOCKER_PASSWORD is required}"
: "${DOCKER_USERNAME:?DOCKER_USERNAME is required}"
: "${DOCKER_REPOSITORY:?DOCKER_REPOSITORY is required}"
: "${DOCKER_IMAGE_TAG_OUTPUT_PATH:?DOCKER_IMAGE_TAG_OUTPUT_PATH is required}"
: "${IMMUTABLE_ARTIFACT_TAG:?IMMUTABLE_ARTIFACT_TAG is required}"
: "${RELEASE_COMMIT_SHA:?RELEASE_COMMIT_SHA is required}"
: "${STABLE_IMAGE_REFERENCE:?STABLE_IMAGE_REFERENCE is required}"
: "${WIRE_WEBAPP_DOCKER_CONTEXT_PATH:?WIRE_WEBAPP_DOCKER_CONTEXT_PATH is required}"

expected_image_tag="$(node ./bin/push_docker.js "${IMMUTABLE_ARTIFACT_TAG}" --print-image-tag)"
expected_release_commit_short_sha="${RELEASE_COMMIT_SHA:0:7}"
if [[ "${expected_image_tag}" != *"${expected_release_commit_short_sha}"* ]]; then
  echo "Expected immutable image tag does not contain ${expected_release_commit_short_sha}: ${expected_image_tag}" >&2
  exit 1
fi

immutable_image_reference="${DOCKER_REPOSITORY}:${expected_image_tag}"

docker logout quay.io >/dev/null 2>&1 || true
trap 'docker logout quay.io >/dev/null 2>&1 || true' EXIT
printf '%s\n' "${DOCKER_PASSWORD}" | docker login --username "${DOCKER_USERNAME}" --password-stdin quay.io

manifest_identity() {
  local image_reference="$1"

  docker manifest inspect "${image_reference}" |
    jq -cS 'if .manifests then [.manifests[] | {digest, platform}] | sort_by(.digest) else {config: .config.digest, layers: [.layers[]?.digest]} end'
}

if docker manifest inspect "${immutable_image_reference}" >/dev/null 2>&1; then
  echo "Reusing existing immutable image ${immutable_image_reference}."
  docker manifest inspect "${immutable_image_reference}" >/dev/null
else
  echo "Building immutable image ${immutable_image_reference} from the exact downloaded context."
  rm -f "${DOCKER_IMAGE_TAG_OUTPUT_PATH}"
  node ./bin/push_docker.js "${IMMUTABLE_ARTIFACT_TAG}" "${DOCKER_IMAGE_TAG_OUTPUT_PATH}"
  captured_image_tag="$(<"${DOCKER_IMAGE_TAG_OUTPUT_PATH}")"

  if [[ "${captured_image_tag}" != "${expected_image_tag}" ]]; then
    echo "Docker script produced ${captured_image_tag}, expected ${expected_image_tag}." >&2
    exit 1
  fi
fi

docker manifest inspect "${immutable_image_reference}" >/dev/null

if docker manifest inspect "${STABLE_IMAGE_REFERENCE}" >/dev/null 2>&1; then
  existing_stable_manifest_identity="$(manifest_identity "${STABLE_IMAGE_REFERENCE}")"
  immutable_manifest_identity="$(manifest_identity "${immutable_image_reference}")"

  if [[ "${existing_stable_manifest_identity}" != "${immutable_manifest_identity}" ]]; then
    echo "Stable Docker reference ${STABLE_IMAGE_REFERENCE} points to a conflicting immutable image." >&2
    exit 1
  fi

  echo "Reusing existing stable Docker reference ${STABLE_IMAGE_REFERENCE}."
else
  docker pull "${immutable_image_reference}"
  docker tag "${immutable_image_reference}" "${STABLE_IMAGE_REFERENCE}"
  docker push "${STABLE_IMAGE_REFERENCE}"
fi

if [[ "$(manifest_identity "${STABLE_IMAGE_REFERENCE}")" != "$(manifest_identity "${immutable_image_reference}")" ]]; then
  echo "Stable Docker reference ${STABLE_IMAGE_REFERENCE} does not match the immutable image." >&2
  exit 1
fi

echo "docker_image_tag=${expected_image_tag}" >> "${GITHUB_OUTPUT}"
