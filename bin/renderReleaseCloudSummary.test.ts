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

import {readReleaseCloudSummaryInput, renderReleaseCloudSummary} from './renderReleaseCloudSummary.ts';
import type {ReleaseCloudSummaryInput} from './renderReleaseCloudSummary.ts';
import {Maybe} from 'true-myth';

const baselineReleaseCloudSummaryInput: ReleaseCloudSummaryInput = {
  beta: {
    deploymentResult: Maybe.just('success'),
    environmentName: Maybe.just('wire-webapp-beta'),
    runtimeBackendRest: Maybe.just('https://beta-backend.example.com'),
    runtimeBackendWebSocket: Maybe.just('wss://beta-backend.example.com'),
    tagCreationResult: Maybe.just('success'),
    tagName: Maybe.just('2026-07-17.1-beta.1'),
    webappUrl: Maybe.just('https://beta.example.com'),
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
    environmentName: Maybe.just('wire-webapp-e2e'),
    reportUrl: Maybe.just('https://e2e.example.com/report/123'),
    result: Maybe.just('success'),
    runtimeBackendRest: Maybe.just('https://e2e-backend.example.com'),
    runtimeBackendWebSocket: Maybe.just('wss://e2e-backend.example.com'),
    testinyRunName: Maybe.just('Release 2026-07-17.1 2026-07-17.1-beta.1'),
    webappUrl: Maybe.just('https://e2e.example.com'),
  },
  github: {
    repository: Maybe.just('wireapp/wire-webapp'),
    runId: Maybe.just('123456789'),
    serverUrl: Maybe.just('https://github.com'),
    wireBuildsRepository: Maybe.just('wireapp/wire-builds'),
  },
  production: {
    createdTagName: Maybe.nothing<string>(),
    deploymentResult: Maybe.just('skipped'),
    deploymentRequired: Maybe.just(false),
    environmentName: Maybe.just('wire-webapp-production'),
    plannedTagName: Maybe.just('2026-07-17.1-production'),
    preflightJobResult: Maybe.just('skipped'),
    preflightResult: Maybe.just('skipped'),
    promotionRequested: false,
    runtimeBackendRest: Maybe.just('https://production-backend.example.com'),
    runtimeBackendWebSocket: Maybe.just('wss://production-backend.example.com'),
    runtimeVerificationResult: Maybe.just('skipped'),
    skippedReason: Maybe.nothing<string>(),
    tagCreationResult: Maybe.just('skipped'),
    webappUrl: Maybe.just('https://production.example.com'),
  },
  release: {
    artifactAssetVersion: Maybe.just('2026-07-17.1-1234567'),
    artifactBuiltAt: Maybe.just('2026-07-20T06:18:03.123Z'),
    artifactChecksum: Maybe.just('sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'),
    artifactName: Maybe.just('wire-webapp-release-2026-07-17.1'),
    artifactVersion: Maybe.just('2026-07-17.1'),
    branch: Maybe.just('release/2026-07-17.1'),
    commitSha: Maybe.just('1234567890abcdef1234567890abcdef12345678'),
    identifier: Maybe.just('2026-07-17.1'),
    manualReason: Maybe.nothing<string>(),
  },
};

function assertSummaryContract(summary: string): void {
  expect(summary).toMatch(/\n$/);
  expect(summary).toMatch(/^## Release Cloud$/m);
  expect(summary).toMatch(/^### Beta deployment$/m);
  expect(summary).toMatch(/^### E2E system gate$/m);
  expect(summary).toMatch(/^### Production deployment$/m);
  expect(summary).toMatch(/^### Production distribution$/m);
  expect(summary).not.toMatch(/\]\(\)/);
  expect(summary).not.toMatch(/\/releases\/tag\//);
  expect(summary).not.toMatch(/undefined/);
  expect(summary).not.toMatch(/null/);
  expect(summary).not.toMatch(/Artifact version:/);
}

test('renders a successful Beta-only release', () => {
  const summary = renderReleaseCloudSummary(baselineReleaseCloudSummaryInput);

  assertSummaryContract(summary);
  expect(summary).toMatch(/^- Release identifier: 2026-07-17\.1$/m);
  expect(summary).toMatch(
    /^- Commit SHA: \[1234567890abcdef1234567890abcdef12345678\]\(https:\/\/github\.com\/wireapp\/wire-webapp\/commit\/1234567890abcdef1234567890abcdef12345678\)$/m,
  );
  expect(summary).toContain(
    [
      '- Webapp version: 2026-07-17.1',
      '- Asset version: 2026-07-17.1-1234567',
      '- Commit SHA: [1234567890abcdef1234567890abcdef12345678](https://github.com/wireapp/wire-webapp/commit/1234567890abcdef1234567890abcdef12345678)',
      '- Built at (UTC): 2026-07-20T06:18:03.123Z',
    ].join('\n'),
  );
  expect(summary).toMatch(/^- Built at \(UTC\): 2026-07-20T06:18:03\.123Z$/m);
  expect(summary).toMatch(/### Beta deployment[\s\S]*?- Webapp version: 2026-07-17\.1/m);
  expect(summary).toMatch(/### Beta deployment[\s\S]*?- Asset version: 2026-07-17\.1-1234567/m);
  expect(summary).toMatch(/### E2E system gate[\s\S]*?- Webapp version: 2026-07-17\.1/m);
  expect(summary).toMatch(/### E2E system gate[\s\S]*?- Asset version: 2026-07-17\.1-1234567/m);
  expect(summary).toMatch(/### Production deployment[\s\S]*?- Webapp version: 2026-07-17\.1/m);
  expect(summary).toMatch(/### Production deployment[\s\S]*?- Asset version: 2026-07-17\.1-1234567/m);
  expect(summary).toMatch(/### Beta deployment[\s\S]*?- Result: deployed and verified successfully/m);
  expect(summary).toMatch(/### E2E system gate[\s\S]*?- Result: passed successfully/m);
  expect(summary).toMatch(/### Production deployment[\s\S]*?- Result: not requested/m);
  expect(summary).toMatch(/### Production distribution[\s\S]*?- Result: not requested/m);
  expect(summary).toMatch(
    /- Beta tag: \[2026-07-17\.1-beta\.1\]\(https:\/\/github\.com\/wireapp\/wire-webapp\/tree\/2026-07-17\.1-beta\.1\)/,
  );
  expect(summary).toMatch(/- Production tag: not requested/);
  expect(summary).not.toMatch(/### Production deployment[\s\S]*?- Production tag: \[/m);
});

test('renders a successful Production release with distribution metadata', () => {
  const productionTagName = '2026-07-17.1-production';
  const productionImageTag = `${productionTagName}-v0.34.9-0-1234567`;
  const wireBuildsCommitSha = 'abcdefabcdefabcdefabcdefabcdefabcdefabcd';
  const input: ReleaseCloudSummaryInput = {
    ...baselineReleaseCloudSummaryInput,
    distribution: {
      ...baselineReleaseCloudSummaryInput.distribution,
      dockerImageTag: Maybe.just(productionImageTag),
      distributionJobResult: Maybe.just('success'),
      distributionResult: Maybe.just('success'),
      helmChartVersion: Maybe.just('0.8.0-pre.3175'),
      wireBuildsCommitSha: Maybe.just(wireBuildsCommitSha),
    },
    production: {
      ...baselineReleaseCloudSummaryInput.production,
      createdTagName: Maybe.just(productionTagName),
      deploymentResult: Maybe.just('success'),
      preflightJobResult: Maybe.just('success'),
      preflightResult: Maybe.just('ready'),
      promotionRequested: true,
      runtimeVerificationResult: Maybe.just('success'),
      tagCreationResult: Maybe.just('success'),
    },
  };
  const summary = renderReleaseCloudSummary(input);

  assertSummaryContract(summary);
  expect(summary).toMatch(/### Production deployment[\s\S]*?- Result: deployed, verified, and tagged successfully/m);
  expect(summary).toMatch(/### Production deployment[\s\S]*?- Runtime verification result: verified successfully/m);
  expect(summary).toMatch(/### Production deployment[\s\S]*?- Runtime verification: \/version and \/config\.js/m);
  expect(summary).toMatch(
    /- Production tag: \[2026-07-17\.1-production\]\(https:\/\/github\.com\/wireapp\/wire-webapp\/tree\/2026-07-17\.1-production\)/,
  );
  expect(summary).toMatch(/- Docker image: quay\.io\/wire\/webapp:2026-07-17\.1-production-v0\.34\.9-0-1234567/);
  expect(summary).toMatch(/- Helm chart repository: https:\/\/charts\.example\.com\/webapp/);
  expect(summary).toMatch(/- Helm chart version: 0\.8\.0-pre\.3175/);
  expect(summary).toMatch(
    /- wire-builds\/main commit: \[abcdefabcdefabcdefabcdefabcdefabcdefabcd\]\(https:\/\/github\.com\/wireapp\/wire-builds\/commit\/abcdefabcdefabcdefabcdefabcdefabcdefabcd\)/,
  );
  expect(summary).toMatch(/- Approval gate: wire-webapp-production GitHub Environment settings/);
});

test('renders a Production release that is already tagged', () => {
  const plannedProductionTagName = '2026-07-17.1-production';
  const input: ReleaseCloudSummaryInput = {
    ...baselineReleaseCloudSummaryInput,
    production: {
      ...baselineReleaseCloudSummaryInput.production,
      createdTagName: Maybe.just('created-production-tag'),
      deploymentResult: Maybe.just('skipped'),
      preflightJobResult: Maybe.just('success'),
      preflightResult: Maybe.just('already_tagged'),
      promotionRequested: true,
      tagCreationResult: Maybe.just('skipped'),
    },
  };
  const summary = renderReleaseCloudSummary(input);

  assertSummaryContract(summary);
  expect(summary).toMatch(/### Production deployment[\s\S]*?- Result: already tagged; deployment not required/m);
  expect(summary).toMatch(/### Production deployment[\s\S]*?- Production preflight result: already tagged/m);
  expect(summary).toMatch(
    new RegExp(
      `- Production tag: \\[${plannedProductionTagName}\\]\\(https://github\\.com/wireapp/wire-webapp/tree/${plannedProductionTagName}\\)`,
    ),
  );
  expect(summary).toMatch(/- Production tag creation result: not required; tag already exists/);
  expect(summary).toMatch(/### Production distribution[\s\S]*?- Result: not run; Production tag already exists/m);
  expect(summary).not.toMatch(/created-production-tag/);
});

test('renders a Production runtime verification failure', () => {
  const input: ReleaseCloudSummaryInput = {
    ...baselineReleaseCloudSummaryInput,
    production: {
      ...baselineReleaseCloudSummaryInput.production,
      deploymentResult: Maybe.just('success'),
      preflightJobResult: Maybe.just('success'),
      preflightResult: Maybe.just('ready'),
      promotionRequested: true,
      runtimeVerificationResult: Maybe.just('failure'),
      tagCreationResult: Maybe.just('skipped'),
    },
  };
  const summary = renderReleaseCloudSummary(input);

  assertSummaryContract(summary);
  expect(summary).toMatch(/### Production deployment[\s\S]*?- Result: deployed, but runtime verification failed/m);
  expect(summary).toMatch(/### Production deployment[\s\S]*?- Runtime verification result: failed/m);
  expect(summary).toMatch(/### Production deployment[\s\S]*?- Production tag: not created/m);
  expect(summary).toMatch(/### Production distribution[\s\S]*?- Result: not run/m);
  expect(summary).not.toMatch(/### Production deployment[\s\S]*?- Production tag: \[/m);
});

test('renders a Beta deployment failure with the remaining gates not run', () => {
  const input: ReleaseCloudSummaryInput = {
    ...baselineReleaseCloudSummaryInput,
    beta: {
      ...baselineReleaseCloudSummaryInput.beta,
      deploymentResult: Maybe.just('failure'),
      tagCreationResult: Maybe.just('skipped'),
    },
    e2e: {
      ...baselineReleaseCloudSummaryInput.e2e,
      result: Maybe.just('skipped'),
    },
    production: {
      ...baselineReleaseCloudSummaryInput.production,
      preflightJobResult: Maybe.just('skipped'),
      preflightResult: Maybe.just('skipped'),
    },
  };
  const summary = renderReleaseCloudSummary(input);

  assertSummaryContract(summary);
  expect(summary).toMatch(/### Beta deployment[\s\S]*?- Result: failed/m);
  expect(summary).toMatch(/### Beta deployment[\s\S]*?- Beta tag: not created/m);
  expect(summary).toMatch(/### E2E system gate[\s\S]*?- Result: did not run/m);
});

test('renders unknown results instead of treating unknown job states as success', () => {
  const parsedInput = readReleaseCloudSummaryInput({BETA_RESULT: 'unexpected'});
  const input: ReleaseCloudSummaryInput = {
    ...baselineReleaseCloudSummaryInput,
    beta: {
      ...baselineReleaseCloudSummaryInput.beta,
      deploymentResult: parsedInput.beta.deploymentResult,
    },
  };
  const summary = renderReleaseCloudSummary(input);

  assertSummaryContract(summary);
  expect(summary).toMatch(/### Beta deployment[\s\S]*?- Result: unknown result/m);
  expect(summary).not.toMatch(/### Beta deployment[\s\S]*?- Result: deployed and verified successfully/m);
});

test('uses not available for missing release metadata', () => {
  const input: ReleaseCloudSummaryInput = {
    ...baselineReleaseCloudSummaryInput,
    release: {
      ...baselineReleaseCloudSummaryInput.release,
      artifactBuiltAt: Maybe.nothing<string>(),
      artifactAssetVersion: Maybe.nothing<string>(),
      artifactChecksum: Maybe.nothing<string>(),
      artifactName: Maybe.nothing<string>(),
      artifactVersion: Maybe.nothing<string>(),
      commitSha: Maybe.nothing<string>(),
      identifier: Maybe.nothing<string>(),
    },
  };
  const summary = renderReleaseCloudSummary(input);

  assertSummaryContract(summary);
  expect(summary).toMatch(/- Artifact checksum: not available/);
  expect(summary).toMatch(/- Artifact name: not available/);
  expect(summary).toMatch(/### Beta deployment[\s\S]*?- Webapp version: not available/m);
  expect(summary).toMatch(/### Beta deployment[\s\S]*?- Asset version: not available/m);
  expect(summary).toMatch(/- Built at \(UTC\): not available/);
  expect(summary).toMatch(/- Commit SHA: not available/);
  expect(summary).toMatch(/- Release identifier: not available/);
});

test('reads artifact build time from the workflow environment', () => {
  const input = readReleaseCloudSummaryInput({
    ARTIFACT_ASSET_VERSION: '2026-07-17.1-1234567',
    ARTIFACT_BUILT_AT: '2026-07-20T06:18:03.123Z',
  });

  expect(input.release.artifactAssetVersion.unwrapOr('not available')).toBe('2026-07-17.1-1234567');
  expect(input.release.artifactBuiltAt.unwrapOr('not available')).toBe('2026-07-20T06:18:03.123Z');
});

test('renders a main-style artifact with the same webapp and asset versions', () => {
  const input: ReleaseCloudSummaryInput = {
    ...baselineReleaseCloudSummaryInput,
    release: {
      ...baselineReleaseCloudSummaryInput.release,
      artifactAssetVersion: Maybe.just('main-bdb93c9'),
      artifactVersion: Maybe.just('main-bdb93c9'),
    },
  };
  const summary = renderReleaseCloudSummary(input);

  expect(summary).toMatch(/^- Webapp version: main-bdb93c9$/m);
  expect(summary).toMatch(/^- Asset version: main-bdb93c9$/m);
});

test('renders Manual reason only when a reason is provided', () => {
  const inputWithReason: ReleaseCloudSummaryInput = {
    ...baselineReleaseCloudSummaryInput,
    release: {
      ...baselineReleaseCloudSummaryInput.release,
      manualReason: Maybe.just('manual release for validation'),
    },
  };
  const summaryWithReason = renderReleaseCloudSummary(inputWithReason);
  const summaryWithoutReason = renderReleaseCloudSummary(baselineReleaseCloudSummaryInput);

  assertSummaryContract(summaryWithReason);
  assertSummaryContract(summaryWithoutReason);
  expect(summaryWithReason).toMatch(/- Manual reason: manual release for validation/);
  expect(summaryWithoutReason).not.toMatch(/- Manual reason:/);
});
