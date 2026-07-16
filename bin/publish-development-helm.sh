#!/usr/bin/env bash

set -euo pipefail

: "${CHART_REPOSITORY_NAME:?CHART_REPOSITORY_NAME is required}"
: "${CHART_REPOSITORY_URL:?CHART_REPOSITORY_URL is required}"
: "${DOCKER_IMAGE_TAG:?DOCKER_IMAGE_TAG is required}"

helm plugin install https://github.com/hypnoglow/helm-s3.git --version 0.15.1
helm repo add "${CHART_REPOSITORY_NAME}" "${CHART_REPOSITORY_URL}"
helm repo update

published_charts_path="${RUNNER_TEMP}/published-development-webapp-charts.json"
helm search repo "${CHART_REPOSITORY_NAME}/webapp" --devel --versions --output json |
  jq '[.[] | select(.version | contains("-pre."))]' > "${published_charts_path}"

helm_action="$(
  ./bin/yarn ts-node --project ./tsconfig.bin.json ./bin/productionDistributionCli.ts \
    select-helm-chart --charts-path "${published_charts_path}" --image-tag "${DOCKER_IMAGE_TAG}"
)"

case "${helm_action}" in
  reuse:*)
    chart_version="${helm_action#reuse:}"
    echo "Reusing existing matching prerelease Helm chart version ${chart_version}."
    ;;
  publish)
    chart_version="$(./bin/chart-next-version.sh prerelease)"
    CHART_VERSION="${chart_version}" IMAGE_TAG="${DOCKER_IMAGE_TAG}" \
      yq -i '.version = strenv(CHART_VERSION) | .appVersion = strenv(IMAGE_TAG)' charts/webapp/Chart.yaml
    chart_package_directory="${RUNNER_TEMP}/development-webapp-chart"
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
    '[.[] | select(.version == $chart_version and .app_version == $image_tag)] | length == 1' >/dev/null

echo "helm_chart_version=${chart_version}" >> "${GITHUB_OUTPUT}"
