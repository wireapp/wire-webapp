#!/usr/bin/env bash

set -euo pipefail

: "${CHART_REPOSITORY_NAME:?CHART_REPOSITORY_NAME is required}"
: "${CHART_REPOSITORY_URL:?CHART_REPOSITORY_URL is required}"
: "${DOCKER_IMAGE_TAG:?DOCKER_IMAGE_TAG is required}"

script_directory="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

helm plugin install https://github.com/hypnoglow/helm-s3.git --version 0.15.1
helm repo add "${CHART_REPOSITORY_NAME}" "${CHART_REPOSITORY_URL}"
helm repo update

published_charts_path="${RUNNER_TEMP}/published-webapp-charts.json"
helm search repo "${CHART_REPOSITORY_NAME}/webapp" --devel --versions --output json > "${published_charts_path}"

helm_action="$(
  "${script_directory}/run-production-distribution-cli.sh" \
    select-helm-chart --charts-path "${published_charts_path}" --image-tag "${DOCKER_IMAGE_TAG}"
)"

case "${helm_action}" in
  reuse:*)
    chart_version="${helm_action#reuse:}"
  echo "Reusing existing Helm chart version ${chart_version}."
  ;;
  publish)
    # Keep the current WebApp distribution policy: wire-builds/main consumes prerelease chart versions.
    chart_version="$(./bin/chart-next-version.sh prerelease)"
    CHART_VERSION="${chart_version}" IMAGE_TAG="${DOCKER_IMAGE_TAG}" \
      yq -i '.version = strenv(CHART_VERSION) | .appVersion = strenv(IMAGE_TAG)' charts/webapp/Chart.yaml
    chart_package_directory="${RUNNER_TEMP}/webapp-chart"
    mkdir -p "${chart_package_directory}"
    helm package ./charts/webapp --destination "${chart_package_directory}"
    helm s3 push --relative "${chart_package_directory}/webapp-${chart_version}.tgz" "${CHART_REPOSITORY_NAME}"
    ;;
  *)
    echo "Unknown Helm publication action: ${helm_action}" >&2
    exit 1
    ;;
esac

helm repo update
helm search repo "${CHART_REPOSITORY_NAME}/webapp" --devel --versions --output json |
  jq -e --arg chart_version "${chart_version}" --arg image_tag "${DOCKER_IMAGE_TAG}" \
    'any(.[]; .version == $chart_version and .app_version == $image_tag)' >/dev/null

echo "helm_chart_version=${chart_version}" >> "${GITHUB_OUTPUT}"
