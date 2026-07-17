#!/usr/bin/env bash

set -euo pipefail

: "${DOCKER_IMAGE_TAG:?DOCKER_IMAGE_TAG is required}"
: "${HELM_CHART_VERSION:?HELM_CHART_VERSION is required}"
: "${RELEASE_COMMIT_SHA:?RELEASE_COMMIT_SHA is required}"

webapp_repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
chart_repository='https://s3-eu-west-1.amazonaws.com/public.wire.com/charts-webapp'
commit_url="https://github.com/wireapp/wire-webapp/commit/${RELEASE_COMMIT_SHA}"
wire_builds_field_options=(
  --version "${HELM_CHART_VERSION}"
  --repo "${chart_repository}"
  --app-version "${DOCKER_IMAGE_TAG}"
  --commit-url "${commit_url}"
  --commit "${RELEASE_COMMIT_SHA}"
)

run_distribution_cli() {
  (
    cd "${webapp_repository_root}"
    ./bin/yarn ts-node \
      --project ./tsconfig.bin.json \
      ./bin/productionDistributionCli.ts \
      "$@"
  )
}

wire_builds_fields_match() {
  run_distribution_cli wire-builds-fields-match "${wire_builds_field_options[@]}" < build.json
}

build_version_before="$(jq --raw-output '.version' build.json)"
if wire_builds_fields_match; then
  build_version_after="$(jq --raw-output '.version' build.json)"
  if [[ "${build_version_before}" != "${build_version_after}" ]]; then
    echo 'The wire-builds no-op changed the top-level build version.' >&2
    exit 1
  fi

  echo 'wire-builds already contains the exact WebApp distribution fields.'
  echo "wire_builds_commit_sha=$(git rev-parse HEAD)" >> "${GITHUB_OUTPUT}"
  exit 0
fi

push_succeeded=false
for retry_number in 1 2 3; do
  if [[ "${retry_number}" -gt 1 ]]; then
    echo 'Retrying wire-builds/main update.'
  fi

  set +e
  (
    set -euo pipefail

    git fetch --depth 1 origin main
    git reset --hard origin/main

    build_version_before="$(jq --raw-output '.version' build.json)"
    if wire_builds_fields_match; then
      build_version_after="$(jq --raw-output '.version' build.json)"
      if [[ "${build_version_before}" != "${build_version_after}" ]]; then
        echo 'The wire-builds no-op changed the top-level build version.' >&2
        exit 1
      fi

      exit 0
    fi

    unrelated_build_state_before="$(jq -S -c 'del(.version, .helmCharts.webapp)' build.json)"
    updated_build_json="$(
      ./bin/set-chart-fields webapp \
        "version=${HELM_CHART_VERSION}" \
        "repo=${chart_repository}" \
        "meta.appVersion=${DOCKER_IMAGE_TAG}" \
        "meta.commitURL=${commit_url}" \
        "meta.commit=${RELEASE_COMMIT_SHA}" < build.json |
        ./bin/bump-prerelease
    )"
    printf '%s\n' "${updated_build_json}" > build.json

    unrelated_build_state_after="$(jq -S -c 'del(.version, .helmCharts.webapp)' build.json)"
    if [[ "${unrelated_build_state_before}" != "${unrelated_build_state_after}" ]]; then
      echo 'The wire-builds update changed a chart other than webapp.' >&2
      exit 1
    fi

    build_version_after="$(jq --raw-output '.version' build.json)"
    if [[ "${build_version_before}" == "${build_version_after}" ]]; then
      echo 'The wire-builds update did not bump the top-level build version.' >&2
      exit 1
    fi

    if ! wire_builds_fields_match; then
      echo 'The generated wire-builds WebApp fields are not exact.' >&2
      exit 1
    fi

    git config user.email 'zebot@users.noreply.github.com'
    git config user.name 'Zebot'
    git add build.json
    git commit -m "Bump webapp to ${HELM_CHART_VERSION}"
    git push origin main
  )
  attempt_exit_code=$?
  set -e

  if [[ "${attempt_exit_code}" -eq 0 ]]; then
    push_succeeded=true
    break
  fi

  echo "wire-builds/main update failed on attempt ${retry_number}." >&2
done

if [[ "${push_succeeded}" != 'true' ]]; then
  echo 'Unable to update wire-builds/main after three attempts.' >&2
  exit 1
fi

git fetch --depth 1 origin main
git reset --hard origin/main
if ! wire_builds_fields_match; then
  echo 'wire-builds/main does not contain the expected final WebApp fields.' >&2
  exit 1
fi

echo "wire_builds_commit_sha=$(git rev-parse HEAD)" >> "${GITHUB_OUTPUT}"
