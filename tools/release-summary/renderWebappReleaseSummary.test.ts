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

import {Maybe} from 'true-myth';

import {
  readWebappReleaseSummaryInput,
  renderWebappBetaReleaseSummary,
  renderWebappReleaseSummary,
} from './renderWebappReleaseSummary.ts';
import type {WebappReleaseSummaryInput} from './renderWebappReleaseSummary.ts';

const releaseCommitSha = '1234567890abcdef1234567890abcdef12345678';
const sourceCommitSha = 'abcdef1234567890abcdef1234567890abcdef12';
const betaTagName = '2026-07-17.1-beta.1';
const productionTagName = '2026-07-17.1-production';
const githubReleaseUrl = `https://github.com/wireapp/wire-webapp/releases/tag/${productionTagName}`;

const baselineWebappReleaseSummaryInput: WebappReleaseSummaryInput = {
  beta: {
    deploymentResult: Maybe.just('success'),
    environmentName: Maybe.just('wire-webapp-beta'),
    runtimeBackendRest: Maybe.just('https://beta-backend.example.com'),
    runtimeBackendWebSocket: Maybe.just('wss://beta-backend.example.com'),
    runtimeVerificationResult: Maybe.just('success'),
    tagCreationResult: Maybe.just('success'),
    tagName: Maybe.just(betaTagName),
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
    actor: Maybe.just('release-captain'),
    repository: Maybe.just('wireapp/wire-webapp'),
    runId: Maybe.just('123456789'),
    serverUrl: Maybe.just('https://github.com'),
    wireBuildsRepository: Maybe.just('wireapp/wire-builds'),
  },
  githubRelease: {
    action: Maybe.nothing(),
    jobResult: Maybe.just('skipped'),
    state: Maybe.nothing(),
    tagName: Maybe.nothing<string>(),
    url: Maybe.nothing<string>(),
  },
  preparation: {
    branchAction: Maybe.just('created'),
    sourceCommitSha: Maybe.just(sourceCommitSha),
    sourceRef: Maybe.just('main'),
  },
  production: {
    createdTagName: Maybe.nothing<string>(),
    deploymentResult: Maybe.just('skipped'),
    deploymentRequired: Maybe.just(false),
    environmentName: Maybe.just('wire-webapp-production'),
    plannedTagName: Maybe.just(productionTagName),
    preflightJobResult: Maybe.just('skipped'),
    preflightResult: Maybe.just('skipped'),
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
    commitSha: Maybe.just(releaseCommitSha),
    identifier: Maybe.just('2026-07-17.1'),
    manualReason: Maybe.nothing<string>(),
  },
};

function visibleSummary(summary: string): string {
  return summary.split('<details>')[0];
}

function technicalEvidence(summary: string): string {
  return summary.slice(summary.indexOf('<details>'));
}

function countOccurrences(value: string, searchedValue: string): number {
  return value.split(searchedValue).length - 1;
}

function assertMarkdownContract(summary: string, includesDistribution: boolean): void {
  const visibleContent = visibleSummary(summary);
  const detailsContent = technicalEvidence(summary);

  expect(summary.endsWith('\n')).toBe(true);
  expect(summary.endsWith('\n\n')).toBe(false);
  expect(countOccurrences(summary, '<details>')).toBe(1);
  expect(countOccurrences(summary, '</details>')).toBe(1);
  expect(summary).toContain('<details>\n<summary>Technical release evidence</summary>\n\n');
  expect(detailsContent).toContain('\n\n</details>');
  expect(summary).not.toContain(']();');
  expect(summary).not.toContain(']()');
  expect(summary).not.toContain('/releases/tag/undefined');
  expect(summary).not.toContain('undefined');
  expect(summary).not.toContain('null');
  expect(countOccurrences(visibleContent, '- Webapp version:')).toBe(1);
  expect(countOccurrences(visibleContent, '- Workflow run:')).toBe(1);
  expect(visibleContent).not.toContain('- Asset version:');
  expect(visibleContent).not.toContain('- Built at (UTC):');
  expect(visibleContent).not.toContain('- Artifact name:');
  expect(visibleContent).not.toContain('- Artifact checksum:');
  expect(technicalEvidence(summary)).toContain('### Release preparation');

  if (includesDistribution) {
    expect(summary).toContain('### Release distribution');
  } else {
    expect(summary).not.toContain('### Release distribution');
  }

  assertOptionalProductionPromotionTermsAreAbsent(summary);
}

function assertVisibleIdentity(summary: string): void {
  const visibleContent = visibleSummary(summary);

  expect(visibleContent).toContain('- Release: `2026-07-17.1`');
  expect(visibleContent).toContain('- Release branch: `release/2026-07-17.1`');
  expect(visibleContent).toContain(
    `- Commit: [${releaseCommitSha}](https://github.com/wireapp/wire-webapp/commit/${releaseCommitSha})`,
  );
  expect(visibleContent).toContain('- Webapp version: `2026-07-17.1`');
  expect(visibleContent).toContain(
    '- Workflow run: [https://github.com/wireapp/wire-webapp/actions/runs/123456789](https://github.com/wireapp/wire-webapp/actions/runs/123456789)',
  );
}

function assertBetaSummaryContainsOnlyBetaEvidence(summary: string): void {
  const forbiddenTerms = [
    'E2E system gate',
    'Playwright',
    'Testiny',
    'Hosted Production',
    'Production preflight',
    'Production tag',
    'Release distribution',
    'Docker image',
    'Helm chart',
    'wire-builds',
  ];

  for (const forbiddenTerm of forbiddenTerms) {
    expect(summary).not.toContain(forbiddenTerm);
  }
}

function assertOptionalProductionPromotionTermsAreAbsent(summary: string): void {
  const forbiddenTerms = [
    'Production promotion requested',
    'Production promotion was not requested',
    'Beta-only',
    'Hosted Production: not requested',
    'Release distribution: not requested',
  ];

  for (const forbiddenTerm of forbiddenTerms) {
    expect(summary).not.toContain(forbiddenTerm);
  }
}

describe('WebApp release summary renderer', () => {
  it('documents the exact main commit used to create a release branch', () => {
    const summary = renderWebappReleaseSummary(baselineWebappReleaseSummaryInput);
    const detailsContent = technicalEvidence(summary);

    expect(detailsContent).toContain('- Branch creation source: main');
    expect(detailsContent).toContain(
      `- Commit used to create the release branch: [${sourceCommitSha}](https://github.com/wireapp/wire-webapp/commit/${sourceCommitSha})`,
    );
    expect(detailsContent).toContain(
      'The release branch was created from the exact main commit selected when the workflow was started.',
    );
  });

  it('documents that an existing release branch head is reused without applying main', () => {
    const input: WebappReleaseSummaryInput = {
      ...baselineWebappReleaseSummaryInput,
      preparation: {
        ...baselineWebappReleaseSummaryInput.preparation,
        branchAction: Maybe.just('reused'),
        sourceCommitSha: Maybe.nothing<string>(),
        sourceRef: Maybe.nothing<string>(),
      },
    };
    const summary = renderWebappReleaseSummary(input);
    const visibleContent = visibleSummary(summary);
    const detailsContent = technicalEvidence(summary);

    expect(detailsContent).toContain('- Branch creation source: not applicable; existing release branch was reused');
    expect(detailsContent).toContain(
      '- Commit used to create the release branch: not applicable; existing release branch was reused',
    );
    expect(detailsContent).toContain(
      'The existing release branch head was reused. The selected main commit was not merged, reset, or applied.',
    );
    expect(visibleContent).toContain(`- Hosted Beta: deployed and verified successfully - tag [${betaTagName}]`);
    expect(visibleContent).toContain('- E2E system gate: passed successfully - [Playwright report]');
    expect(visibleContent).toContain('- Hosted Production: not run because Production preflight did not run');
    expect(visibleContent).toContain('- Release distribution: not run');
  });

  it('reports an unexpected skipped Production preflight as an incomplete release', () => {
    const summary = renderWebappReleaseSummary(baselineWebappReleaseSummaryInput);
    const visibleContent = visibleSummary(summary);
    const detailsContent = technicalEvidence(summary);

    assertMarkdownContract(summary, true);
    assertVisibleIdentity(summary);
    expect(visibleContent).toContain('## WebApp release');
    expect(visibleContent).toContain('Release incomplete because Production preflight did not run');
    expect(visibleContent).toContain(`- Hosted Beta: deployed and verified successfully - tag [${betaTagName}]`);
    expect(visibleContent).toContain('- E2E system gate: passed successfully - [Playwright report]');
    expect(visibleContent).toContain('- Hosted Production: not run because Production preflight did not run');
    expect(visibleContent).toContain('- Release distribution: not run');
    expect(detailsContent).toContain('- Production preflight result: skipped');
    expect(detailsContent).toContain('- Skip reason: Production preflight did not run');
    expect(detailsContent).toContain('- Asset version: 2026-07-17.1-1234567');
    expect(detailsContent).toContain('- Built at (UTC): 2026-07-20T06:18:03.123Z');
    expect(detailsContent).toContain(
      '- Artifact checksum: sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    );
    expect(detailsContent).toContain(
      '- Workflow run URL: [https://github.com/wireapp/wire-webapp/actions/runs/123456789]',
    );
  });

  it('renders a successful Beta release with only Beta evidence', () => {
    const summary = renderWebappBetaReleaseSummary(baselineWebappReleaseSummaryInput);
    const visibleContent = visibleSummary(summary);

    assertMarkdownContract(summary, false);
    assertVisibleIdentity(summary);
    expect(visibleContent).toContain('## WebApp Beta release');
    expect(visibleContent).toContain('- Outcome: Beta release completed successfully');
    expect(visibleContent).toContain(`- Hosted Beta: deployed and verified successfully - tag [${betaTagName}]`);
    expect(countOccurrences(visibleContent, `[${betaTagName}]`)).toBe(1);
    expect(summary).toContain('### Release preparation');
    expect(summary).toContain('### Hosted Beta validation');
    assertBetaSummaryContainsOnlyBetaEvidence(summary);
  });

  it('renders a successful Production release and distribution evidence', () => {
    const wireBuildsCommitSha = 'abcdefabcdefabcdefabcdefabcdefabcdefabcd';
    const input: WebappReleaseSummaryInput = {
      ...baselineWebappReleaseSummaryInput,
      distribution: {
        ...baselineWebappReleaseSummaryInput.distribution,
        dockerImageTag: Maybe.just(`${productionTagName}-v0.34.9-0-1234567`),
        distributionJobResult: Maybe.just('success'),
        distributionResult: Maybe.just('success'),
        helmChartVersion: Maybe.just('0.8.0-pre.3175'),
        wireBuildsCommitSha: Maybe.just(wireBuildsCommitSha),
      },
      production: {
        ...baselineWebappReleaseSummaryInput.production,
        createdTagName: Maybe.just(productionTagName),
        deploymentResult: Maybe.just('success'),
        deploymentRequired: Maybe.just(true),
        preflightJobResult: Maybe.just('success'),
        preflightResult: Maybe.just('ready'),
        runtimeVerificationResult: Maybe.just('success'),
        tagCreationResult: Maybe.just('success'),
      },
      githubRelease: {
        action: Maybe.just('created'),
        jobResult: Maybe.just('success'),
        state: Maybe.just('draft'),
        tagName: Maybe.just(productionTagName),
        url: Maybe.just(githubReleaseUrl),
      },
    };
    const summary = renderWebappReleaseSummary(input);
    const visibleContent = visibleSummary(summary);
    const detailsContent = technicalEvidence(summary);

    assertMarkdownContract(summary, true);
    assertVisibleIdentity(summary);
    expect(visibleContent).toContain(
      '- Outcome: Automated release completed successfully; GitHub Release draft is ready for changelog completion',
    );
    expect(visibleContent).toContain(
      `Hosted Production: deployed, verified, and tagged successfully - tag [${productionTagName}]`,
    );
    expect(visibleContent).toContain(
      `Release distribution: published successfully - Docker \`quay.io/wire/webapp:${productionTagName}-v0.34.9-0-1234567\`, Helm \`0.8.0-pre.3175\`, wire-builds [${wireBuildsCommitSha}](https://github.com/wireapp/wire-builds/commit/${wireBuildsCommitSha})`,
    );
    expect(detailsContent).toContain('- Runtime verification result: verified successfully');
    expect(detailsContent).toContain('- Production tag creation result: created successfully');
    expect(detailsContent).toContain('- Docker image: quay.io/wire/webapp:2026-07-17.1-production-v0.34.9-0-1234567');
    expect(detailsContent).toContain('- Helm chart repository: https://charts.example.com/webapp');
    expect(visibleContent).toContain(
      `- GitHub Release handoff: completed successfully; action: new draft created; state: draft; URL: [GitHub Release](${githubReleaseUrl})`,
    );
    expect(detailsContent).toContain('- Action: new draft created');
    expect(detailsContent).toContain(`- Release URL: [GitHub Release](${githubReleaseUrl})`);
    expect(detailsContent).toContain(
      '- Manual follow-up: Customer-facing changelog completion and GitHub Release publication remain manual.',
    );
  });

  it('renders an existing GitHub Release draft as a successful handoff', () => {
    const input: WebappReleaseSummaryInput = {
      ...baselineWebappReleaseSummaryInput,
      distribution: {
        ...baselineWebappReleaseSummaryInput.distribution,
        distributionJobResult: Maybe.just('success'),
        distributionResult: Maybe.just('success'),
      },
      production: {
        ...baselineWebappReleaseSummaryInput.production,
        createdTagName: Maybe.just(productionTagName),
        deploymentResult: Maybe.just('success'),
        deploymentRequired: Maybe.just(true),
        preflightJobResult: Maybe.just('success'),
        preflightResult: Maybe.just('ready'),
        runtimeVerificationResult: Maybe.just('success'),
        tagCreationResult: Maybe.just('success'),
      },
      githubRelease: {
        action: Maybe.just('already_draft'),
        jobResult: Maybe.just('success'),
        state: Maybe.just('draft'),
        tagName: Maybe.just(productionTagName),
        url: Maybe.just(githubReleaseUrl),
      },
    };
    const summary = renderWebappReleaseSummary(input);
    const visibleContent = visibleSummary(summary);
    const detailsContent = technicalEvidence(summary);

    expect(visibleContent).toContain(
      '- Outcome: Automated release completed successfully; GitHub Release draft is ready for changelog completion',
    );
    expect(visibleContent).toContain(
      `- GitHub Release handoff: completed successfully; action: existing draft verified; state: draft; URL: [GitHub Release](${githubReleaseUrl})`,
    );
    expect(detailsContent).toContain(
      '- Manual follow-up: Customer-facing changelog completion and GitHub Release publication remain manual.',
    );
  });

  it('renders an existing published GitHub Release as a successful handoff', () => {
    const input: WebappReleaseSummaryInput = {
      ...baselineWebappReleaseSummaryInput,
      distribution: {
        ...baselineWebappReleaseSummaryInput.distribution,
        distributionJobResult: Maybe.just('success'),
        distributionResult: Maybe.just('success'),
      },
      production: {
        ...baselineWebappReleaseSummaryInput.production,
        createdTagName: Maybe.just(productionTagName),
        deploymentResult: Maybe.just('success'),
        deploymentRequired: Maybe.just(true),
        preflightJobResult: Maybe.just('success'),
        preflightResult: Maybe.just('ready'),
        runtimeVerificationResult: Maybe.just('success'),
        tagCreationResult: Maybe.just('success'),
      },
      githubRelease: {
        action: Maybe.just('already_published'),
        jobResult: Maybe.just('success'),
        state: Maybe.just('published'),
        tagName: Maybe.just(productionTagName),
        url: Maybe.just(githubReleaseUrl),
      },
    };
    const summary = renderWebappReleaseSummary(input);
    const visibleContent = visibleSummary(summary);
    const detailsContent = technicalEvidence(summary);

    expect(visibleContent).toContain(
      '- Outcome: Automated release completed successfully; existing GitHub Release is already published',
    );
    expect(visibleContent).toContain(
      `- GitHub Release handoff: completed successfully; action: existing published release verified; state: published; URL: [GitHub Release](${githubReleaseUrl})`,
    );
    expect(detailsContent).toContain(
      '- Manual follow-up: The existing published GitHub Release was preserved; no automated publication was performed.',
    );
  });

  it('does not report complete success when GitHub Release handoff fails after distribution', () => {
    const input: WebappReleaseSummaryInput = {
      ...baselineWebappReleaseSummaryInput,
      distribution: {
        ...baselineWebappReleaseSummaryInput.distribution,
        distributionJobResult: Maybe.just('success'),
        distributionResult: Maybe.just('success'),
      },
      production: {
        ...baselineWebappReleaseSummaryInput.production,
        createdTagName: Maybe.just(productionTagName),
        deploymentResult: Maybe.just('success'),
        deploymentRequired: Maybe.just(true),
        preflightJobResult: Maybe.just('success'),
        preflightResult: Maybe.just('ready'),
        runtimeVerificationResult: Maybe.just('success'),
        tagCreationResult: Maybe.just('success'),
      },
      githubRelease: {
        action: Maybe.nothing(),
        jobResult: Maybe.just('failure'),
        state: Maybe.nothing(),
        tagName: Maybe.just(productionTagName),
        url: Maybe.nothing<string>(),
      },
    };
    const summary = renderWebappReleaseSummary(input);
    const visibleContent = visibleSummary(summary);
    const detailsContent = technicalEvidence(summary);

    expect(visibleContent).toContain(
      '- Outcome: Hosted Production and release distribution completed, but GitHub Release handoff failed',
    );
    expect(visibleContent).not.toContain('- Outcome: Release completed successfully');
    expect(visibleContent).toContain(
      '- GitHub Release handoff: failed; action: not available; state: not available; URL: not available',
    );
    expect(detailsContent).toContain('- Job result: failed');
    expect(detailsContent).toContain(`- Production tag: [${productionTagName}]`);
  });

  it('reports that the GitHub Release stage was not reached after an earlier gate failed', () => {
    const input: WebappReleaseSummaryInput = {
      ...baselineWebappReleaseSummaryInput,
      e2e: {
        ...baselineWebappReleaseSummaryInput.e2e,
        result: Maybe.just('failure'),
      },
      production: {
        ...baselineWebappReleaseSummaryInput.production,
        deploymentRequired: Maybe.nothing<boolean>(),
        preflightJobResult: Maybe.just('skipped'),
        preflightResult: Maybe.nothing(),
      },
    };
    const summary = renderWebappReleaseSummary(input);
    const visibleContent = visibleSummary(summary);

    expect(visibleContent).toContain('Release stopped because the E2E system gate failed');
    expect(visibleContent).toContain(
      '- GitHub Release handoff: not run; action: not available; state: not available; URL: not available',
    );
    expect(visibleContent).not.toContain('Automated release completed successfully');
  });

  it('renders an already-tagged Production release without linking a nonexistent tag', () => {
    const input: WebappReleaseSummaryInput = {
      ...baselineWebappReleaseSummaryInput,
      production: {
        ...baselineWebappReleaseSummaryInput.production,
        deploymentRequired: Maybe.just(false),
        preflightJobResult: Maybe.just('success'),
        preflightResult: Maybe.just('already_tagged'),
      },
      githubRelease: {
        action: Maybe.just('already_draft'),
        jobResult: Maybe.just('success'),
        state: Maybe.just('draft'),
        tagName: Maybe.just(productionTagName),
        url: Maybe.just(githubReleaseUrl),
      },
    };
    const summary = renderWebappReleaseSummary(input);
    const visibleContent = visibleSummary(summary);
    const detailsContent = technicalEvidence(summary);

    assertMarkdownContract(summary, true);
    expect(visibleContent).toContain(
      'Release already has the matching Production tag; deployment was not repeated and the GitHub Release draft was verified',
    );
    expect(visibleContent).toContain(
      `Hosted Production: already tagged; deployment not required - tag [${productionTagName}](https://github.com/wireapp/wire-webapp/tree/${productionTagName})`,
    );
    expect(visibleContent).toContain('- Release distribution: not run; Production tag already exists');
    expect(visibleContent).toContain(
      `- GitHub Release handoff: completed successfully; action: existing draft verified; state: draft; URL: [GitHub Release](${githubReleaseUrl})`,
    );
    expect(detailsContent).toContain('- Production tag: [2026-07-17.1-production]');
    expect(detailsContent).toContain('- Action: existing draft verified');
    expect(detailsContent).toContain('- Production tag creation result: not required; tag already exists');
    expect(summary).not.toContain('created-production-tag');
  });

  it('reports a GitHub Release handoff failure during an already-tagged Production recovery', () => {
    const input: WebappReleaseSummaryInput = {
      ...baselineWebappReleaseSummaryInput,
      production: {
        ...baselineWebappReleaseSummaryInput.production,
        deploymentRequired: Maybe.just(false),
        preflightJobResult: Maybe.just('success'),
        preflightResult: Maybe.just('already_tagged'),
      },
      githubRelease: {
        action: Maybe.nothing(),
        jobResult: Maybe.just('failure'),
        state: Maybe.nothing(),
        tagName: Maybe.just(productionTagName),
        url: Maybe.nothing<string>(),
      },
    };
    const summary = renderWebappReleaseSummary(input);
    const visibleContent = visibleSummary(summary);

    expect(visibleContent).toContain(
      '- Outcome: Release already has the matching Production tag; deployment was not repeated, but GitHub Release handoff failed',
    );
    expect(visibleContent).toContain(
      '- GitHub Release handoff: failed; action: not available; state: not available; URL: not available',
    );
    expect(visibleContent).not.toContain('Automated release completed successfully');
  });

  it('preserves an existing published GitHub Release during an already-tagged Production recovery', () => {
    const input: WebappReleaseSummaryInput = {
      ...baselineWebappReleaseSummaryInput,
      production: {
        ...baselineWebappReleaseSummaryInput.production,
        deploymentRequired: Maybe.just(false),
        preflightJobResult: Maybe.just('success'),
        preflightResult: Maybe.just('already_tagged'),
      },
      githubRelease: {
        action: Maybe.just('already_published'),
        jobResult: Maybe.just('success'),
        state: Maybe.just('published'),
        tagName: Maybe.just(productionTagName),
        url: Maybe.just(githubReleaseUrl),
      },
    };
    const summary = renderWebappReleaseSummary(input);
    const visibleContent = visibleSummary(summary);
    const detailsContent = technicalEvidence(summary);

    expect(visibleContent).toContain(
      '- Outcome: Release already has the matching Production tag; deployment was not repeated and the existing published GitHub Release was preserved',
    );
    expect(visibleContent).toContain(
      `- GitHub Release handoff: completed successfully; action: existing published release verified; state: published; URL: [GitHub Release](${githubReleaseUrl})`,
    );
    expect(detailsContent).toContain(
      '- Manual follow-up: The existing published GitHub Release was preserved; no automated publication was performed.',
    );
  });

  it('stops a release when Hosted Beta deployment fails', () => {
    const input: WebappReleaseSummaryInput = {
      ...baselineWebappReleaseSummaryInput,
      beta: {
        ...baselineWebappReleaseSummaryInput.beta,
        deploymentResult: Maybe.just('failure'),
        tagCreationResult: Maybe.just('skipped'),
        tagName: Maybe.nothing<string>(),
      },
      e2e: {
        ...baselineWebappReleaseSummaryInput.e2e,
        result: Maybe.just('skipped'),
      },
      production: {
        ...baselineWebappReleaseSummaryInput.production,
        deploymentRequired: Maybe.nothing<boolean>(),
        preflightJobResult: Maybe.just('skipped'),
        preflightResult: Maybe.nothing(),
      },
    };
    const finalSummary = renderWebappReleaseSummary(input);
    const betaSummary = renderWebappBetaReleaseSummary(input);

    expect(visibleSummary(finalSummary)).toContain('Release stopped because Hosted Beta deployment failed');
    expect(visibleSummary(betaSummary)).toContain('Beta release stopped because Hosted Beta deployment failed');
    expect(visibleSummary(betaSummary)).not.toContain(`[${betaTagName}]`);
    expect(visibleSummary(finalSummary)).toContain(
      '- Hosted Production: blocked because Hosted Beta deployment failed',
    );
    expect(technicalEvidence(finalSummary)).toContain('- Result: failed');
  });

  it('stops the Beta release when Hosted Beta deployment is cancelled', () => {
    const input: WebappReleaseSummaryInput = {
      ...baselineWebappReleaseSummaryInput,
      beta: {
        ...baselineWebappReleaseSummaryInput.beta,
        deploymentResult: Maybe.just('cancelled'),
        tagCreationResult: Maybe.just('skipped'),
        tagName: Maybe.nothing<string>(),
      },
    };
    const summary = renderWebappBetaReleaseSummary(input);

    expect(visibleSummary(summary)).toContain('Beta release stopped because Hosted Beta deployment was cancelled');
    expect(visibleSummary(summary)).not.toContain('failed');
  });

  it('reports an incomplete release when Hosted Beta deployment is skipped', () => {
    const input: WebappReleaseSummaryInput = {
      ...baselineWebappReleaseSummaryInput,
      beta: {
        ...baselineWebappReleaseSummaryInput.beta,
        deploymentResult: Maybe.just('skipped'),
      },
      e2e: {
        ...baselineWebappReleaseSummaryInput.e2e,
        result: Maybe.just('skipped'),
      },
      production: {
        ...baselineWebappReleaseSummaryInput.production,
        deploymentRequired: Maybe.nothing<boolean>(),
        preflightJobResult: Maybe.just('skipped'),
        preflightResult: Maybe.nothing(),
      },
    };
    const finalSummary = renderWebappReleaseSummary(input);
    const betaSummary = renderWebappBetaReleaseSummary(input);
    const finalVisibleContent = visibleSummary(finalSummary);
    const betaVisibleContent = visibleSummary(betaSummary);

    expect(finalVisibleContent).toContain('- Outcome: Release incomplete because Hosted Beta deployment did not run');
    expect(finalVisibleContent).toContain(
      '- Hosted Production: unavailable because Hosted Beta deployment did not run',
    );
    expect(betaVisibleContent).toContain(
      '- Outcome: Beta release incomplete because Hosted Beta deployment did not run',
    );
  });

  it('reports an incomplete release when Beta tag creation is skipped', () => {
    const input: WebappReleaseSummaryInput = {
      ...baselineWebappReleaseSummaryInput,
      beta: {
        ...baselineWebappReleaseSummaryInput.beta,
        tagCreationResult: Maybe.just('skipped'),
        tagName: Maybe.nothing<string>(),
      },
      e2e: {
        ...baselineWebappReleaseSummaryInput.e2e,
        result: Maybe.just('skipped'),
      },
      production: {
        ...baselineWebappReleaseSummaryInput.production,
        deploymentRequired: Maybe.nothing<boolean>(),
        preflightJobResult: Maybe.just('skipped'),
        preflightResult: Maybe.nothing(),
      },
    };
    const finalSummary = renderWebappReleaseSummary(input);
    const betaSummary = renderWebappBetaReleaseSummary(input);
    const finalVisibleContent = visibleSummary(finalSummary);
    const betaVisibleContent = visibleSummary(betaSummary);

    expect(finalVisibleContent).toContain('- Outcome: Release incomplete because Beta tag creation did not run');
    expect(finalVisibleContent).toContain('- Hosted Production: unavailable because Beta tag creation did not run');
    expect(betaVisibleContent).toContain('- Outcome: Beta release incomplete because Beta tag creation did not run');
  });

  it('stops the Beta release when Beta tag creation fails', () => {
    const input: WebappReleaseSummaryInput = {
      ...baselineWebappReleaseSummaryInput,
      beta: {
        ...baselineWebappReleaseSummaryInput.beta,
        tagCreationResult: Maybe.just('failure'),
        tagName: Maybe.nothing<string>(),
      },
    };
    const summary = renderWebappBetaReleaseSummary(input);

    expect(visibleSummary(summary)).toContain('Beta release stopped because Beta tag creation failed');
  });

  it('stops the Beta release when Beta tag creation is cancelled', () => {
    const input: WebappReleaseSummaryInput = {
      ...baselineWebappReleaseSummaryInput,
      beta: {
        ...baselineWebappReleaseSummaryInput.beta,
        tagCreationResult: Maybe.just('cancelled'),
        tagName: Maybe.nothing<string>(),
      },
    };
    const summary = renderWebappBetaReleaseSummary(input);

    expect(visibleSummary(summary)).toContain('Beta release stopped because Beta tag creation was cancelled');
  });

  it('reports an incomplete release when the E2E system gate is skipped', () => {
    const input: WebappReleaseSummaryInput = {
      ...baselineWebappReleaseSummaryInput,
      e2e: {
        ...baselineWebappReleaseSummaryInput.e2e,
        result: Maybe.just('skipped'),
      },
      production: {
        ...baselineWebappReleaseSummaryInput.production,
        deploymentRequired: Maybe.nothing<boolean>(),
        preflightJobResult: Maybe.just('skipped'),
        preflightResult: Maybe.nothing(),
      },
    };
    const summary = renderWebappReleaseSummary(input);
    const visibleContent = visibleSummary(summary);

    expect(visibleContent).toContain('- Outcome: Release incomplete because the E2E system gate did not run');
    expect(visibleContent).toContain('- Hosted Production: unavailable because the E2E system gate did not run');
  });

  it('stops a release when the E2E system gate fails', () => {
    const input: WebappReleaseSummaryInput = {
      ...baselineWebappReleaseSummaryInput,
      e2e: {
        ...baselineWebappReleaseSummaryInput.e2e,
        result: Maybe.just('failure'),
      },
      production: {
        ...baselineWebappReleaseSummaryInput.production,
        deploymentRequired: Maybe.nothing<boolean>(),
        preflightJobResult: Maybe.just('skipped'),
        preflightResult: Maybe.nothing(),
      },
    };
    const finalSummary = renderWebappReleaseSummary(input);

    expect(visibleSummary(finalSummary)).toContain('Release stopped because the E2E system gate failed');
    expect(visibleSummary(finalSummary)).toContain('- Hosted Production: blocked because the E2E system gate failed');
    expect(technicalEvidence(finalSummary)).toContain('- Result: failed');
  });

  it('communicates an E2E cancellation without calling it a failure', () => {
    const input: WebappReleaseSummaryInput = {
      ...baselineWebappReleaseSummaryInput,
      e2e: {
        ...baselineWebappReleaseSummaryInput.e2e,
        result: Maybe.just('cancelled'),
      },
      github: {
        ...baselineWebappReleaseSummaryInput.github,
        runId: Maybe.just('29831901474'),
      },
      production: {
        ...baselineWebappReleaseSummaryInput.production,
        deploymentRequired: Maybe.nothing<boolean>(),
        preflightJobResult: Maybe.just('skipped'),
        preflightResult: Maybe.nothing(),
      },
    };
    const finalSummary = renderWebappReleaseSummary(input);
    const finalVisibleContent = visibleSummary(finalSummary);

    expect(finalVisibleContent).toContain('Release stopped because the E2E system gate was cancelled');
    expect(finalVisibleContent).toContain('- Hosted Beta: deployed and verified successfully');
    expect(finalVisibleContent).toContain('- E2E system gate: cancelled');
    expect(finalVisibleContent).toContain('- Hosted Production: unavailable because the E2E system gate was cancelled');
    expect(finalVisibleContent).toContain('- Release distribution: not run');
    expect(finalVisibleContent).not.toContain('E2E system gate failed');
  });

  it('stops a release when Production preflight fails', () => {
    const input: WebappReleaseSummaryInput = {
      ...baselineWebappReleaseSummaryInput,
      production: {
        ...baselineWebappReleaseSummaryInput.production,
        deploymentRequired: Maybe.just(true),
        preflightJobResult: Maybe.just('failure'),
        preflightResult: Maybe.just('failure'),
      },
    };
    const summary = renderWebappReleaseSummary(input);

    expect(visibleSummary(summary)).toContain('Release stopped because Production preflight failed');
    expect(visibleSummary(summary)).toContain('- Hosted Production: failed during preflight');
    expect(technicalEvidence(summary)).toContain('- Production preflight result: failed');
  });

  it('stops a release when Hosted Production deployment fails', () => {
    const input: WebappReleaseSummaryInput = {
      ...baselineWebappReleaseSummaryInput,
      production: {
        ...baselineWebappReleaseSummaryInput.production,
        deploymentResult: Maybe.just('failure'),
        deploymentRequired: Maybe.just(true),
        preflightJobResult: Maybe.just('success'),
        preflightResult: Maybe.just('ready'),
        runtimeVerificationResult: Maybe.just('skipped'),
        tagCreationResult: Maybe.just('skipped'),
      },
    };
    const summary = renderWebappReleaseSummary(input);

    expect(visibleSummary(summary)).toContain('Release stopped because Hosted Production deployment failed');
    expect(visibleSummary(summary)).toContain('- Hosted Production: failed during deployment');
    expect(technicalEvidence(summary)).toContain('- Production tag creation result: not run');
  });

  it('reports a Hosted Production runtime-verification failure', () => {
    const input: WebappReleaseSummaryInput = {
      ...baselineWebappReleaseSummaryInput,
      production: {
        ...baselineWebappReleaseSummaryInput.production,
        deploymentResult: Maybe.just('success'),
        deploymentRequired: Maybe.just(true),
        preflightJobResult: Maybe.just('success'),
        preflightResult: Maybe.just('ready'),
        runtimeVerificationResult: Maybe.just('failure'),
        tagCreationResult: Maybe.just('skipped'),
      },
    };
    const summary = renderWebappReleaseSummary(input);

    expect(visibleSummary(summary)).toContain('Hosted Production was deployed, but runtime verification failed');
    expect(visibleSummary(summary)).toContain('- Hosted Production: deployed, but runtime verification failed');
    expect(technicalEvidence(summary)).toContain('- Runtime verification result: failed');
  });

  it('reports Production tag-creation failure after deployment verification', () => {
    const input: WebappReleaseSummaryInput = {
      ...baselineWebappReleaseSummaryInput,
      production: {
        ...baselineWebappReleaseSummaryInput.production,
        deploymentResult: Maybe.just('success'),
        deploymentRequired: Maybe.just(true),
        preflightJobResult: Maybe.just('success'),
        preflightResult: Maybe.just('ready'),
        runtimeVerificationResult: Maybe.just('success'),
        tagCreationResult: Maybe.just('failure'),
      },
    };
    const summary = renderWebappReleaseSummary(input);

    expect(visibleSummary(summary)).toContain(
      'Hosted Production was deployed and verified, but Production tag creation failed',
    );
    expect(visibleSummary(summary)).toContain('- Hosted Production: deployed and verified, but tag creation failed');
    expect(technicalEvidence(summary)).toContain('- Production tag creation result: failed');
  });

  it('reports distribution failure after successful Hosted Production', () => {
    const input: WebappReleaseSummaryInput = {
      ...baselineWebappReleaseSummaryInput,
      distribution: {
        ...baselineWebappReleaseSummaryInput.distribution,
        distributionJobResult: Maybe.just('failure'),
        distributionResult: Maybe.just('failure'),
      },
      production: {
        ...baselineWebappReleaseSummaryInput.production,
        createdTagName: Maybe.just(productionTagName),
        deploymentResult: Maybe.just('success'),
        deploymentRequired: Maybe.just(true),
        preflightJobResult: Maybe.just('success'),
        preflightResult: Maybe.just('ready'),
        runtimeVerificationResult: Maybe.just('success'),
        tagCreationResult: Maybe.just('success'),
      },
    };
    const summary = renderWebappReleaseSummary(input);
    const visibleContent = visibleSummary(summary);

    expect(visibleContent).toContain('Hosted Production completed, but release distribution failed');
    expect(visibleContent).toContain('- Release distribution: failed');
    expect(visibleContent).not.toContain('not published');
    expect(visibleContent).not.toContain('not updated');
    expect(technicalEvidence(summary)).toContain('- Docker image: not published');
    expect(technicalEvidence(summary)).toContain('- wire-builds/main commit: not updated');
  });

  it('keeps missing metadata explicit without producing unsafe links', () => {
    const input: WebappReleaseSummaryInput = {
      ...baselineWebappReleaseSummaryInput,
      github: {
        actor: Maybe.nothing<string>(),
        repository: Maybe.nothing<string>(),
        runId: Maybe.nothing<string>(),
        serverUrl: Maybe.nothing<string>(),
        wireBuildsRepository: Maybe.nothing<string>(),
      },
      preparation: {
        branchAction: Maybe.nothing(),
        sourceCommitSha: Maybe.nothing<string>(),
        sourceRef: Maybe.nothing<string>(),
      },
      release: {
        ...baselineWebappReleaseSummaryInput.release,
        artifactAssetVersion: Maybe.nothing<string>(),
        artifactBuiltAt: Maybe.nothing<string>(),
        artifactChecksum: Maybe.nothing<string>(),
        artifactName: Maybe.nothing<string>(),
        artifactVersion: Maybe.nothing<string>(),
        branch: Maybe.nothing<string>(),
        commitSha: Maybe.nothing<string>(),
        identifier: Maybe.nothing<string>(),
      },
    };
    const finalSummary = renderWebappReleaseSummary(input);

    assertMarkdownContract(finalSummary, true);
    expect(visibleSummary(finalSummary)).toContain('- Release: `not available`');
    expect(visibleSummary(finalSummary)).toContain('- Commit: not available');
    expect(technicalEvidence(finalSummary)).toContain('- Artifact name: not available');
    expect(technicalEvidence(finalSummary)).toContain('- Artifact checksum: not available');
    expect(technicalEvidence(finalSummary)).toContain('- Commit used to create the release branch: not available');
  });

  it('keeps an optional manual reason in Release preparation evidence only', () => {
    const input: WebappReleaseSummaryInput = {
      ...baselineWebappReleaseSummaryInput,
      release: {
        ...baselineWebappReleaseSummaryInput.release,
        manualReason: Maybe.just('manual release for validation'),
      },
    };
    const finalSummary = renderWebappReleaseSummary(input);

    expect(technicalEvidence(finalSummary)).toContain('- Manual reason: manual release for validation');
    expect(visibleSummary(finalSummary)).not.toContain('Manual reason');
  });

  it('reads the Production deployment requirement from the workflow environment', () => {
    const input = readWebappReleaseSummaryInput({
      ARTIFACT_ASSET_VERSION: '2026-07-17.1-1234567',
      ARTIFACT_BUILT_AT: '2026-07-20T06:18:03.123Z',
      GITHUB_RELEASE_ACTION: 'created',
      GITHUB_RELEASE_JOB_RESULT: 'success',
      GITHUB_RELEASE_STATE: 'draft',
      GITHUB_RELEASE_TAG_NAME: productionTagName,
      GITHUB_RELEASE_URL: githubReleaseUrl,
      PRODUCTION_DEPLOYMENT_REQUIRED: 'true',
      RELEASE_ACTOR: 'release-captain',
      RELEASE_BRANCH_ACTION: 'created',
      SOURCE_COMMIT_SHA: sourceCommitSha,
      SOURCE_REF: 'main',
    });

    expect(input.release.artifactAssetVersion.unwrapOr('not available')).toBe('2026-07-17.1-1234567');
    expect(input.release.artifactBuiltAt.unwrapOr('not available')).toBe('2026-07-20T06:18:03.123Z');
    expect(input.github.actor.unwrapOr('not available')).toBe('release-captain');
    expect(input.preparation.branchAction.unwrapOr('reused')).toBe('created');
    expect(input.preparation.sourceCommitSha.unwrapOr('not available')).toBe(sourceCommitSha);
    expect(input.preparation.sourceRef.unwrapOr('not available')).toBe('main');
    expect(input.production.deploymentRequired.unwrapOr(false)).toBe(true);
    expect(input.githubRelease.action.unwrapOr('already_published')).toBe('created');
    expect(input.githubRelease.jobResult.unwrapOr('failure')).toBe('success');
    expect(input.githubRelease.state.unwrapOr('published')).toBe('draft');
    expect(input.githubRelease.tagName.unwrapOr('not available')).toBe(productionTagName);
    expect(input.githubRelease.url.unwrapOr('not available')).toBe(githubReleaseUrl);
  });

  it('does not create a link for an invalid E2E report URL', () => {
    const input: WebappReleaseSummaryInput = {
      ...baselineWebappReleaseSummaryInput,
      e2e: {
        ...baselineWebappReleaseSummaryInput.e2e,
        reportUrl: Maybe.just('not-a-url'),
      },
    };
    const summary = renderWebappReleaseSummary(input);

    expect(visibleSummary(summary)).not.toContain('Playwright report');
    expect(technicalEvidence(summary)).toContain('- Playwright report URL: not available');
    expect(summary).not.toContain(']()');
  });
});
