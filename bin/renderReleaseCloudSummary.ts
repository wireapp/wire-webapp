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

export type WorkflowJobResult = 'cancelled' | 'failure' | 'skipped' | 'success';

export type ReleaseMetadata = {
  readonly artifactChecksum: string | undefined;
  readonly artifactBuiltAt: string | undefined;
  readonly artifactName: string | undefined;
  readonly artifactVersion: string | undefined;
  readonly branch: string | undefined;
  readonly commitSha: string | undefined;
  readonly identifier: string | undefined;
  readonly manualReason: string | undefined;
};

export type BetaSummaryInput = {
  readonly deploymentResult: WorkflowJobResult | undefined;
  readonly environmentName: string | undefined;
  readonly runtimeBackendRest: string | undefined;
  readonly runtimeBackendWebSocket: string | undefined;
  readonly tagCreationResult: WorkflowJobResult | undefined;
  readonly tagName: string | undefined;
  readonly webappUrl: string | undefined;
};

export type E2ESummaryInput = {
  readonly environmentName: string | undefined;
  readonly reportUrl: string | undefined;
  readonly result: WorkflowJobResult | undefined;
  readonly runtimeBackendRest: string | undefined;
  readonly runtimeBackendWebSocket: string | undefined;
  readonly testinyRunName: string | undefined;
  readonly webappUrl: string | undefined;
};

export type ProductionPreflightResult = 'already_tagged' | 'failure' | 'ready' | 'skipped';

export type ProductionSummaryInput = {
  readonly deploymentResult: WorkflowJobResult | undefined;
  readonly environmentName: string | undefined;
  readonly preflightJobResult: WorkflowJobResult | undefined;
  readonly preflightResult: ProductionPreflightResult | undefined;
  readonly promotionRequested: boolean;
  readonly runtimeBackendRest: string | undefined;
  readonly runtimeBackendWebSocket: string | undefined;
  readonly runtimeVerificationResult: WorkflowJobResult | undefined;
  readonly skippedReason: string | undefined;
  readonly tagCreationResult: WorkflowJobResult | undefined;
  readonly createdTagName: string | undefined;
  readonly plannedTagName: string | undefined;
  readonly webappUrl: string | undefined;
};

export type ProductionDistributionSummaryInput = {
  readonly dockerImageTag: string | undefined;
  readonly distributionJobResult: WorkflowJobResult | undefined;
  readonly distributionResult: WorkflowJobResult | undefined;
  readonly helmChartVersion: string | undefined;
  readonly wireBuildsCommitSha: string | undefined;
  readonly dockerRepository: string | undefined;
  readonly chartRepositoryUrl: string | undefined;
};

export type GitHubLinkContext = {
  readonly repository: string | undefined;
  readonly runId: string | undefined;
  readonly serverUrl: string | undefined;
  readonly wireBuildsRepository: string | undefined;
};

export type ReleaseCloudSummaryInput = {
  readonly beta: BetaSummaryInput;
  readonly distribution: ProductionDistributionSummaryInput;
  readonly e2e: E2ESummaryInput;
  readonly github: GitHubLinkContext;
  readonly production: ProductionSummaryInput;
  readonly release: ReleaseMetadata;
};

function readOptionalEnvironmentValue(environment: NodeJS.ProcessEnv, variableName: string): string | undefined {
  const environmentValue = environment[variableName];

  if (environmentValue === undefined || environmentValue === '') {
    return undefined;
  }

  return environmentValue;
}

function readWorkflowJobResult(environment: NodeJS.ProcessEnv, variableName: string): WorkflowJobResult | undefined {
  const environmentValue = readOptionalEnvironmentValue(environment, variableName);

  switch (environmentValue) {
    case 'cancelled':
    case 'failure':
    case 'skipped':
    case 'success':
      return environmentValue;
    default:
      return undefined;
  }
}

function readProductionPreflightResult(environment: NodeJS.ProcessEnv): ProductionPreflightResult | undefined {
  const environmentValue = readOptionalEnvironmentValue(environment, 'PRODUCTION_PREFLIGHT_RESULT');

  switch (environmentValue) {
    case 'already_tagged':
    case 'failure':
    case 'ready':
    case 'skipped':
      return environmentValue;
    default:
      return undefined;
  }
}

export function readReleaseCloudSummaryInput(environment: NodeJS.ProcessEnv): ReleaseCloudSummaryInput {
  return {
    beta: {
      deploymentResult: readWorkflowJobResult(environment, 'BETA_RESULT'),
      environmentName: readOptionalEnvironmentValue(environment, 'BETA_ELASTIC_BEANSTALK_ENVIRONMENT_NAME'),
      runtimeBackendRest: readOptionalEnvironmentValue(environment, 'BETA_RUNTIME_BACKEND_REST'),
      runtimeBackendWebSocket: readOptionalEnvironmentValue(environment, 'BETA_RUNTIME_BACKEND_WS'),
      tagCreationResult: readWorkflowJobResult(environment, 'BETA_TAG_CREATION_RESULT'),
      tagName: readOptionalEnvironmentValue(environment, 'BETA_TAG_NAME'),
      webappUrl: readOptionalEnvironmentValue(environment, 'BETA_WEBAPP_URL'),
    },
    distribution: {
      chartRepositoryUrl: readOptionalEnvironmentValue(environment, 'CHART_REPOSITORY_URL'),
      dockerImageTag: readOptionalEnvironmentValue(environment, 'PRODUCTION_DOCKER_IMAGE_TAG'),
      dockerRepository: readOptionalEnvironmentValue(environment, 'DOCKER_REPOSITORY'),
      distributionJobResult: readWorkflowJobResult(environment, 'PRODUCTION_DISTRIBUTION_JOB_RESULT'),
      distributionResult: readWorkflowJobResult(environment, 'PRODUCTION_DISTRIBUTION_RESULT'),
      helmChartVersion: readOptionalEnvironmentValue(environment, 'PRODUCTION_HELM_CHART_VERSION'),
      wireBuildsCommitSha: readOptionalEnvironmentValue(environment, 'PRODUCTION_WIRE_BUILDS_COMMIT_SHA'),
    },
    e2e: {
      environmentName: readOptionalEnvironmentValue(environment, 'E2E_ELASTIC_BEANSTALK_ENVIRONMENT_NAME'),
      reportUrl: readOptionalEnvironmentValue(environment, 'E2E_REPORT_URL'),
      result: readWorkflowJobResult(environment, 'E2E_RESULT'),
      runtimeBackendRest: readOptionalEnvironmentValue(environment, 'E2E_RUNTIME_BACKEND_REST'),
      runtimeBackendWebSocket: readOptionalEnvironmentValue(environment, 'E2E_RUNTIME_BACKEND_WS'),
      testinyRunName: environment.TESTINY_RUN_NAME,
      webappUrl: readOptionalEnvironmentValue(environment, 'E2E_WEBAPP_URL'),
    },
    github: {
      repository: readOptionalEnvironmentValue(environment, 'GITHUB_REPOSITORY'),
      runId: readOptionalEnvironmentValue(environment, 'GITHUB_RUN_ID'),
      serverUrl: readOptionalEnvironmentValue(environment, 'GITHUB_SERVER_URL'),
      wireBuildsRepository: readOptionalEnvironmentValue(environment, 'WIRE_BUILDS_REPOSITORY'),
    },
    production: {
      createdTagName: readOptionalEnvironmentValue(environment, 'CREATED_PRODUCTION_TAG_NAME'),
      deploymentResult: readWorkflowJobResult(environment, 'PRODUCTION_DEPLOYMENT_RESULT'),
      environmentName: readOptionalEnvironmentValue(environment, 'PRODUCTION_ENVIRONMENT_NAME'),
      plannedTagName: readOptionalEnvironmentValue(environment, 'PLANNED_PRODUCTION_TAG_NAME'),
      preflightJobResult: readWorkflowJobResult(environment, 'PRODUCTION_PREFLIGHT_JOB_RESULT'),
      preflightResult: readProductionPreflightResult(environment),
      promotionRequested: environment.PRODUCTION_PROMOTION_REQUESTED === 'true',
      runtimeBackendRest: readOptionalEnvironmentValue(environment, 'PRODUCTION_RUNTIME_BACKEND_REST'),
      runtimeBackendWebSocket: readOptionalEnvironmentValue(environment, 'PRODUCTION_RUNTIME_BACKEND_WS'),
      runtimeVerificationResult: readWorkflowJobResult(environment, 'PRODUCTION_RUNTIME_VERIFICATION_RESULT'),
      skippedReason: readOptionalEnvironmentValue(environment, 'PRODUCTION_SKIPPED_REASON'),
      tagCreationResult: readWorkflowJobResult(environment, 'PRODUCTION_TAG_CREATION_RESULT'),
      webappUrl: readOptionalEnvironmentValue(environment, 'PRODUCTION_WEBAPP_URL'),
    },
    release: {
      artifactBuiltAt: readOptionalEnvironmentValue(environment, 'ARTIFACT_BUILT_AT'),
      artifactChecksum: readOptionalEnvironmentValue(environment, 'ARTIFACT_CHECKSUM'),
      artifactName: readOptionalEnvironmentValue(environment, 'ARTIFACT_NAME'),
      artifactVersion: readOptionalEnvironmentValue(environment, 'ARTIFACT_VERSION'),
      branch: readOptionalEnvironmentValue(environment, 'RELEASE_BRANCH'),
      commitSha: readOptionalEnvironmentValue(environment, 'RELEASE_COMMIT_SHA'),
      identifier: readOptionalEnvironmentValue(environment, 'RELEASE_IDENTIFIER'),
      manualReason: readOptionalEnvironmentValue(environment, 'RELEASE_REASON'),
    },
  };
}

function formatValueOrFallback(value: string | undefined, fallback: string = 'not available'): string {
  return value === undefined ? fallback : value;
}

function formatMarkdownLink(label: string, url: string): string {
  return `[${label}](${url})`;
}

function formatOptionalFrontendUrl(url: string | undefined): string {
  if (url !== undefined && (url.startsWith('http://') || url.startsWith('https://'))) {
    return formatMarkdownLink(url, url);
  }

  return 'not available';
}

function formatOptionalReportUrl(url: string | undefined): string {
  if (url !== undefined && (url.startsWith('http://') || url.startsWith('https://'))) {
    return formatMarkdownLink(url, url);
  }

  return 'not available';
}

function formatCommitLink(commitSha: string | undefined, github: GitHubLinkContext): string {
  if (commitSha !== undefined && github.serverUrl !== undefined && github.repository !== undefined) {
    return formatMarkdownLink(commitSha, `${github.serverUrl}/${github.repository}/commit/${commitSha}`);
  }

  return 'not available';
}

function formatWorkflowRunLink(github: GitHubLinkContext): string {
  if (github.serverUrl !== undefined && github.repository !== undefined && github.runId !== undefined) {
    const workflowRunUrl = `${github.serverUrl}/${github.repository}/actions/runs/${github.runId}`;
    return formatMarkdownLink(workflowRunUrl, workflowRunUrl);
  }

  return 'not available';
}

function formatBetaResult(result: WorkflowJobResult | undefined): string {
  switch (result) {
    case 'success':
      return 'deployed and verified successfully';
    case 'failure':
      return 'failed';
    case 'skipped':
      return 'did not run';
    case 'cancelled':
      return 'cancelled';
    default:
      return 'unknown result';
  }
}

function formatBetaTag(input: BetaSummaryInput, github: GitHubLinkContext): string {
  if (
    input.tagCreationResult === 'success' &&
    input.tagName !== undefined &&
    github.serverUrl !== undefined &&
    github.repository !== undefined
  ) {
    return formatMarkdownLink(input.tagName, `${github.serverUrl}/${github.repository}/tree/${input.tagName}`);
  }

  if (
    input.tagCreationResult === 'failure' ||
    input.tagCreationResult === 'cancelled' ||
    input.tagCreationResult === 'skipped'
  ) {
    return 'not created';
  }

  return 'not available';
}

function formatE2EResult(result: WorkflowJobResult | undefined): string {
  switch (result) {
    case 'success':
      return 'passed successfully';
    case 'failure':
      return 'failed';
    case 'skipped':
      return 'did not run';
    case 'cancelled':
      return 'cancelled';
    default:
      return 'unknown result';
  }
}

function formatProductionPreflightResult(input: ProductionSummaryInput): string {
  switch (input.preflightResult) {
    case 'ready':
      return 'ready';
    case 'already_tagged':
      return 'already tagged';
    case 'skipped':
      return 'skipped';
    case 'failure':
      return 'failed';
    default:
      switch (input.preflightJobResult) {
        case 'failure':
          return 'failed';
        case 'cancelled':
          return 'cancelled';
        case 'skipped':
          return 'not run';
        default:
          return 'unknown result';
      }
  }
}

function formatProductionRuntimeVerificationResult(result: WorkflowJobResult | undefined): string {
  switch (result) {
    case 'success':
      return 'verified successfully';
    case 'failure':
      return 'failed';
    case 'skipped':
      return 'not run';
    case 'cancelled':
      return 'cancelled';
    default:
      return 'unknown result';
  }
}

function formatProductionResult(input: ProductionSummaryInput): string {
  if (input.promotionRequested === false) {
    return 'not requested';
  }

  if (input.preflightResult === 'already_tagged') {
    return 'already tagged; deployment not required';
  }

  if (input.preflightJobResult === 'failure') {
    return 'failed during preflight';
  }

  if (input.preflightJobResult === 'cancelled') {
    return 'cancelled during preflight';
  }

  if (input.preflightJobResult === 'skipped') {
    return 'not run because Production preflight did not run';
  }

  if (input.preflightResult !== 'ready') {
    return 'unknown result';
  }

  if (input.deploymentResult === 'failure') {
    return 'failed during deployment';
  }

  if (input.deploymentResult === 'cancelled') {
    return 'cancelled during deployment';
  }

  if (input.deploymentResult === 'skipped') {
    return 'not run';
  }

  if (input.deploymentResult !== 'success') {
    return 'unknown result';
  }

  if (input.runtimeVerificationResult === 'failure') {
    return 'deployed, but runtime verification failed';
  }

  if (input.runtimeVerificationResult === 'cancelled') {
    return 'deployed, but runtime verification was cancelled';
  }

  if (input.runtimeVerificationResult === 'skipped') {
    return 'deployed, but runtime verification did not run';
  }

  if (input.runtimeVerificationResult !== 'success') {
    return 'unknown result';
  }

  if (input.tagCreationResult === 'success') {
    return 'deployed, verified, and tagged successfully';
  }

  if (input.tagCreationResult === 'failure') {
    return 'deployed and verified, but tag creation failed';
  }

  if (input.tagCreationResult === 'cancelled') {
    return 'deployed and verified, but tag creation was cancelled';
  }

  return 'unknown result';
}

function formatProductionSkipReason(input: ProductionSummaryInput): string | undefined {
  if (input.skippedReason !== undefined) {
    return input.skippedReason;
  }

  if (input.promotionRequested === false) {
    return 'Production promotion was not requested';
  }

  if (input.preflightJobResult === 'skipped') {
    return 'Production preflight did not run';
  }

  if (input.deploymentResult === 'skipped') {
    return 'Production deployment did not run';
  }

  return undefined;
}

function formatApprovalGate(input: ProductionSummaryInput): string {
  if (input.promotionRequested === false) {
    return 'not requested';
  }

  if (input.preflightResult === 'already_tagged') {
    return 'not required; the release is already tagged as Production';
  }

  if (input.preflightResult === 'ready') {
    return `${formatValueOrFallback(input.environmentName)} GitHub Environment settings`;
  }

  return 'not reached';
}

function formatProductionTag(input: ProductionSummaryInput, github: GitHubLinkContext): string {
  if (
    input.tagCreationResult === 'success' &&
    input.createdTagName !== undefined &&
    github.serverUrl !== undefined &&
    github.repository !== undefined
  ) {
    return formatMarkdownLink(
      input.createdTagName,
      `${github.serverUrl}/${github.repository}/tree/${input.createdTagName}`,
    );
  }

  if (
    input.preflightResult === 'already_tagged' &&
    input.plannedTagName !== undefined &&
    github.serverUrl !== undefined &&
    github.repository !== undefined
  ) {
    return formatMarkdownLink(
      input.plannedTagName,
      `${github.serverUrl}/${github.repository}/tree/${input.plannedTagName}`,
    );
  }

  if (input.promotionRequested === false) {
    return 'not requested';
  }

  if (input.preflightResult === 'already_tagged') {
    return 'not available';
  }

  if (
    input.tagCreationResult === 'failure' ||
    input.tagCreationResult === 'cancelled' ||
    input.tagCreationResult === 'skipped' ||
    input.deploymentResult === 'failure' ||
    input.deploymentResult === 'cancelled' ||
    input.deploymentResult === 'skipped' ||
    input.runtimeVerificationResult === 'failure' ||
    input.runtimeVerificationResult === 'cancelled' ||
    input.runtimeVerificationResult === 'skipped' ||
    input.preflightJobResult === 'failure' ||
    input.preflightJobResult === 'cancelled' ||
    input.preflightJobResult === 'skipped'
  ) {
    return 'not created';
  }

  return 'not available';
}

function formatProductionTagCreationResult(input: ProductionSummaryInput): string {
  switch (input.tagCreationResult) {
    case 'success':
      return 'created successfully';
    case 'failure':
      return 'failed';
    case 'cancelled':
      return 'cancelled';
    default:
      if (input.preflightResult === 'already_tagged') {
        return 'not required; tag already exists';
      }

      if (input.promotionRequested === false) {
        return 'not requested';
      }

      if (input.tagCreationResult === 'skipped') {
        return 'not run';
      }

      return 'unknown result';
  }
}

function formatDistributionResult(
  input: ProductionSummaryInput,
  distribution: ProductionDistributionSummaryInput,
): string {
  if (distribution.distributionJobResult === 'success' && distribution.distributionResult === 'success') {
    return 'published successfully';
  }

  if (distribution.distributionJobResult === 'failure') {
    return 'failed';
  }

  if (distribution.distributionJobResult === 'cancelled') {
    return 'cancelled';
  }

  if (distribution.distributionJobResult === 'skipped' && input.promotionRequested === false) {
    return 'not requested';
  }

  if (distribution.distributionJobResult === 'skipped' && input.preflightResult === 'already_tagged') {
    return 'not run; Production tag already exists';
  }

  if (distribution.distributionJobResult === 'skipped') {
    return 'not run';
  }

  return 'unknown result';
}

function formatDockerImage(distribution: ProductionDistributionSummaryInput): string {
  if (distribution.dockerImageTag !== undefined && distribution.dockerRepository !== undefined) {
    return `${distribution.dockerRepository}:${distribution.dockerImageTag}`;
  }

  return 'not published';
}

function formatWireBuildsCommit(distribution: ProductionDistributionSummaryInput, github: GitHubLinkContext): string {
  if (
    distribution.wireBuildsCommitSha !== undefined &&
    github.serverUrl !== undefined &&
    github.wireBuildsRepository !== undefined
  ) {
    return formatMarkdownLink(
      distribution.wireBuildsCommitSha,
      `${github.serverUrl}/${github.wireBuildsRepository}/commit/${distribution.wireBuildsCommitSha}`,
    );
  }

  return 'not updated';
}

function renderBetaSection(input: ReleaseCloudSummaryInput, commitLink: string, workflowRunLink: string): string {
  return [
    '### Beta deployment',
    '',
    `- Result: ${formatBetaResult(input.beta.deploymentResult)}`,
    `- Release branch: ${formatValueOrFallback(input.release.branch)}`,
    `- Commit SHA: ${commitLink}`,
    `- Webapp version: ${formatValueOrFallback(input.release.artifactVersion)}`,
    '- GitHub Environment: wire-webapp-beta',
    `- Target environment: ${formatValueOrFallback(input.beta.environmentName)}`,
    `- Frontend URL: ${formatOptionalFrontendUrl(input.beta.webappUrl)}`,
    `- REST backend URL: ${formatValueOrFallback(input.beta.runtimeBackendRest)}`,
    `- WebSocket backend URL: ${formatValueOrFallback(input.beta.runtimeBackendWebSocket)}`,
    ...(input.beta.deploymentResult === 'success' ? ['- Runtime verification: /version, /commit, and /config.js'] : []),
    `- Beta tag: ${formatBetaTag(input.beta, input.github)}`,
    `- Artifact name: ${formatValueOrFallback(input.release.artifactName)}`,
    `- Artifact checksum: ${formatValueOrFallback(input.release.artifactChecksum)}`,
    `- Workflow run URL: ${workflowRunLink}`,
  ].join('\n');
}

function renderE2ESection(input: ReleaseCloudSummaryInput, commitLink: string, workflowRunLink: string): string {
  const testinyRunName =
    input.release.identifier !== undefined && input.beta.tagName !== undefined
      ? formatValueOrFallback(input.e2e.testinyRunName)
      : 'not run';

  return [
    '### E2E system gate',
    '',
    `- Result: ${formatE2EResult(input.e2e.result)}`,
    `- Commit SHA: ${commitLink}`,
    `- Webapp version: ${formatValueOrFallback(input.release.artifactVersion)}`,
    `- Target environment: ${formatValueOrFallback(input.e2e.environmentName)}`,
    `- Frontend URL: ${formatOptionalFrontendUrl(input.e2e.webappUrl)}`,
    `- REST backend URL: ${formatValueOrFallback(input.e2e.runtimeBackendRest)}`,
    `- WebSocket backend URL: ${formatValueOrFallback(input.e2e.runtimeBackendWebSocket)}`,
    ...(input.e2e.result === 'success' ? ['- Runtime verification: /version, /commit, and /config.js'] : []),
    `- Playwright report URL: ${formatOptionalReportUrl(input.e2e.reportUrl)}`,
    `- Testiny run name: ${testinyRunName}`,
    `- Workflow run URL: ${workflowRunLink}`,
  ].join('\n');
}

function renderProductionSection(input: ReleaseCloudSummaryInput, commitLink: string, workflowRunLink: string): string {
  const productionSkipReason = formatProductionSkipReason(input.production);

  return [
    '### Production deployment',
    '',
    `- Result: ${formatProductionResult(input.production)}`,
    `- Production promotion requested: ${input.production.promotionRequested ? 'true' : 'false'}`,
    `- Production preflight result: ${formatProductionPreflightResult(input.production)}`,
    ...(productionSkipReason === undefined ? [] : [`- Skip reason: ${productionSkipReason}`]),
    `- Commit SHA: ${commitLink}`,
    `- Webapp version: ${formatValueOrFallback(input.release.artifactVersion)}`,
    `- Target environment: ${formatValueOrFallback(input.production.environmentName)}`,
    `- Frontend URL: ${formatOptionalFrontendUrl(input.production.webappUrl)}`,
    `- REST backend URL: ${formatValueOrFallback(input.production.runtimeBackendRest)}`,
    `- WebSocket backend URL: ${formatValueOrFallback(input.production.runtimeBackendWebSocket)}`,
    `- Runtime verification result: ${formatProductionRuntimeVerificationResult(input.production.runtimeVerificationResult)}`,
    ...(input.production.runtimeVerificationResult === 'success'
      ? ['- Runtime verification: /version, /commit, and /config.js']
      : []),
    `- Production tag: ${formatProductionTag(input.production, input.github)}`,
    `- Production tag creation result: ${formatProductionTagCreationResult(input.production)}`,
    `- Approval gate: ${formatApprovalGate(input.production)}`,
    `- Workflow run URL: ${workflowRunLink}`,
  ].join('\n');
}

function renderProductionDistributionSection(input: ReleaseCloudSummaryInput, workflowRunLink: string): string {
  return [
    '### Production distribution',
    '',
    `- Result: ${formatDistributionResult(input.production, input.distribution)}`,
    `- Docker image: ${formatDockerImage(input.distribution)}`,
    `- Helm chart repository: ${formatValueOrFallback(input.distribution.chartRepositoryUrl)}`,
    `- Helm chart version: ${formatValueOrFallback(input.distribution.helmChartVersion, 'not published')}`,
    `- wire-builds/main commit: ${formatWireBuildsCommit(input.distribution, input.github)}`,
    `- Workflow run URL: ${workflowRunLink}`,
  ].join('\n');
}

export function renderReleaseCloudSummary(input: ReleaseCloudSummaryInput): string {
  const commitLink = formatCommitLink(input.release.commitSha, input.github);
  const workflowRunLink = formatWorkflowRunLink(input.github);
  const releaseMetadata = [
    '## Release Cloud',
    '',
    `- Release branch: ${formatValueOrFallback(input.release.branch)}`,
    `- Release identifier: ${formatValueOrFallback(input.release.identifier)}`,
    `- Commit SHA: ${commitLink}`,
    `- Built at (UTC): ${formatValueOrFallback(input.release.artifactBuiltAt)}`,
    `- Artifact name: ${formatValueOrFallback(input.release.artifactName)}`,
    `- Artifact checksum: ${formatValueOrFallback(input.release.artifactChecksum)}`,
    `- Workflow run URL: ${workflowRunLink}`,
    ...(input.release.manualReason === undefined ? [] : [`- Manual reason: ${input.release.manualReason}`]),
  ].join('\n');

  return (
    [
      releaseMetadata,
      renderBetaSection(input, commitLink, workflowRunLink),
      renderE2ESection(input, commitLink, workflowRunLink),
      renderProductionSection(input, commitLink, workflowRunLink),
      renderProductionDistributionSection(input, workflowRunLink),
    ].join('\n\n') + '\n'
  );
}

function main(): void {
  try {
    const input = readReleaseCloudSummaryInput(process.env);
    const summary = renderReleaseCloudSummary(input);

    process.stdout.write(summary);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  }
}

if (process.argv[1]?.endsWith('renderReleaseCloudSummary.ts') === true) {
  main();
}
