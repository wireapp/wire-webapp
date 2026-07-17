#!/usr/bin/env bash

set -euo pipefail

release_branch="${RELEASE_BRANCH:-not available}"
release_identifier="${RELEASE_IDENTIFIER:-not available}"
artifact_version="${ARTIFACT_VERSION:-not available}"
artifact_name="${ARTIFACT_NAME:-not available}"
artifact_checksum="${ARTIFACT_CHECKSUM:-not available}"

commit_link='not available'
if [[ -n "${RELEASE_COMMIT_SHA:-}" && -n "${GITHUB_SERVER_URL:-}" && -n "${GITHUB_REPOSITORY:-}" ]]; then
  commit_url="${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/commit/${RELEASE_COMMIT_SHA}"
  commit_link="[${RELEASE_COMMIT_SHA}](${commit_url})"
fi

workflow_run_link='not available'
if [[ -n "${GITHUB_SERVER_URL:-}" && -n "${GITHUB_REPOSITORY:-}" && -n "${GITHUB_RUN_ID:-}" ]]; then
  workflow_run_url="${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}"
  workflow_run_link="[${workflow_run_url}](${workflow_run_url})"
fi

if [[ "${BETA_RESULT:-}" == 'success' ]]; then
  beta_result='deployed and verified successfully'
elif [[ "${BETA_RESULT:-}" == 'failure' ]]; then
  beta_result='failed'
elif [[ "${BETA_RESULT:-}" == 'skipped' ]]; then
  beta_result='did not run'
elif [[ "${BETA_RESULT:-}" == 'cancelled' ]]; then
  beta_result='cancelled'
else
  beta_result='unknown result'
fi

beta_frontend_url='not available'
if [[ "${BETA_WEBAPP_URL:-}" == http://* || "${BETA_WEBAPP_URL:-}" == https://* ]]; then
  beta_frontend_url="[${BETA_WEBAPP_URL}](${BETA_WEBAPP_URL})"
fi

beta_tag='not available'
if [[ "${BETA_TAG_CREATION_RESULT:-}" == 'success' && -n "${BETA_TAG_NAME:-}" && -n "${GITHUB_SERVER_URL:-}" && -n "${GITHUB_REPOSITORY:-}" ]]; then
  tag_url="${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/tree/${BETA_TAG_NAME}"
  beta_tag="[${BETA_TAG_NAME}](${tag_url})"
elif [[ "${BETA_TAG_CREATION_RESULT:-}" == 'failure' || "${BETA_TAG_CREATION_RESULT:-}" == 'cancelled' || "${BETA_TAG_CREATION_RESULT:-}" == 'skipped' ]]; then
  beta_tag='not created'
fi

if [[ "${E2E_RESULT:-}" == 'success' ]]; then
  e2e_result='passed successfully'
elif [[ "${E2E_RESULT:-}" == 'failure' ]]; then
  e2e_result='failed'
elif [[ "${E2E_RESULT:-}" == 'skipped' ]]; then
  e2e_result='did not run'
elif [[ "${E2E_RESULT:-}" == 'cancelled' ]]; then
  e2e_result='cancelled'
else
  e2e_result='unknown result'
fi

e2e_frontend_url='not available'
if [[ "${E2E_WEBAPP_URL:-}" == http://* || "${E2E_WEBAPP_URL:-}" == https://* ]]; then
  e2e_frontend_url="[${E2E_WEBAPP_URL}](${E2E_WEBAPP_URL})"
fi

playwright_report='not available'
if [[ "${E2E_REPORT_URL:-}" == http://* || "${E2E_REPORT_URL:-}" == https://* ]]; then
  playwright_report="[${E2E_REPORT_URL}](${E2E_REPORT_URL})"
fi

if [[ -n "${RELEASE_IDENTIFIER:-}" && -n "${BETA_TAG_NAME:-}" ]]; then
  testiny_run_name="${TESTINY_RUN_NAME}"
else
  testiny_run_name='not run'
fi

if [[ "${PRODUCTION_PROMOTION_REQUESTED:-false}" == 'true' ]]; then
  production_promotion_requested='true'
else
  production_promotion_requested='false'
fi

if [[ "${PRODUCTION_PREFLIGHT_RESULT:-}" == 'ready' ]]; then
  production_preflight_result='ready'
elif [[ "${PRODUCTION_PREFLIGHT_RESULT:-}" == 'already_tagged' ]]; then
  production_preflight_result='already tagged'
elif [[ "${PRODUCTION_PREFLIGHT_RESULT:-}" == 'skipped' ]]; then
  production_preflight_result='skipped'
elif [[ "${PRODUCTION_PREFLIGHT_RESULT:-}" == 'failure' ]]; then
  production_preflight_result='failed'
elif [[ "${PRODUCTION_PREFLIGHT_JOB_RESULT:-}" == 'failure' ]]; then
  production_preflight_result='failed'
elif [[ "${PRODUCTION_PREFLIGHT_JOB_RESULT:-}" == 'cancelled' ]]; then
  production_preflight_result='cancelled'
elif [[ "${PRODUCTION_PREFLIGHT_JOB_RESULT:-}" == 'skipped' ]]; then
  production_preflight_result='not run'
else
  production_preflight_result='unknown result'
fi

production_runtime_verification_result='unknown result'
if [[ "${PRODUCTION_RUNTIME_VERIFICATION_RESULT:-}" == 'success' ]]; then
  production_runtime_verification_result='verified successfully'
elif [[ "${PRODUCTION_RUNTIME_VERIFICATION_RESULT:-}" == 'failure' ]]; then
  production_runtime_verification_result='failed'
elif [[ "${PRODUCTION_RUNTIME_VERIFICATION_RESULT:-}" == 'skipped' ]]; then
  production_runtime_verification_result='not run'
elif [[ "${PRODUCTION_RUNTIME_VERIFICATION_RESULT:-}" == 'cancelled' ]]; then
  production_runtime_verification_result='cancelled'
fi

if [[ "${PRODUCTION_PROMOTION_REQUESTED}" != 'true' ]]; then
  production_result='not requested'
elif [[ "${PRODUCTION_PREFLIGHT_RESULT:-}" == 'already_tagged' ]]; then
  production_result='already tagged; deployment not required'
elif [[ "${PRODUCTION_PREFLIGHT_JOB_RESULT:-}" == 'failure' ]]; then
  production_result='failed during preflight'
elif [[ "${PRODUCTION_PREFLIGHT_JOB_RESULT:-}" == 'cancelled' ]]; then
  production_result='cancelled during preflight'
elif [[ "${PRODUCTION_PREFLIGHT_JOB_RESULT:-}" == 'skipped' ]]; then
  production_result='not run because Production preflight did not run'
elif [[ "${PRODUCTION_PREFLIGHT_RESULT:-}" != 'ready' ]]; then
  production_result='unknown result'
elif [[ "${PRODUCTION_DEPLOYMENT_RESULT:-}" == 'failure' ]]; then
  production_result='failed during deployment'
elif [[ "${PRODUCTION_DEPLOYMENT_RESULT:-}" == 'cancelled' ]]; then
  production_result='cancelled during deployment'
elif [[ "${PRODUCTION_DEPLOYMENT_RESULT:-}" == 'skipped' ]]; then
  production_result='not run'
elif [[ "${PRODUCTION_DEPLOYMENT_RESULT:-}" != 'success' ]]; then
  production_result='unknown result'
elif [[ "${PRODUCTION_RUNTIME_VERIFICATION_RESULT:-}" == 'failure' ]]; then
  production_result='deployed, but runtime verification failed'
elif [[ "${PRODUCTION_RUNTIME_VERIFICATION_RESULT:-}" == 'cancelled' ]]; then
  production_result='deployed, but runtime verification was cancelled'
elif [[ "${PRODUCTION_RUNTIME_VERIFICATION_RESULT:-}" == 'skipped' ]]; then
  production_result='deployed, but runtime verification did not run'
elif [[ "${PRODUCTION_RUNTIME_VERIFICATION_RESULT:-}" != 'success' ]]; then
  production_result='unknown result'
elif [[ "${PRODUCTION_TAG_CREATION_RESULT:-}" == 'success' ]]; then
  production_result='deployed, verified, and tagged successfully'
elif [[ "${PRODUCTION_TAG_CREATION_RESULT:-}" == 'failure' ]]; then
  production_result='deployed and verified, but tag creation failed'
elif [[ "${PRODUCTION_TAG_CREATION_RESULT:-}" == 'cancelled' ]]; then
  production_result='deployed and verified, but tag creation was cancelled'
else
  production_result='unknown result'
fi

production_skip_reason=''
if [[ -n "${PRODUCTION_SKIPPED_REASON:-}" ]]; then
  production_skip_reason="${PRODUCTION_SKIPPED_REASON}"
elif [[ "${PRODUCTION_PROMOTION_REQUESTED}" != 'true' ]]; then
  production_skip_reason='Production promotion was not requested'
elif [[ "${PRODUCTION_PREFLIGHT_JOB_RESULT:-}" == 'skipped' ]]; then
  production_skip_reason='Production preflight did not run'
elif [[ "${PRODUCTION_DEPLOYMENT_RESULT:-}" == 'skipped' ]]; then
  production_skip_reason='Production deployment did not run'
fi

if [[ "${PRODUCTION_PROMOTION_REQUESTED}" != 'true' ]]; then
  approval_gate='not requested'
elif [[ "${PRODUCTION_PREFLIGHT_RESULT:-}" == 'already_tagged' ]]; then
  approval_gate='not required; the release is already tagged as Production'
elif [[ "${PRODUCTION_PREFLIGHT_RESULT:-}" == 'ready' ]]; then
  approval_gate="${PRODUCTION_ENVIRONMENT_NAME} GitHub Environment settings"
else
  approval_gate='not reached'
fi

production_tag='not available'
if [[ "${PRODUCTION_TAG_CREATION_RESULT:-}" == 'success' && -n "${CREATED_PRODUCTION_TAG_NAME:-}" && -n "${GITHUB_SERVER_URL:-}" && -n "${GITHUB_REPOSITORY:-}" ]]; then
  tag_url="${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/tree/${CREATED_PRODUCTION_TAG_NAME}"
  production_tag="[${CREATED_PRODUCTION_TAG_NAME}](${tag_url})"
elif [[ "${PRODUCTION_PREFLIGHT_RESULT:-}" == 'already_tagged' && -n "${PLANNED_PRODUCTION_TAG_NAME:-}" && -n "${GITHUB_SERVER_URL:-}" && -n "${GITHUB_REPOSITORY:-}" ]]; then
  tag_url="${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/tree/${PLANNED_PRODUCTION_TAG_NAME}"
  production_tag="[${PLANNED_PRODUCTION_TAG_NAME}](${tag_url})"
elif [[ "${PRODUCTION_PROMOTION_REQUESTED}" != 'true' ]]; then
  production_tag='not requested'
elif [[ "${PRODUCTION_PREFLIGHT_RESULT:-}" == 'already_tagged' ]]; then
  production_tag='not available'
elif [[
  "${PRODUCTION_TAG_CREATION_RESULT:-}" == 'failure' ||
  "${PRODUCTION_TAG_CREATION_RESULT:-}" == 'cancelled' ||
  "${PRODUCTION_TAG_CREATION_RESULT:-}" == 'skipped' ||
  "${PRODUCTION_DEPLOYMENT_RESULT:-}" == 'failure' ||
  "${PRODUCTION_DEPLOYMENT_RESULT:-}" == 'cancelled' ||
  "${PRODUCTION_DEPLOYMENT_RESULT:-}" == 'skipped' ||
  "${PRODUCTION_RUNTIME_VERIFICATION_RESULT:-}" == 'failure' ||
  "${PRODUCTION_RUNTIME_VERIFICATION_RESULT:-}" == 'cancelled' ||
  "${PRODUCTION_RUNTIME_VERIFICATION_RESULT:-}" == 'skipped' ||
  "${PRODUCTION_PREFLIGHT_JOB_RESULT:-}" == 'failure' ||
  "${PRODUCTION_PREFLIGHT_JOB_RESULT:-}" == 'cancelled' ||
  "${PRODUCTION_PREFLIGHT_JOB_RESULT:-}" == 'skipped'
]]; then
  production_tag='not created'
fi

if [[ "${PRODUCTION_TAG_CREATION_RESULT:-}" == 'success' ]]; then
  production_tag_creation_result='created successfully'
elif [[ "${PRODUCTION_TAG_CREATION_RESULT:-}" == 'failure' ]]; then
  production_tag_creation_result='failed'
elif [[ "${PRODUCTION_TAG_CREATION_RESULT:-}" == 'cancelled' ]]; then
  production_tag_creation_result='cancelled'
elif [[ "${PRODUCTION_PREFLIGHT_RESULT:-}" == 'already_tagged' ]]; then
  production_tag_creation_result='not required; tag already exists'
elif [[ "${PRODUCTION_PROMOTION_REQUESTED}" != 'true' ]]; then
  production_tag_creation_result='not requested'
elif [[ "${PRODUCTION_TAG_CREATION_RESULT:-}" == 'skipped' ]]; then
  production_tag_creation_result='not run'
else
  production_tag_creation_result='unknown result'
fi

if [[ "${PRODUCTION_DISTRIBUTION_JOB_RESULT:-}" == 'success' && "${PRODUCTION_DISTRIBUTION_RESULT:-}" == 'success' ]]; then
  distribution_result='published successfully'
elif [[ "${PRODUCTION_DISTRIBUTION_JOB_RESULT:-}" == 'failure' ]]; then
  distribution_result='failed'
elif [[ "${PRODUCTION_DISTRIBUTION_JOB_RESULT:-}" == 'cancelled' ]]; then
  distribution_result='cancelled'
elif [[ "${PRODUCTION_DISTRIBUTION_JOB_RESULT:-}" == 'skipped' && "${PRODUCTION_PROMOTION_REQUESTED}" != 'true' ]]; then
  distribution_result='not requested'
elif [[ "${PRODUCTION_DISTRIBUTION_JOB_RESULT:-}" == 'skipped' && "${PRODUCTION_PREFLIGHT_RESULT:-}" == 'already_tagged' ]]; then
  distribution_result='not run; Production tag already exists'
elif [[ "${PRODUCTION_DISTRIBUTION_JOB_RESULT:-}" == 'skipped' ]]; then
  distribution_result='not run'
else
  distribution_result='unknown result'
fi

docker_image='not published'
if [[ -n "${PRODUCTION_DOCKER_IMAGE_TAG:-}" && -n "${DOCKER_REPOSITORY:-}" ]]; then
  docker_image="${DOCKER_REPOSITORY}:${PRODUCTION_DOCKER_IMAGE_TAG}"
fi

helm_chart_repository="${CHART_REPOSITORY_URL:-not available}"
helm_chart_version="${PRODUCTION_HELM_CHART_VERSION:-not published}"

wire_builds_commit='not updated'
if [[ -n "${PRODUCTION_WIRE_BUILDS_COMMIT_SHA:-}" && -n "${GITHUB_SERVER_URL:-}" && -n "${WIRE_BUILDS_REPOSITORY:-}" ]]; then
  wire_builds_commit_url="${GITHUB_SERVER_URL}/${WIRE_BUILDS_REPOSITORY}/commit/${PRODUCTION_WIRE_BUILDS_COMMIT_SHA}"
  wire_builds_commit="[${PRODUCTION_WIRE_BUILDS_COMMIT_SHA}](${wire_builds_commit_url})"
fi

production_frontend_url='not available'
if [[ "${PRODUCTION_WEBAPP_URL:-}" == http://* || "${PRODUCTION_WEBAPP_URL:-}" == https://* ]]; then
  production_frontend_url="[${PRODUCTION_WEBAPP_URL}](${PRODUCTION_WEBAPP_URL})"
fi

{
  echo '## Release Cloud'
  echo
  echo "- Release branch: ${release_branch}"
  echo "- Release identifier: ${release_identifier}"
  echo "- Commit SHA: ${commit_link}"
  echo "- Artifact version: ${artifact_version}"
  echo "- Artifact name: ${artifact_name}"
  echo "- Artifact checksum: ${artifact_checksum}"
  echo "- Workflow run URL: ${workflow_run_link}"

  if [[ -n "${RELEASE_REASON:-}" ]]; then
    echo "- Manual reason: ${RELEASE_REASON}"
  fi

  echo
  echo '### Beta deployment'
  echo
  echo "- Result: ${beta_result}"
  echo "- Release branch: ${release_branch}"
  echo "- Commit SHA: ${commit_link}"
  echo "- Artifact version: ${artifact_version}"
  echo '- GitHub Environment: wire-webapp-beta'
  echo "- Target environment: ${BETA_ELASTIC_BEANSTALK_ENVIRONMENT_NAME:-not available}"
  echo "- Frontend URL: ${beta_frontend_url}"
  echo "- REST backend URL: ${BETA_RUNTIME_BACKEND_REST:-not available}"
  echo "- WebSocket backend URL: ${BETA_RUNTIME_BACKEND_WS:-not available}"

  if [[ "${BETA_RESULT:-}" == 'success' ]]; then
    echo '- Runtime verification: /version, /commit, and /config.js'
  fi

  echo "- Beta tag: ${beta_tag}"
  echo "- Artifact name: ${artifact_name}"
  echo "- Artifact checksum: ${artifact_checksum}"
  echo "- Workflow run URL: ${workflow_run_link}"

  echo
  echo '### E2E system gate'
  echo
  echo "- Result: ${e2e_result}"
  echo "- Commit SHA: ${commit_link}"
  echo "- Artifact version: ${artifact_version}"
  echo "- Target environment: ${E2E_ELASTIC_BEANSTALK_ENVIRONMENT_NAME:-not available}"
  echo "- Frontend URL: ${e2e_frontend_url}"
  echo "- REST backend URL: ${E2E_RUNTIME_BACKEND_REST:-not available}"
  echo "- WebSocket backend URL: ${E2E_RUNTIME_BACKEND_WS:-not available}"

  if [[ "${E2E_RESULT:-}" == 'success' ]]; then
    echo '- Runtime verification: /version, /commit, and /config.js'
  fi

  echo "- Playwright report URL: ${playwright_report}"
  echo "- Testiny run name: ${testiny_run_name}"
  echo "- Workflow run URL: ${workflow_run_link}"

  echo
  echo '### Production deployment'
  echo
  echo "- Result: ${production_result}"
  echo "- Production promotion requested: ${production_promotion_requested}"
  echo "- Production preflight result: ${production_preflight_result}"

  if [[ -n "${production_skip_reason}" ]]; then
    echo "- Skip reason: ${production_skip_reason}"
  fi

  echo "- Commit SHA: ${commit_link}"
  echo "- Artifact version: ${artifact_version}"
  echo "- Target environment: ${PRODUCTION_ENVIRONMENT_NAME:-not available}"
  echo "- Frontend URL: ${production_frontend_url}"
  echo "- REST backend URL: ${PRODUCTION_RUNTIME_BACKEND_REST:-not available}"
  echo "- WebSocket backend URL: ${PRODUCTION_RUNTIME_BACKEND_WS:-not available}"
  echo "- Runtime verification result: ${production_runtime_verification_result}"

  if [[ "${PRODUCTION_RUNTIME_VERIFICATION_RESULT:-}" == 'success' ]]; then
    echo '- Runtime verification: /version, /commit, and /config.js'
  fi

  echo "- Production tag: ${production_tag}"
  echo "- Production tag creation result: ${production_tag_creation_result}"
  echo "- Approval gate: ${approval_gate}"
  echo "- Workflow run URL: ${workflow_run_link}"

  echo
  echo '### Production distribution'
  echo
  echo "- Result: ${distribution_result}"
  echo "- Docker image: ${docker_image}"
  echo "- Helm chart repository: ${helm_chart_repository}"
  echo "- Helm chart version: ${helm_chart_version}"
  echo "- wire-builds/main commit: ${wire_builds_commit}"
  echo "- Workflow run URL: ${workflow_run_link}"
}
