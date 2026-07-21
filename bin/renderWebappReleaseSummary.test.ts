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

import {
  readWebappReleaseSummaryInput,
  renderWebappReleaseCandidateSummary,
  renderWebappReleaseSummary,
} from './renderWebappReleaseSummary.ts';
import type {
  ProductionPreflightResult,
  WebappReleaseSummaryInput,
  WorkflowJobResult,
} from './renderWebappReleaseSummary.ts';
import {Maybe} from 'true-myth';

const baselineWebappReleaseSummaryInput: WebappReleaseSummaryInput = {
  beta: {
    deploymentResult: Maybe.just('success'),
    environmentName: Maybe.just('wire-webapp-beta'),
    runtimeBackendRest: Maybe.just('https://beta-backend.example.com'),
    runtimeBackendWebSocket: Maybe.just('wss://beta-backend.example.com'),
    runtimeVerificationResult: Maybe.just('success'),
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
  expect(summary).toMatch(/^## WebApp release$/m);
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

describe('WebApp release summary renderer', () => {
  it('renders a successful Beta-only release', () => {
    const summary = renderWebappReleaseSummary(baselineWebappReleaseSummaryInput);

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

  it('renders a successful Production release with distribution metadata', () => {
    const productionTagName = '2026-07-17.1-production';
    const productionImageTag = `${productionTagName}-v0.34.9-0-1234567`;
    const wireBuildsCommitSha = 'abcdefabcdefabcdefabcdefabcdefabcdefabcd';
    const input: WebappReleaseSummaryInput = {
      ...baselineWebappReleaseSummaryInput,
      distribution: {
        ...baselineWebappReleaseSummaryInput.distribution,
        dockerImageTag: Maybe.just(productionImageTag),
        distributionJobResult: Maybe.just('success'),
        distributionResult: Maybe.just('success'),
        helmChartVersion: Maybe.just('0.8.0-pre.3175'),
        wireBuildsCommitSha: Maybe.just(wireBuildsCommitSha),
      },
      production: {
        ...baselineWebappReleaseSummaryInput.production,
        createdTagName: Maybe.just(productionTagName),
        deploymentResult: Maybe.just('success'),
        preflightJobResult: Maybe.just('success'),
        preflightResult: Maybe.just('ready'),
        promotionRequested: true,
        runtimeVerificationResult: Maybe.just('success'),
        tagCreationResult: Maybe.just('success'),
      },
    };
    const summary = renderWebappReleaseSummary(input);

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

  it('renders a Production release that is already tagged', () => {
    const plannedProductionTagName = '2026-07-17.1-production';
    const input: WebappReleaseSummaryInput = {
      ...baselineWebappReleaseSummaryInput,
      production: {
        ...baselineWebappReleaseSummaryInput.production,
        createdTagName: Maybe.just('created-production-tag'),
        deploymentResult: Maybe.just('skipped'),
        preflightJobResult: Maybe.just('success'),
        preflightResult: Maybe.just('already_tagged'),
        promotionRequested: true,
        tagCreationResult: Maybe.just('skipped'),
      },
    };
    const summary = renderWebappReleaseSummary(input);

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

  it('renders a Production runtime verification failure', () => {
    const input: WebappReleaseSummaryInput = {
      ...baselineWebappReleaseSummaryInput,
      production: {
        ...baselineWebappReleaseSummaryInput.production,
        deploymentResult: Maybe.just('success'),
        preflightJobResult: Maybe.just('success'),
        preflightResult: Maybe.just('ready'),
        promotionRequested: true,
        runtimeVerificationResult: Maybe.just('failure'),
        tagCreationResult: Maybe.just('skipped'),
      },
    };
    const summary = renderWebappReleaseSummary(input);

    assertSummaryContract(summary);
    expect(summary).toMatch(/### Production deployment[\s\S]*?- Result: deployed, but runtime verification failed/m);
    expect(summary).toMatch(/### Production deployment[\s\S]*?- Runtime verification result: failed/m);
    expect(summary).toMatch(/### Production deployment[\s\S]*?- Production tag: not created/m);
    expect(summary).toMatch(/### Production distribution[\s\S]*?- Result: not run/m);
    expect(summary).not.toMatch(/### Production deployment[\s\S]*?- Production tag: \[/m);
  });

  it('renders a Beta deployment failure with the remaining gates not run', () => {
    const input: WebappReleaseSummaryInput = {
      ...baselineWebappReleaseSummaryInput,
      beta: {
        ...baselineWebappReleaseSummaryInput.beta,
        deploymentResult: Maybe.just('failure'),
        tagCreationResult: Maybe.just('skipped'),
      },
      e2e: {
        ...baselineWebappReleaseSummaryInput.e2e,
        result: Maybe.just('skipped'),
      },
      production: {
        ...baselineWebappReleaseSummaryInput.production,
        preflightJobResult: Maybe.just('skipped'),
        preflightResult: Maybe.just('skipped'),
      },
    };
    const summary = renderWebappReleaseSummary(input);

    assertSummaryContract(summary);
    expect(summary).toMatch(/### Beta deployment[\s\S]*?- Result: failed/m);
    expect(summary).toMatch(/### Beta deployment[\s\S]*?- Beta tag: not created/m);
    expect(summary).toMatch(/### E2E system gate[\s\S]*?- Result: did not run/m);
  });

  it('renders unknown results instead of treating unknown job states as success', () => {
    const parsedInput = readWebappReleaseSummaryInput({BETA_RESULT: 'unexpected'});
    const input: WebappReleaseSummaryInput = {
      ...baselineWebappReleaseSummaryInput,
      beta: {
        ...baselineWebappReleaseSummaryInput.beta,
        deploymentResult: parsedInput.beta.deploymentResult,
      },
    };
    const summary = renderWebappReleaseSummary(input);

    assertSummaryContract(summary);
    expect(summary).toMatch(/### Beta deployment[\s\S]*?- Result: unknown result/m);
    expect(summary).not.toMatch(/### Beta deployment[\s\S]*?- Result: deployed and verified successfully/m);
  });

  it('uses not available for missing release metadata', () => {
    const input: WebappReleaseSummaryInput = {
      ...baselineWebappReleaseSummaryInput,
      release: {
        ...baselineWebappReleaseSummaryInput.release,
        artifactBuiltAt: Maybe.nothing<string>(),
        artifactAssetVersion: Maybe.nothing<string>(),
        artifactChecksum: Maybe.nothing<string>(),
        artifactName: Maybe.nothing<string>(),
        artifactVersion: Maybe.nothing<string>(),
        commitSha: Maybe.nothing<string>(),
        identifier: Maybe.nothing<string>(),
      },
    };
    const summary = renderWebappReleaseSummary(input);

    assertSummaryContract(summary);
    expect(summary).toMatch(/- Artifact checksum: not available/);
    expect(summary).toMatch(/- Artifact name: not available/);
    expect(summary).toMatch(/### Beta deployment[\s\S]*?- Webapp version: not available/m);
    expect(summary).toMatch(/### Beta deployment[\s\S]*?- Asset version: not available/m);
    expect(summary).toMatch(/- Built at \(UTC\): not available/);
    expect(summary).toMatch(/- Commit SHA: not available/);
    expect(summary).toMatch(/- Release identifier: not available/);
  });

  it('reads artifact build time from the workflow environment', () => {
    const input = readWebappReleaseSummaryInput({
      ARTIFACT_ASSET_VERSION: '2026-07-17.1-1234567',
      ARTIFACT_BUILT_AT: '2026-07-20T06:18:03.123Z',
    });

    expect(input.release.artifactAssetVersion.unwrapOr('not available')).toBe('2026-07-17.1-1234567');
    expect(input.release.artifactBuiltAt.unwrapOr('not available')).toBe('2026-07-20T06:18:03.123Z');
  });

  it('renders a main-style artifact with the same webapp and asset versions', () => {
    const input: WebappReleaseSummaryInput = {
      ...baselineWebappReleaseSummaryInput,
      release: {
        ...baselineWebappReleaseSummaryInput.release,
        artifactAssetVersion: Maybe.just('main-bdb93c9'),
        artifactVersion: Maybe.just('main-bdb93c9'),
      },
    };
    const summary = renderWebappReleaseSummary(input);

    expect(summary).toMatch(/^- Webapp version: main-bdb93c9$/m);
    expect(summary).toMatch(/^- Asset version: main-bdb93c9$/m);
  });

  it('renders Manual reason only when a reason is provided', () => {
    const inputWithReason: WebappReleaseSummaryInput = {
      ...baselineWebappReleaseSummaryInput,
      release: {
        ...baselineWebappReleaseSummaryInput.release,
        manualReason: Maybe.just('manual release for validation'),
      },
    };
    const summaryWithReason = renderWebappReleaseSummary(inputWithReason);
    const summaryWithoutReason = renderWebappReleaseSummary(baselineWebappReleaseSummaryInput);

    assertSummaryContract(summaryWithReason);
    assertSummaryContract(summaryWithoutReason);
    expect(summaryWithReason).toMatch(/- Manual reason: manual release for validation/);
    expect(summaryWithoutReason).not.toMatch(/- Manual reason:/);
  });

  const baselineReleaseCandidateInput: WebappReleaseSummaryInput = {
    beta: {
      deploymentResult: Maybe.just('success'),
      environmentName: Maybe.just('wire-webapp-staging'),
      runtimeBackendRest: Maybe.just('https://prod-nginz-https.wire.com'),
      runtimeBackendWebSocket: Maybe.just('wss://prod-nginz-ssl.wire.com'),
      runtimeVerificationResult: Maybe.just('success'),
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
    expect(summary).toMatch(/\n$/);
    expect(summary).toMatch(/^## WebApp release candidate$/m);
    expect(summary).toMatch(/^### Beta deployment$/m);
    expect(summary).toMatch(/^### E2E system gate$/m);
    expect(summary).toMatch(/^### Production readiness$/m);
    expect(summary).not.toMatch(/^### Production deployment$/m);
    expect(summary).not.toMatch(/^### Production distribution$/m);
    expect(summary).not.toMatch(/undefined/);
    expect(summary).not.toMatch(/null/);
    expect(summary).not.toMatch(/\]\(\)/);
  }

  it('renders a successful release candidate ready for Production approval', () => {
    const input: WebappReleaseSummaryInput = {
      ...baselineReleaseCandidateInput,
      release: {
        ...baselineReleaseCandidateInput.release,
        manualReason: Maybe.just('manual release for validation'),
      },
    };
    const summary = renderWebappReleaseCandidateSummary(input);

    assertCandidateSummaryContract(summary);
    expect(summary).toMatch(/- Release branch: release\/2026-07-17\.1/);
    expect(summary).toMatch(
      /- Commit SHA: \[1234567890abcdef1234567890abcdef12345678\]\(https:\/\/github\.com\/wireapp\/wire-webapp\/commit\/1234567890abcdef1234567890abcdef12345678\)/,
    );
    expect(summary).toMatch(
      /- Artifact checksum: sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/,
    );
    expect(summary).toMatch(
      /- Beta tag: \[2026-07-17\.1-beta\.1\]\(https:\/\/github\.com\/wireapp\/wire-webapp\/tree\/2026-07-17\.1-beta\.1\)/,
    );
    expect(summary).toMatch(/### Beta deployment[\s\S]*?- Runtime verification result: verified successfully/m);
    expect(summary).toMatch(/### E2E system gate[\s\S]*?- Runtime verification: \/version and \/config\.js/m);
    expect(summary).toMatch(
      /- Playwright report URL: \[https:\/\/e2e\.example\.com\/report\/123\]\(https:\/\/e2e\.example\.com\/report\/123\)/,
    );
    expect(summary).toMatch(/- Production preflight job result: success/);
    expect(summary).toMatch(/- Production preflight result: ready/);
    expect(summary).toMatch(/- Production deployment required: true/);
    expect(summary).toMatch(/- Planned Production tag: `2026-07-17\.1-production`/);
    expect(summary).not.toMatch(/- Planned Production tag: \[/);
    expect(summary).toMatch(
      /- Approval status: Production is ready for deployment\. Approval is enforced through the wire-webapp-prod GitHub Environment\./,
    );
    expect(summary).toMatch(/- Manual reason: manual release for validation/);
    expect(summary).toMatch(
      /- Workflow run URL: \[https:\/\/github\.com\/wireapp\/wire-webapp\/actions\/runs\/123456789\]\(https:\/\/github\.com\/wireapp\/wire-webapp\/actions\/runs\/123456789\)/,
    );
  });

  it('does not infer Beta runtime verification failure from a failed deployment', () => {
    const input: WebappReleaseSummaryInput = {
      ...baselineReleaseCandidateInput,
      beta: {
        ...baselineReleaseCandidateInput.beta,
        deploymentResult: Maybe.just('failure'),
        runtimeVerificationResult: Maybe.nothing<WorkflowJobResult>(),
        tagCreationResult: Maybe.just('skipped'),
        tagName: Maybe.nothing<string>(),
      },
      e2e: {
        ...baselineReleaseCandidateInput.e2e,
        result: Maybe.just('skipped'),
        runtimeVerificationResult: Maybe.nothing<WorkflowJobResult>(),
      },
    };
    const summary = renderWebappReleaseCandidateSummary(input);

    expect(summary).toMatch(/### Beta deployment[\s\S]*?- Result: failed/m);
    expect(summary).not.toMatch(/### Beta deployment[\s\S]*?- Runtime verification result:/m);
    expect(summary).not.toMatch(/### Beta deployment[\s\S]*?- Runtime verification result: failed/m);
  });

  it('renders an explicit Beta runtime verification failure', () => {
    const input: WebappReleaseSummaryInput = {
      ...baselineReleaseCandidateInput,
      beta: {
        ...baselineReleaseCandidateInput.beta,
        deploymentResult: Maybe.just('failure'),
        runtimeVerificationResult: Maybe.just('failure'),
        tagCreationResult: Maybe.just('skipped'),
        tagName: Maybe.nothing<string>(),
      },
    };
    const summary = renderWebappReleaseCandidateSummary(input);

    expect(summary).toMatch(/### Beta deployment[\s\S]*?- Runtime verification result: failed/m);
  });

  it('does not report an independent runtime result for failed E2E tests', () => {
    const input: WebappReleaseSummaryInput = {
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
    const summary = renderWebappReleaseCandidateSummary(input);

    expect(summary).toMatch(/### E2E system gate[\s\S]*?- Result: failed/m);
    expect(summary).not.toMatch(/### E2E system gate[\s\S]*?- Runtime verification result:/m);
    expect(summary).not.toMatch(/### E2E system gate[\s\S]*?- Runtime verification: \/version and \/config\.js/m);
  });

  it('does not report runtime verification when precommit deployment failed first', () => {
    const input: WebappReleaseSummaryInput = {
      ...baselineReleaseCandidateInput,
      e2e: {
        ...baselineReleaseCandidateInput.e2e,
        result: Maybe.just('failure'),
      },
    };
    const summary = renderWebappReleaseCandidateSummary(input);

    expect(summary).toMatch(/### E2E system gate[\s\S]*?- Result: failed/m);
    expect(summary).not.toMatch(/### E2E system gate[\s\S]*?- Runtime verification result:/m);
  });

  it('uses no runtime verification result line when the dedicated information is missing', () => {
    const input: WebappReleaseSummaryInput = {
      ...baselineReleaseCandidateInput,
      beta: {
        ...baselineReleaseCandidateInput.beta,
        runtimeVerificationResult: Maybe.nothing<WorkflowJobResult>(),
      },
      e2e: {
        ...baselineReleaseCandidateInput.e2e,
      },
    };
    const summary = renderWebappReleaseCandidateSummary(input);

    expect(summary).not.toMatch(/Runtime verification result: unknown result/);
    expect(summary).not.toMatch(/### Beta deployment[\s\S]*?- Runtime verification result:/m);
    expect(summary).not.toMatch(/### E2E system gate[\s\S]*?- Runtime verification result:/m);
  });

  it('renders a Beta-only release candidate without Production noise', () => {
    const input: WebappReleaseSummaryInput = {
      ...baselineReleaseCandidateInput,
      production: {
        ...baselineReleaseCandidateInput.production,
        deploymentRequired: Maybe.just(false),
        preflightJobResult: Maybe.just('skipped'),
        preflightResult: Maybe.just('skipped'),
        promotionRequested: false,
      },
    };
    const summary = renderWebappReleaseCandidateSummary(input);

    assertCandidateSummaryContract(summary);
    expect(summary).toMatch(/- Production promotion requested: false/);
    expect(summary).toMatch(/- Production deployment required: false/);
    expect(summary).toMatch(/- Production skip reason: Production promotion was not requested/);
    expect(summary).toMatch(/- Approval status: Production promotion was not requested/);
    expect(summary).toMatch(/- Planned Production tag: not requested/);
  });

  it('renders an already-tagged Production release candidate without an approval gate', () => {
    const input: WebappReleaseSummaryInput = {
      ...baselineReleaseCandidateInput,
      production: {
        ...baselineReleaseCandidateInput.production,
        deploymentRequired: Maybe.just(false),
        preflightResult: Maybe.just('already_tagged'),
        skippedReason: Maybe.just('Release is already tagged as Production with 2026-07-17.1-production'),
      },
    };
    const summary = renderWebappReleaseCandidateSummary(input);

    assertCandidateSummaryContract(summary);
    expect(summary).toMatch(/- Production deployment required: false/);
    expect(summary).toMatch(
      /- Production skip reason: Release is already tagged as Production with 2026-07-17\.1-production/,
    );
    expect(summary).toMatch(
      /- Approval status: Production deployment is not required because the release is already tagged/,
    );
  });

  it('renders an E2E failure as an earlier gate blocking Production preflight', () => {
    const input: WebappReleaseSummaryInput = {
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
    const summary = renderWebappReleaseCandidateSummary(input);

    assertCandidateSummaryContract(summary);
    expect(summary).toMatch(/### E2E system gate[\s\S]*?- Result: failed/);
    expect(summary).toMatch(/- Production preflight job result: skipped/);
    expect(summary).toMatch(/- Production preflight result: not run/);
    expect(summary).toMatch(
      /- Approval status: Production is blocked because an earlier gate failed: E2E system gate failed; Production preflight was skipped/,
    );
    expect(summary).toMatch(/- Playwright report URL: \[https:\/\/e2e\.example\.com\/report\/123\]/);
  });

  it('renders a Beta deployment failure as an earlier gate blocking Production', () => {
    const input: WebappReleaseSummaryInput = {
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
    const summary = renderWebappReleaseCandidateSummary(input);

    assertCandidateSummaryContract(summary);
    expect(summary).toMatch(/### Beta deployment[\s\S]*?- Result: failed/);
    expect(summary).toMatch(/### E2E system gate[\s\S]*?- Result: did not run/);
    expect(summary).toMatch(
      /- Approval status: Production is blocked because an earlier gate failed: Beta deployment failed; Production preflight was skipped/,
    );
  });

  it('renders cancelled E2E and preflight states distinctly', () => {
    const cancelledE2EInput: WebappReleaseSummaryInput = {
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
    const cancelledE2ESummary = renderWebappReleaseCandidateSummary(cancelledE2EInput);
    expect(cancelledE2ESummary).toMatch(/### E2E system gate[\s\S]*?- Result: cancelled/);
    expect(cancelledE2ESummary).toMatch(
      /- Approval status: Production preflight was skipped because the E2E system gate was cancelled/,
    );

    const cancelledPreflightInput: WebappReleaseSummaryInput = {
      ...baselineReleaseCandidateInput,
      production: {
        ...baselineReleaseCandidateInput.production,
        deploymentRequired: Maybe.nothing<boolean>(),
        preflightJobResult: Maybe.just('cancelled'),
        preflightResult: Maybe.nothing<ProductionPreflightResult>(),
      },
    };
    const cancelledPreflightSummary = renderWebappReleaseCandidateSummary(cancelledPreflightInput);
    expect(cancelledPreflightSummary).toMatch(/- Production preflight job result: cancelled/);
    expect(cancelledPreflightSummary).toMatch(
      /- Approval status: Production preflight was cancelled; Production approval is unavailable/,
    );
  });

  it('uses deliberate fallbacks when optional candidate values are missing', () => {
    const input: WebappReleaseSummaryInput = {
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
    const summary = renderWebappReleaseCandidateSummary(input);

    assertCandidateSummaryContract(summary);
    expect(summary).toMatch(/- Commit SHA: not available/);
    expect(summary).toMatch(/- Artifact name: not available/);
    expect(summary).toMatch(/- Artifact checksum: not available/);
    expect(summary).toMatch(/- Playwright report URL: not available/);
    expect(summary).toMatch(/- Planned Production tag: not available/);
    expect(summary).toMatch(/- Production preflight job result: not available/);
    expect(summary).toMatch(/- Approval status: Production approval status is unavailable or unexpected/);
  });
});
