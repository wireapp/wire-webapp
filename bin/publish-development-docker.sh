#!/usr/bin/env bash

set -euo pipefail

: "${DOCKER_PASSWORD:?DOCKER_PASSWORD is required}"
: "${DOCKER_USERNAME:?DOCKER_USERNAME is required}"
: "${DOCKER_REPOSITORY:?DOCKER_REPOSITORY is required}"
: "${DOCKER_IMAGE_TAG_OUTPUT_PATH:?DOCKER_IMAGE_TAG_OUTPUT_PATH is required}"
: "${WIRE_WEBAPP_RELEASE_COMMIT_SHA:?WIRE_WEBAPP_RELEASE_COMMIT_SHA is required}"
: "${WIRE_WEBAPP_DOCKER_CONTEXT_PATH:?WIRE_WEBAPP_DOCKER_CONTEXT_PATH is required}"

expected_image_tag="$(node ./bin/push_docker.js dev --print-image-tag)"
immutable_image_reference="${DOCKER_REPOSITORY}:${expected_image_tag}"
stable_image_reference="${DOCKER_REPOSITORY}:dev"

docker logout quay.io >/dev/null 2>&1 || true
trap 'docker logout quay.io >/dev/null 2>&1 || true' EXIT
printf '%s\n' "${DOCKER_PASSWORD}" | docker login --username "${DOCKER_USERNAME}" --password-stdin quay.io

if docker manifest inspect "${immutable_image_reference}" >/dev/null 2>&1; then
  echo "Reusing existing immutable image ${immutable_image_reference}."
  docker pull "${immutable_image_reference}"
  docker tag "${immutable_image_reference}" "${stable_image_reference}"
  docker push "${stable_image_reference}"
else
  echo "Building immutable image ${immutable_image_reference} from the exact downloaded context."
  rm -f "${DOCKER_IMAGE_TAG_OUTPUT_PATH}"
  node ./bin/push_docker.js dev "${DOCKER_IMAGE_TAG_OUTPUT_PATH}"
  captured_image_tag="$(<"${DOCKER_IMAGE_TAG_OUTPUT_PATH}")"

  if [[ "${captured_image_tag}" != "${expected_image_tag}" ]]; then
    echo "Docker script produced ${captured_image_tag}, expected ${expected_image_tag}." >&2
    exit 1
  fi
fi

docker manifest inspect "${immutable_image_reference}" >/dev/null
docker manifest inspect "${stable_image_reference}" >/dev/null

echo "docker_image_tag=${expected_image_tag}" >> "${GITHUB_OUTPUT}"
