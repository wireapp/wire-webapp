/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see http://www.gnu.org/licenses/.
 *
 */

import assert from 'node:assert';
import {spawnSync} from 'node:child_process';

type ReleaseCloudEnvironment = Readonly<Record<string, string>>;

type ReleaseCloudSummaryRendererResult = Readonly<{
  exitCode: number | null;
  standardOutput: string;
  standardError: string;
}>;

const baselineReleaseCloudEnvironment: ReleaseCloudEnvironment = {
  ARTIFACT_CHECKSUM: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  ARTIFACT_NAME: 'wire-webapp-release-2026-07-17.1',
  ARTIFACT_VERSION: '2026.07.17.1',
  BETA_RESULT: 'success',
  BETA_ELASTIC_BEANSTALK_ENVIRONMENT_NAME: 'wire-webapp-beta',
  BETA_RUNTIME_BACKEND_REST: 'https://beta-backend.example.com',
  BETA_RUNTIME_BACKEND_WS: 'wss://beta-backend.example.com',
  BETA_TAG_CREATION_RESULT: 'success',
  BETA_TAG_NAME: '2026-07-17.1-beta.1',
  BETA_WEBAPP_URL: 'https://beta.example.com',
  CHART_REPOSITORY_URL: 'https://charts.example.com/webapp',
  DOCKER_REPOSITORY: 'quay.io/wire/webapp',
  E2E_RUNTIME_BACKEND_REST: 'https://e2e-backend.example.com',
  E2E_RUNTIME_BACKEND_WS: 'wss://e2e-backend.example.com',
  E2E_ELASTIC_BEANSTALK_ENVIRONMENT_NAME: 'wire-webapp-e2e',
  E2E_REPORT_URL: 'https://e2e.example.com/report/123',
  E2E_RESULT: 'success',
  E2E_WEBAPP_URL: 'https://e2e.example.com',
  PRODUCTION_DEPLOYMENT_RESULT: 'skipped',
  PRODUCTION_DISTRIBUTION_JOB_RESULT: 'skipped',
  PRODUCTION_DISTRIBUTION_RESULT: 'skipped',
  PRODUCTION_ENVIRONMENT_NAME: 'wire-webapp-production',
  PRODUCTION_PREFLIGHT_JOB_RESULT: 'skipped',
  PRODUCTION_PREFLIGHT_RESULT: 'skipped',
  PRODUCTION_PROMOTION_REQUESTED: 'false',
  PRODUCTION_RUNTIME_VERIFICATION_RESULT: 'skipped',
  PRODUCTION_RUNTIME_BACKEND_REST: 'https://production-backend.example.com',
  PRODUCTION_RUNTIME_BACKEND_WS: 'wss://production-backend.example.com',
  PRODUCTION_WEBAPP_URL: 'https://production.example.com',
  PRODUCTION_DOCKER_IMAGE_TAG: '',
  PRODUCTION_HELM_CHART_VERSION: '',
  PRODUCTION_SKIPPED_REASON: '',
  PRODUCTION_TAG_CREATION_RESULT: 'skipped',
  CREATED_PRODUCTION_TAG_NAME: '',
  PLANNED_PRODUCTION_TAG_NAME: '2026-07-17.1-production',
  PRODUCTION_WIRE_BUILDS_COMMIT_SHA: '',
  RELEASE_BRANCH: 'release/2026-07-17.1',
  RELEASE_COMMIT_SHA: '1234567890abcdef1234567890abcdef12345678',
  RELEASE_IDENTIFIER: '2026-07-17.1',
  RELEASE_REASON: '',
  TESTINY_RUN_NAME: 'Release 2026-07-17.1 2026-07-17.1-beta.1',
  GITHUB_SERVER_URL: 'https://github.com',
  GITHUB_REPOSITORY: 'wireapp/wire-webapp',
  GITHUB_RUN_ID: '123456789',
  WIRE_BUILDS_REPOSITORY: 'wireapp/wire-builds',
};

function runReleaseCloudSummaryRenderer(
  environmentOverrides: Readonly<Partial<Record<string, string>>> = {},
): ReleaseCloudSummaryRendererResult {
  const rendererEnvironment: ReleaseCloudEnvironment = {
    PATH: process.env.PATH ?? '',
    ...baselineReleaseCloudEnvironment,
    ...environmentOverrides,
  };
  const rendererProcess = spawnSync('bash', ['.github/scripts/render-release-cloud-summary.sh'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: rendererEnvironment,
  });

  return {
    exitCode: rendererProcess.status,
    standardOutput: rendererProcess.stdout,
    standardError: rendererProcess.stderr,
  };
}

function assertSuccessfulRendererRun(result: ReleaseCloudSummaryRendererResult): void {
  assert.strictEqual(result.exitCode, 0);
  assert.strictEqual(result.standardError, '');
  assert.doesNotMatch(result.standardOutput, /\]\(\)/);
  assert.doesNotMatch(result.standardOutput, /\/releases\/tag\//);
}

function assertSummarySectionHeadings(summaryMarkdown: string): void {
  assert.match(summaryMarkdown, /^## Release Cloud$/m);
  assert.match(summaryMarkdown, /^### Beta deployment$/m);
  assert.match(summaryMarkdown, /^### E2E system gate$/m);
  assert.match(summaryMarkdown, /^### Production deployment$/m);
  assert.match(summaryMarkdown, /^### Production distribution$/m);
}

test('renders a successful Beta-only release', () => {
  const result = runReleaseCloudSummaryRenderer();

  assertSuccessfulRendererRun(result);
  assertSummarySectionHeadings(result.standardOutput);
  assert.match(result.standardOutput, /^- Result: deployed and verified successfully$/m);
  assert.match(result.standardOutput, /^- Result: passed successfully$/m);
  assert.match(result.standardOutput, /### Production deployment[\s\S]*?- Result: not requested/m);
  assert.match(
    result.standardOutput,
    /^- Beta tag: \[2026-07-17\.1-beta\.1\]\(https:\/\/github\.com\/wireapp\/wire-webapp\/tree\/2026-07-17\.1-beta\.1\)$/m,
  );
  assert.match(result.standardOutput, /^- Production tag: not requested$/m);
  assert.match(result.standardOutput, /^- Production tag creation result: not requested$/m);
  assert.match(result.standardOutput, /### Production distribution[\s\S]*?- Result: not requested/m);
  assert.doesNotMatch(result.standardOutput, /^- Production tag: \[/m);
});

test('renders a successful Production release with distribution metadata', () => {
  const productionTagName = '2026-07-17.1-production';
  const productionImageTag = `${productionTagName}-v0.34.9-0-1234567`;
  const wireBuildsCommitSha = 'abcdefabcdefabcdefabcdefabcdefabcdefabcd';
  const result = runReleaseCloudSummaryRenderer({
    PRODUCTION_PROMOTION_REQUESTED: 'true',
    PRODUCTION_PREFLIGHT_JOB_RESULT: 'success',
    PRODUCTION_PREFLIGHT_RESULT: 'ready',
    PRODUCTION_DEPLOYMENT_RESULT: 'success',
    PRODUCTION_RUNTIME_VERIFICATION_RESULT: 'success',
    PRODUCTION_TAG_CREATION_RESULT: 'success',
    CREATED_PRODUCTION_TAG_NAME: productionTagName,
    PRODUCTION_DISTRIBUTION_JOB_RESULT: 'success',
    PRODUCTION_DISTRIBUTION_RESULT: 'success',
    PRODUCTION_DOCKER_IMAGE_TAG: productionImageTag,
    PRODUCTION_HELM_CHART_VERSION: '0.8.0-pre.3175',
    PRODUCTION_WIRE_BUILDS_COMMIT_SHA: wireBuildsCommitSha,
  });

  assertSuccessfulRendererRun(result);
  assert.match(result.standardOutput, /^- Result: deployed, verified, and tagged successfully$/m);
  assert.match(result.standardOutput, /^- Runtime verification result: verified successfully$/m);
  assert.match(
    result.standardOutput,
    new RegExp(
      `^- Production tag: \\[${productionTagName}\\]\\(https://github\\.com/wireapp/wire-webapp/tree/${productionTagName}\\)$`,
      'm',
    ),
  );
  assert.match(result.standardOutput, /^- Production tag creation result: created successfully$/m);
  assert.match(result.standardOutput, new RegExp(`^- Docker image: quay\\.io/wire/webapp:${productionImageTag}$`, 'm'));
  assert.match(result.standardOutput, /^- Helm chart repository: https:\/\/charts\.example\.com\/webapp$/m);
  assert.match(result.standardOutput, /^- Helm chart version: 0\.8\.0-pre\.3175$/m);
  assert.match(
    result.standardOutput,
    new RegExp(
      `^- wire-builds/main commit: \\[${wireBuildsCommitSha}\\]\\(https://github\\.com/wireapp/wire-builds/commit/${wireBuildsCommitSha}\\)$`,
      'm',
    ),
  );
  assert.match(result.standardOutput, /^- Approval gate: wire-webapp-production GitHub Environment settings$/m);
});

test('renders a Production release that is already tagged', () => {
  const plannedProductionTagName = '2026-07-17.1-production';
  const result = runReleaseCloudSummaryRenderer({
    PRODUCTION_PROMOTION_REQUESTED: 'true',
    PRODUCTION_PREFLIGHT_JOB_RESULT: 'success',
    PRODUCTION_PREFLIGHT_RESULT: 'already_tagged',
    PRODUCTION_DEPLOYMENT_RESULT: 'skipped',
    PRODUCTION_TAG_CREATION_RESULT: 'skipped',
    PLANNED_PRODUCTION_TAG_NAME: plannedProductionTagName,
    CREATED_PRODUCTION_TAG_NAME: 'created-production-tag',
    PRODUCTION_DISTRIBUTION_JOB_RESULT: 'skipped',
    PRODUCTION_DISTRIBUTION_RESULT: 'skipped',
  });

  assertSuccessfulRendererRun(result);
  assert.match(result.standardOutput, /^- Result: already tagged; deployment not required$/m);
  assert.match(result.standardOutput, /^- Production preflight result: already tagged$/m);
  assert.match(
    result.standardOutput,
    new RegExp(
      `^- Production tag: \\[${plannedProductionTagName}\\]\\(https://github\\.com/wireapp/wire-webapp/tree/${plannedProductionTagName}\\)$`,
      'm',
    ),
  );
  assert.match(result.standardOutput, /^- Production tag creation result: not required; tag already exists$/m);
  assert.match(
    result.standardOutput,
    /### Production distribution[\s\S]*?- Result: not run; Production tag already exists/m,
  );
  assert.doesNotMatch(result.standardOutput, /created-production-tag/);
});

test('renders a Production runtime verification failure', () => {
  const result = runReleaseCloudSummaryRenderer({
    PRODUCTION_PROMOTION_REQUESTED: 'true',
    PRODUCTION_PREFLIGHT_JOB_RESULT: 'success',
    PRODUCTION_PREFLIGHT_RESULT: 'ready',
    PRODUCTION_DEPLOYMENT_RESULT: 'success',
    PRODUCTION_RUNTIME_VERIFICATION_RESULT: 'failure',
    PRODUCTION_TAG_CREATION_RESULT: 'skipped',
    CREATED_PRODUCTION_TAG_NAME: '',
    PRODUCTION_DISTRIBUTION_JOB_RESULT: 'skipped',
    PRODUCTION_DISTRIBUTION_RESULT: 'skipped',
  });

  assertSuccessfulRendererRun(result);
  assert.match(result.standardOutput, /^- Result: deployed, but runtime verification failed$/m);
  assert.match(result.standardOutput, /^- Runtime verification result: failed$/m);
  assert.match(result.standardOutput, /^- Production tag: not created$/m);
  assert.match(result.standardOutput, /^- Result: not run$/m);
  assert.doesNotMatch(result.standardOutput, /^- Production tag: \[/m);
});

test('renders a Beta deployment failure with the remaining gates not run', () => {
  const result = runReleaseCloudSummaryRenderer({
    BETA_RESULT: 'failure',
    BETA_TAG_CREATION_RESULT: 'skipped',
    E2E_RESULT: 'skipped',
    PRODUCTION_PREFLIGHT_JOB_RESULT: 'skipped',
    PRODUCTION_PREFLIGHT_RESULT: 'skipped',
  });

  assertSuccessfulRendererRun(result);
  assertSummarySectionHeadings(result.standardOutput);
  assert.match(result.standardOutput, /^- Result: failed$/m);
  assert.match(result.standardOutput, /^- Beta tag: not created$/m);
  assert.match(result.standardOutput, /^- Result: did not run$/m);
});

test('uses not available for missing build metadata', () => {
  const result = runReleaseCloudSummaryRenderer({
    ARTIFACT_CHECKSUM: '',
    ARTIFACT_NAME: '',
    ARTIFACT_VERSION: '',
    RELEASE_COMMIT_SHA: '',
    RELEASE_IDENTIFIER: '',
  });

  assertSuccessfulRendererRun(result);
  assertSummarySectionHeadings(result.standardOutput);
  assert.match(result.standardOutput, /^- Artifact checksum: not available$/m);
  assert.match(result.standardOutput, /^- Artifact name: not available$/m);
  assert.match(result.standardOutput, /^- Artifact version: not available$/m);
  assert.match(result.standardOutput, /^- Commit SHA: not available$/m);
  assert.match(result.standardOutput, /^- Release identifier: not available$/m);
});

test('renders Manual reason only when a reason is provided', () => {
  const reasonProvidedResult = runReleaseCloudSummaryRenderer({RELEASE_REASON: 'manual release for validation'});
  const reasonOmittedResult = runReleaseCloudSummaryRenderer({RELEASE_REASON: ''});

  assertSuccessfulRendererRun(reasonProvidedResult);
  assertSuccessfulRendererRun(reasonOmittedResult);
  assert.match(reasonProvidedResult.standardOutput, /^- Manual reason: manual release for validation$/m);
  assert.doesNotMatch(reasonOmittedResult.standardOutput, /^- Manual reason:/m);
});
