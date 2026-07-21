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
import test from 'node:test';
import {Maybe} from 'true-myth';

import {renderReleaseCandidateSummary} from './renderReleaseCloudSummary.ts';
import type {ProductionPreflightResult, ReleaseCloudSummaryInput, WorkflowJobResult} from './renderReleaseCloudSummary.ts';

const baselineReleaseCandidateInput: ReleaseCloudSummaryInput = {
  beta: {
    deploymentResult: Maybe.just('success'),
    environmentName: Maybe.just('wire-webapp-staging'),
    runtimeBackendRest: Maybe.just('https://prod-nginz-https.wire.com'),
    runtimeBackendWebSocket: Maybe.just('wss://prod-nginz-ssl.wire.com'),
    tagCreationResult: Maybe.just('success'),
    tagName: Maybe.just('2026-07-17.1-beta.1'),
    webappUrl: Maybe.just('https://wire-webapp-beta.wire.com/'),
  },
  distribution: {
    chartRepositoryUrl: Maybe.just('https://charts.example.com/webapp'),
    dockerImageTag: Maybe.nothing<string>(),
    dockerRepository: Maybe.just('quay.io/wire/webapp'),
    distributionJobResult: Maybe.just('skipped'),
    distributionResult: Maybe.just('skipped'),
    helmChartVersion: Maybe.nothing<string>(),
    wireBuildsCommitSha: Maybe.nothing<string>(),
  },
  e2e: {
    environmentName: Maybe.just('wire-webapp-precommit-3'),
    reportUrl: Maybe.just('https://e2e.example.com/report/123'),
    result: Maybe.just('success'),
    runtimeBackendRest: Maybe.just('https://staging-nginz-https.zinfra.io/'),
    runtimeBackendWebSocket: Maybe.just('wss://staging-nginz-ssl.zinfra.io/'),
    testinyRunName: Maybe.just('Release 2026-07-17.1 2026-07-17.1-beta.1'),
    webappUrl: Maybe.just('https://wire-webapp-precommit-3.zinfra.io/'),
  },
  github: {
    repository: Maybe.just('wireapp/wire-webapp'),
    runId: Maybe.just('123456789'),
    serverUrl: Maybe.just('https://github.com'),
    wireBuildsRepository: Maybe.just('wireapp/wire-builds'),
  },
  production: {
    createdTagName: Maybe.nothing<string>(),
    deploymentResult: Maybe.nothing<WorkflowJobResult>(),
    deploymentRequired: Maybe.just(true),
    environmentName: Maybe.just('wire-webapp-prod'),
    plannedTagName: Maybe.just('2026-07-17.1-production'),
    preflightJobResult: Maybe.just('success'),
    preflightResult: Maybe.just('ready'),
    promotionRequested: true,
    runtimeBackendRest: Maybe.nothing<string>(),
    runtimeBackendWebSocket: Maybe.nothing<string>(),
    runtimeVerificationResult: Maybe.nothing<WorkflowJobResult>(),
    skippedReason: Maybe.nothing<string>(),
    tagCreationResult: Maybe.nothing<WorkflowJobResult>(),
    webappUrl: Maybe.nothing<string>(),
  },
  release: {
    artifactAssetVersion: Maybe.just('2026-07-17.1-1234567'),
    artifactBuiltAt: Maybe.just('2026-07-20T06:18:03.123Z'),
    artifactChecksum: Maybe.just('sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'),
    artifactName: Maybe.just('release-cloud-ebs-2026-07-17.1-123456789-1'),
    artifactVersion: Maybe.just('2026-07-17.1'),
    branch: Maybe.just('release/2026-07-17.1'),
    commitSha: Maybe.just('1234567890abcdef1234567890abcdef12345678'),
    identifier: Maybe.just('2026-07-17.1'),
    manualReason: Maybe.nothing<string>(),
  },
};

function assertCandidateSummaryContract(summary: string): void {
  assert.match(summary, /\n$/);
  assert.match(summary, /^## Release Cloud release candidate$/m);
  assert.match(summary, /^### Beta deployment$/m);
  assert.match(summary, /^### E2E system gate$/m);
  assert.match(summary, /^### Production readiness$/m);
  assert.doesNotMatch(summary, /^### Production deployment$/m);
  assert.doesNotMatch(summary, /^### Production distribution$/m);
  assert.doesNotMatch(summary, /undefined/);
  assert.doesNotMatch(summary, /null/);
  assert.doesNotMatch(summary, /\]\(\)/);
}

test('renders a successful release candidate ready for Production approval', () => {
  const input: ReleaseCloudSummaryInput = {
    ...baselineReleaseCandidateInput,
    release: {
      ...baselineReleaseCandidateInput.release,
      manualReason: Maybe.just('manual release for validation'),
    },
  };
  const summary = renderReleaseCandidateSummary(input);

  assertCandidateSummaryContract(summary);
  assert.match(summary, /- Release branch: release\/2026-07-17\.1/);
  assert.match(
    summary,
    /- Commit SHA: \[1234567890abcdef1234567890abcdef12345678\]\(https:\/\/github\.com\/wireapp\/wire-webapp\/commit\/1234567890abcdef1234567890abcdef12345678\)/,
  );
  assert.match(summary, /- Artifact checksum: sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/);
  assert.match(summary, /- Beta tag: \[2026-07-17\.1-beta\.1\]\(https:\/\/github\.com\/wireapp\/wire-webapp\/tree\/2026-07-17\.1-beta\.1\)/);
  assert.match(summary, /- Runtime verification result: verified successfully/);
  assert.match(summary, /- Playwright report URL: \[https:\/\/e2e\.example\.com\/report\/123\]\(https:\/\/e2e\.example\.com\/report\/123\)/);
  assert.match(summary, /- Production preflight job result: success/);
  assert.match(summary, /- Production preflight result: ready/);
  assert.match(summary, /- Production deployment required: true/);
  assert.match(summary, /- Planned Production tag: \[2026-07-17\.1-production\]\(https:\/\/github\.com\/wireapp\/wire-webapp\/tree\/2026-07-17\.1-production\)/);
  assert.match(summary, /- Approval status: Production is ready and waiting for approval through the wire-webapp-prod GitHub Environment/);
  assert.match(summary, /- Manual reason: manual release for validation/);
  assert.match(summary, /- Workflow run URL: \[https:\/\/github\.com\/wireapp\/wire-webapp\/actions\/runs\/123456789\]\(https:\/\/github\.com\/wireapp\/wire-webapp\/actions\/runs\/123456789\)/);
});

test('renders a Beta-only release candidate without Production noise', () => {
  const input: ReleaseCloudSummaryInput = {
    ...baselineReleaseCandidateInput,
    production: {
      ...baselineReleaseCandidateInput.production,
      deploymentRequired: Maybe.just(false),
      preflightJobResult: Maybe.just('skipped'),
      preflightResult: Maybe.just('skipped'),
      promotionRequested: false,
    },
  };
  const summary = renderReleaseCandidateSummary(input);

  assertCandidateSummaryContract(summary);
  assert.match(summary, /- Production promotion requested: false/);
  assert.match(summary, /- Production deployment required: false/);
  assert.match(summary, /- Production skip reason: Production promotion was not requested/);
  assert.match(summary, /- Approval status: Production promotion was not requested/);
  assert.match(summary, /- Planned Production tag: not requested/);
});

test('renders an already-tagged Production release candidate without an approval gate', () => {
  const input: ReleaseCloudSummaryInput = {
    ...baselineReleaseCandidateInput,
    production: {
      ...baselineReleaseCandidateInput.production,
      deploymentRequired: Maybe.just(false),
      preflightResult: Maybe.just('already_tagged'),
      skippedReason: Maybe.just('Release is already tagged as Production with 2026-07-17.1-production'),
    },
  };
  const summary = renderReleaseCandidateSummary(input);

  assertCandidateSummaryContract(summary);
  assert.match(summary, /- Production deployment required: false/);
  assert.match(summary, /- Production skip reason: Release is already tagged as Production with 2026-07-17\.1-production/);
  assert.match(summary, /- Approval status: Production deployment is not required because the release is already tagged/);
});

test('renders an E2E failure as an earlier gate blocking Production preflight', () => {
  const input: ReleaseCloudSummaryInput = {
    ...baselineReleaseCandidateInput,
    e2e: {
      ...baselineReleaseCandidateInput.e2e,
      result: Maybe.just('failure'),
    },
    production: {
      ...baselineReleaseCandidateInput.production,
      deploymentRequired: Maybe.nothing<boolean>(),
      preflightJobResult: Maybe.just('skipped'),
      preflightResult: Maybe.nothing<ProductionPreflightResult>(),
    },
  };
  const summary = renderReleaseCandidateSummary(input);

  assertCandidateSummaryContract(summary);
  assert.match(summary, /### E2E system gate[\s\S]*?- Result: failed/);
  assert.match(summary, /- Production preflight job result: skipped/);
  assert.match(summary, /- Production preflight result: not run/);
  assert.match(summary, /- Approval status: Production is blocked because an earlier gate failed: E2E system gate failed; Production preflight was skipped/);
  assert.match(summary, /- Playwright report URL: \[https:\/\/e2e\.example\.com\/report\/123\]/);
});

test('renders a Beta deployment failure as an earlier gate blocking Production', () => {
  const input: ReleaseCloudSummaryInput = {
    ...baselineReleaseCandidateInput,
    beta: {
      ...baselineReleaseCandidateInput.beta,
      deploymentResult: Maybe.just('failure'),
      tagCreationResult: Maybe.just('skipped'),
      tagName: Maybe.nothing<string>(),
    },
    e2e: {
      ...baselineReleaseCandidateInput.e2e,
      result: Maybe.just('skipped'),
    },
    production: {
      ...baselineReleaseCandidateInput.production,
      deploymentRequired: Maybe.nothing<boolean>(),
      preflightJobResult: Maybe.just('skipped'),
      preflightResult: Maybe.nothing<ProductionPreflightResult>(),
    },
  };
  const summary = renderReleaseCandidateSummary(input);

  assertCandidateSummaryContract(summary);
  assert.match(summary, /### Beta deployment[\s\S]*?- Result: failed/);
  assert.match(summary, /### E2E system gate[\s\S]*?- Result: did not run/);
  assert.match(summary, /- Approval status: Production is blocked because an earlier gate failed: Beta deployment failed; Production preflight was skipped/);
});

test('renders cancelled E2E and preflight states distinctly', () => {
  const cancelledE2EInput: ReleaseCloudSummaryInput = {
    ...baselineReleaseCandidateInput,
    e2e: {
      ...baselineReleaseCandidateInput.e2e,
      result: Maybe.just('cancelled'),
    },
    production: {
      ...baselineReleaseCandidateInput.production,
      deploymentRequired: Maybe.nothing<boolean>(),
      preflightJobResult: Maybe.just('skipped'),
      preflightResult: Maybe.nothing<ProductionPreflightResult>(),
    },
  };
  const cancelledE2ESummary = renderReleaseCandidateSummary(cancelledE2EInput);
  assert.match(cancelledE2ESummary, /### E2E system gate[\s\S]*?- Result: cancelled/);
  assert.match(cancelledE2ESummary, /- Approval status: Production preflight was skipped because the E2E system gate was cancelled/);

  const cancelledPreflightInput: ReleaseCloudSummaryInput = {
    ...baselineReleaseCandidateInput,
    production: {
      ...baselineReleaseCandidateInput.production,
      deploymentRequired: Maybe.nothing<boolean>(),
      preflightJobResult: Maybe.just('cancelled'),
      preflightResult: Maybe.nothing<ProductionPreflightResult>(),
    },
  };
  const cancelledPreflightSummary = renderReleaseCandidateSummary(cancelledPreflightInput);
  assert.match(cancelledPreflightSummary, /- Production preflight job result: cancelled/);
  assert.match(cancelledPreflightSummary, /- Approval status: Production preflight was cancelled; Production approval is unavailable/);
});

test('uses deliberate fallbacks when optional candidate values are missing', () => {
  const input: ReleaseCloudSummaryInput = {
    ...baselineReleaseCandidateInput,
    beta: {
      ...baselineReleaseCandidateInput.beta,
      tagCreationResult: Maybe.just('skipped'),
      tagName: Maybe.nothing<string>(),
    },
    e2e: {
      ...baselineReleaseCandidateInput.e2e,
      reportUrl: Maybe.nothing<string>(),
      testinyRunName: Maybe.nothing<string>(),
    },
    github: {
      repository: Maybe.nothing<string>(),
      runId: Maybe.nothing<string>(),
      serverUrl: Maybe.nothing<string>(),
      wireBuildsRepository: Maybe.nothing<string>(),
    },
    production: {
      ...baselineReleaseCandidateInput.production,
      deploymentRequired: Maybe.nothing<boolean>(),
      plannedTagName: Maybe.nothing<string>(),
      preflightJobResult: Maybe.nothing<WorkflowJobResult>(),
      preflightResult: Maybe.nothing<ProductionPreflightResult>(),
    },
    release: {
      ...baselineReleaseCandidateInput.release,
      artifactChecksum: Maybe.nothing<string>(),
      artifactName: Maybe.nothing<string>(),
      commitSha: Maybe.nothing<string>(),
      identifier: Maybe.nothing<string>(),
    },
  };
  const summary = renderReleaseCandidateSummary(input);

  assertCandidateSummaryContract(summary);
  assert.match(summary, /- Commit SHA: not available/);
  assert.match(summary, /- Artifact name: not available/);
  assert.match(summary, /- Artifact checksum: not available/);
  assert.match(summary, /- Playwright report URL: not available/);
  assert.match(summary, /- Planned Production tag: not available/);
  assert.match(summary, /- Production preflight job result: not available/);
  assert.match(summary, /- Approval status: Production approval status is unavailable or unexpected/);
});
