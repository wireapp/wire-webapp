#!/usr/bin/env bash

set -euo pipefail

: "${DOCKER_PASSWORD:?DOCKER_PASSWORD is required}"
: "${DOCKER_USERNAME:?DOCKER_USERNAME is required}"
: "${DOCKER_REPOSITORY:?DOCKER_REPOSITORY is required}"
: "${PRODUCTION_IMAGE_TAG_OUTPUT_PATH:?PRODUCTION_IMAGE_TAG_OUTPUT_PATH is required}"
: "${PRODUCTION_TAG:?PRODUCTION_TAG is required}"
: "${RELEASE_COMMIT_SHA:?RELEASE_COMMIT_SHA is required}"

expected_image_tag="$(node ./bin/push_docker.js "${PRODUCTION_TAG}" --print-image-tag)"
expected_release_commit_short_sha="${RELEASE_COMMIT_SHA:0:7}"
if [[ "${expected_image_tag}" != *"${expected_release_commit_short_sha}"* ]]; then
  echo "Expected immutable image tag does not contain ${expected_release_commit_short_sha}: ${expected_image_tag}" >&2
  exit 1
fi

immutable_image_reference="${DOCKER_REPOSITORY}:${expected_image_tag}"
stable_image_reference="${DOCKER_REPOSITORY}:${PRODUCTION_TAG}"

echo "${DOCKER_PASSWORD}" | docker login --username "${DOCKER_USERNAME}" --password-stdin quay.io

if docker manifest inspect "${immutable_image_reference}" >/dev/null 2>&1; then
  echo "Reusing existing immutable image ${immutable_image_reference}."
  docker manifest inspect "${immutable_image_reference}" >/dev/null
  docker pull "${immutable_image_reference}"
  docker tag "${immutable_image_reference}" "${stable_image_reference}"
  docker push "${stable_image_reference}"
else
  echo "Building immutable image ${immutable_image_reference} from the downloaded context."
  rm -f "${PRODUCTION_IMAGE_TAG_OUTPUT_PATH}"
  node ./bin/push_docker.js "${PRODUCTION_TAG}" "${PRODUCTION_IMAGE_TAG_OUTPUT_PATH}"
  captured_image_tag="$(<"${PRODUCTION_IMAGE_TAG_OUTPUT_PATH}")"

  if [[ "${captured_image_tag}" != "${expected_image_tag}" ]]; then
    echo "Docker script produced ${captured_image_tag}, expected ${expected_image_tag}." >&2
    exit 1
  fi
fi

docker manifest inspect "${immutable_image_reference}" >/dev/null
docker logout quay.io

echo "docker_image_tag=${expected_image_tag}" >> "${GITHUB_OUTPUT}"
