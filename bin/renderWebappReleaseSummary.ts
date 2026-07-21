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
import {match, P} from 'ts-pattern';

export type WorkflowJobResult = 'cancelled' | 'failure' | 'skipped' | 'success';

export type ReleaseBranchAction = 'created' | 'reused';

export type ReleaseMetadata = {
  readonly artifactChecksum: Maybe<string>;
  readonly artifactAssetVersion: Maybe<string>;
  readonly artifactBuiltAt: Maybe<string>;
  readonly artifactName: Maybe<string>;
  readonly artifactVersion: Maybe<string>;
  readonly branch: Maybe<string>;
  readonly commitSha: Maybe<string>;
  readonly identifier: Maybe<string>;
  readonly manualReason: Maybe<string>;
};

export type BetaSummaryInput = {
  readonly deploymentResult: Maybe<WorkflowJobResult>;
  readonly environmentName: Maybe<string>;
  readonly runtimeBackendRest: Maybe<string>;
  readonly runtimeBackendWebSocket: Maybe<string>;
  readonly runtimeVerificationResult: Maybe<WorkflowJobResult>;
  readonly tagCreationResult: Maybe<WorkflowJobResult>;
  readonly tagName: Maybe<string>;
  readonly webappUrl: Maybe<string>;
};

export type E2ESummaryInput = {
  readonly environmentName: Maybe<string>;
  readonly reportUrl: Maybe<string>;
  readonly result: Maybe<WorkflowJobResult>;
  readonly runtimeBackendRest: Maybe<string>;
  readonly runtimeBackendWebSocket: Maybe<string>;
  readonly testinyRunName: Maybe<string>;
  readonly webappUrl: Maybe<string>;
};

export type ProductionPreflightResult = 'already_tagged' | 'failure' | 'ready' | 'skipped';

export type ProductionSummaryInput = {
  readonly deploymentResult: Maybe<WorkflowJobResult>;
  readonly deploymentRequired: Maybe<boolean>;
  readonly environmentName: Maybe<string>;
  readonly preflightJobResult: Maybe<WorkflowJobResult>;
  readonly preflightResult: Maybe<ProductionPreflightResult>;
  readonly promotionRequested: boolean;
  readonly runtimeBackendRest: Maybe<string>;
  readonly runtimeBackendWebSocket: Maybe<string>;
  readonly runtimeVerificationResult: Maybe<WorkflowJobResult>;
  readonly skippedReason: Maybe<string>;
  readonly tagCreationResult: Maybe<WorkflowJobResult>;
  readonly createdTagName: Maybe<string>;
  readonly plannedTagName: Maybe<string>;
  readonly webappUrl: Maybe<string>;
};

export type ProductionDistributionSummaryInput = {
  readonly dockerImageTag: Maybe<string>;
  readonly distributionJobResult: Maybe<WorkflowJobResult>;
  readonly distributionResult: Maybe<WorkflowJobResult>;
  readonly helmChartVersion: Maybe<string>;
  readonly wireBuildsCommitSha: Maybe<string>;
  readonly dockerRepository: Maybe<string>;
  readonly chartRepositoryUrl: Maybe<string>;
};

export type GitHubLinkContext = {
  readonly actor: Maybe<string>;
  readonly repository: Maybe<string>;
  readonly runId: Maybe<string>;
  readonly serverUrl: Maybe<string>;
  readonly wireBuildsRepository: Maybe<string>;
};

export type ReleasePreparationSummaryInput = {
  readonly branchAction: Maybe<ReleaseBranchAction>;
  readonly sourceCommitSha: Maybe<string>;
  readonly sourceRef: Maybe<string>;
};

export type WebappReleaseSummaryInput = {
  readonly beta: BetaSummaryInput;
  readonly distribution: ProductionDistributionSummaryInput;
  readonly e2e: E2ESummaryInput;
  readonly github: GitHubLinkContext;
  readonly preparation: ReleasePreparationSummaryInput;
  readonly production: ProductionSummaryInput;
  readonly release: ReleaseMetadata;
};

type RenderReleaseIdentityParameters = {
  readonly title: string;
  readonly outcome: string;
  readonly input: WebappReleaseSummaryInput;
};

function readOptionalEnvironmentValue(environment: NodeJS.ProcessEnv, variableName: string): Maybe<string> {
  return Maybe.of(environment[variableName]).andThen(environmentValue => {
    if (environmentValue === '') {
      return Maybe.nothing<string>();
    }

    return Maybe.just(environmentValue);
  });
}

function readOptionalBoolean(environment: NodeJS.ProcessEnv, variableName: string): Maybe<boolean> {
  const environmentValue = readOptionalEnvironmentValue(environment, variableName);

  return environmentValue.andThen(value => {
    return match(value)
      .with('true', () => {
        return Maybe.just(true);
      })
      .with('false', () => {
        return Maybe.just(false);
      })
      .otherwise(() => {
        return Maybe.nothing<boolean>();
      });
  });
}

function readWorkflowJobResult(environment: NodeJS.ProcessEnv, variableName: string): Maybe<WorkflowJobResult> {
  const environmentValue = readOptionalEnvironmentValue(environment, variableName);

  return environmentValue.andThen(value => {
    return match(value)
      .with(P.union('cancelled', 'failure', 'skipped', 'success'), validResult => {
        return Maybe.just(validResult);
      })
      .otherwise(() => {
        return Maybe.nothing<WorkflowJobResult>();
      });
  });
}

function readProductionPreflightResult(environment: NodeJS.ProcessEnv): Maybe<ProductionPreflightResult> {
  const environmentValue = readOptionalEnvironmentValue(environment, 'PRODUCTION_PREFLIGHT_RESULT');

  return environmentValue.andThen(value => {
    return match(value)
      .with(P.union('already_tagged', 'failure', 'ready', 'skipped'), validResult => {
        return Maybe.just(validResult);
      })
      .otherwise(() => {
        return Maybe.nothing<ProductionPreflightResult>();
      });
  });
}

function readReleaseBranchAction(environment: NodeJS.ProcessEnv): Maybe<ReleaseBranchAction> {
  const environmentValue = readOptionalEnvironmentValue(environment, 'RELEASE_BRANCH_ACTION');

  return environmentValue.andThen(value => {
    return match(value)
      .with(P.union('created', 'reused'), validAction => {
        return Maybe.just(validAction);
      })
      .otherwise(() => {
        return Maybe.nothing<ReleaseBranchAction>();
      });
  });
}

export function readWebappReleaseSummaryInput(environment: NodeJS.ProcessEnv): WebappReleaseSummaryInput {
  return {
    beta: {
      deploymentResult: readWorkflowJobResult(environment, 'BETA_RESULT'),
      environmentName: readOptionalEnvironmentValue(environment, 'BETA_ELASTIC_BEANSTALK_ENVIRONMENT_NAME'),
      runtimeBackendRest: readOptionalEnvironmentValue(environment, 'BETA_RUNTIME_BACKEND_REST'),
      runtimeBackendWebSocket: readOptionalEnvironmentValue(environment, 'BETA_RUNTIME_BACKEND_WS'),
      runtimeVerificationResult: readWorkflowJobResult(environment, 'BETA_RUNTIME_VERIFICATION_RESULT'),
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
      testinyRunName: readOptionalEnvironmentValue(environment, 'TESTINY_RUN_NAME'),
      webappUrl: readOptionalEnvironmentValue(environment, 'E2E_WEBAPP_URL'),
    },
    github: {
      actor: readOptionalEnvironmentValue(environment, 'RELEASE_ACTOR'),
      repository: readOptionalEnvironmentValue(environment, 'GITHUB_REPOSITORY'),
      runId: readOptionalEnvironmentValue(environment, 'GITHUB_RUN_ID'),
      serverUrl: readOptionalEnvironmentValue(environment, 'GITHUB_SERVER_URL'),
      wireBuildsRepository: readOptionalEnvironmentValue(environment, 'WIRE_BUILDS_REPOSITORY'),
    },
    production: {
      createdTagName: readOptionalEnvironmentValue(environment, 'CREATED_PRODUCTION_TAG_NAME'),
      deploymentResult: readWorkflowJobResult(environment, 'PRODUCTION_DEPLOYMENT_RESULT'),
      deploymentRequired: readOptionalBoolean(environment, 'PRODUCTION_DEPLOYMENT_REQUIRED'),
      environmentName: readOptionalEnvironmentValue(environment, 'PRODUCTION_ENVIRONMENT_NAME'),
      plannedTagName: readOptionalEnvironmentValue(environment, 'PLANNED_PRODUCTION_TAG_NAME'),
      preflightJobResult: readWorkflowJobResult(environment, 'PRODUCTION_PREFLIGHT_JOB_RESULT'),
      preflightResult: readProductionPreflightResult(environment),
      promotionRequested: readOptionalBoolean(environment, 'PRODUCTION_PROMOTION_REQUESTED').mapOr(
        false,
        promotionRequested => {
          return promotionRequested === true;
        },
      ),
      runtimeBackendRest: readOptionalEnvironmentValue(environment, 'PRODUCTION_RUNTIME_BACKEND_REST'),
      runtimeBackendWebSocket: readOptionalEnvironmentValue(environment, 'PRODUCTION_RUNTIME_BACKEND_WS'),
      runtimeVerificationResult: readWorkflowJobResult(environment, 'PRODUCTION_RUNTIME_VERIFICATION_RESULT'),
      skippedReason: readOptionalEnvironmentValue(environment, 'PRODUCTION_SKIPPED_REASON'),
      tagCreationResult: readWorkflowJobResult(environment, 'PRODUCTION_TAG_CREATION_RESULT'),
      webappUrl: readOptionalEnvironmentValue(environment, 'PRODUCTION_WEBAPP_URL'),
    },
    preparation: {
      branchAction: readReleaseBranchAction(environment),
      sourceCommitSha: readOptionalEnvironmentValue(environment, 'SOURCE_COMMIT_SHA'),
      sourceRef: readOptionalEnvironmentValue(environment, 'SOURCE_REF'),
    },
    release: {
      artifactAssetVersion: readOptionalEnvironmentValue(environment, 'ARTIFACT_ASSET_VERSION'),
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

function formatValueOrFallback(value: Maybe<string>, fallback: string = 'not available'): string {
  return value.unwrapOr(fallback);
}

function formatMarkdownLink(label: string, url: string): string {
  return `[${label}](${url})`;
}

function formatOptionalFrontendUrl(url: Maybe<string>): string {
  return url
    .andThen(value => {
      if (value.startsWith('http://') || value.startsWith('https://')) {
        return Maybe.just(formatMarkdownLink(value, value));
      }

      return Maybe.nothing<string>();
    })
    .unwrapOr('not available');
}

function formatOptionalReportUrl(url: Maybe<string>): string {
  return formatOptionalFrontendUrl(url);
}

function formatCommitLink(commitSha: Maybe<string>, github: GitHubLinkContext): string {
  return commitSha
    .andThen(commit => {
      return github.serverUrl.andThen(serverUrl => {
        return github.repository.map(repository => {
          return formatMarkdownLink(commit, `${serverUrl}/${repository}/commit/${commit}`);
        });
      });
    })
    .unwrapOr('not available');
}

function formatWorkflowRunLink(github: GitHubLinkContext): string {
  return github.serverUrl
    .andThen(serverUrl => {
      return github.repository.andThen(repository => {
        return github.runId.map(runId => {
          const workflowRunUrl = `${serverUrl}/${repository}/actions/runs/${runId}`;

          return formatMarkdownLink(workflowRunUrl, workflowRunUrl);
        });
      });
    })
    .unwrapOr('not available');
}

function formatReleaseBranchAction(branchAction: Maybe<ReleaseBranchAction>): string {
  return branchAction.mapOrElse(
    () => {
      return 'not available';
    },
    actualAction => {
      return match(actualAction)
        .with('created', () => {
          return 'created';
        })
        .with('reused', () => {
          return 'reused';
        })
        .exhaustive();
    },
  );
}

function formatReleaseBranchPreparationNote(branchAction: Maybe<ReleaseBranchAction>): string {
  return branchAction.mapOrElse(
    () => {
      return 'not available';
    },
    actualAction => {
      return match(actualAction)
        .with('created', () => {
          return 'The release branch was created from the resolved source commit.';
        })
        .with('reused', () => {
          return 'The existing release branch was reused and was not moved to source_ref.';
        })
        .exhaustive();
    },
  );
}

function formatSourceCommit(input: WebappReleaseSummaryInput): string {
  return input.preparation.branchAction.mapOrElse(
    () => {
      return formatCommitLink(input.preparation.sourceCommitSha, input.github);
    },
    branchAction => {
      return match(branchAction)
        .with('created', () => {
          return formatCommitLink(input.preparation.sourceCommitSha, input.github);
        })
        .with('reused', () => {
          return 'not applicable; existing branch was reused';
        })
        .exhaustive();
    },
  );
}

function formatBetaResult(result: Maybe<WorkflowJobResult>): string {
  return result.mapOrElse(
    () => {
      return 'unknown result';
    },
    actualResult => {
      return match(actualResult)
        .with('success', () => {
          return 'deployed and verified successfully';
        })
        .with('failure', () => {
          return 'failed';
        })
        .with('skipped', () => {
          return 'did not run';
        })
        .with('cancelled', () => {
          return 'cancelled';
        })
        .exhaustive();
    },
  );
}

function hasWorkflowJobResult(result: Maybe<WorkflowJobResult>, expectedResult: WorkflowJobResult): boolean {
  return result.mapOr(false, actualResult => {
    return actualResult === expectedResult;
  });
}

function hasProductionPreflightResult(
  result: Maybe<ProductionPreflightResult>,
  expectedResult: ProductionPreflightResult,
): boolean {
  return result.mapOr(false, actualResult => {
    return actualResult === expectedResult;
  });
}

function formatRepositoryTreeLink(label: Maybe<string>, github: GitHubLinkContext): Maybe<string> {
  return label.andThen(value => {
    return github.serverUrl.andThen(serverUrl => {
      return github.repository.map(repository => {
        return formatMarkdownLink(value, `${serverUrl}/${repository}/tree/${value}`);
      });
    });
  });
}

function formatBetaTag(input: BetaSummaryInput, github: GitHubLinkContext): string {
  if (hasWorkflowJobResult(input.tagCreationResult, 'success')) {
    return formatRepositoryTreeLink(input.tagName, github).unwrapOr('not available');
  }

  if (
    hasWorkflowJobResult(input.tagCreationResult, 'failure') ||
    hasWorkflowJobResult(input.tagCreationResult, 'cancelled') ||
    hasWorkflowJobResult(input.tagCreationResult, 'skipped')
  ) {
    return 'not created';
  }

  return 'not available';
}

function formatE2EResult(result: Maybe<WorkflowJobResult>): string {
  return result.mapOrElse(
    () => {
      return 'unknown result';
    },
    actualResult => {
      return match(actualResult)
        .with('success', () => {
          return 'passed successfully';
        })
        .with('failure', () => {
          return 'failed';
        })
        .with('skipped', () => {
          return 'did not run';
        })
        .with('cancelled', () => {
          return 'cancelled';
        })
        .exhaustive();
    },
  );
}

function formatRuntimeVerificationResult(result: WorkflowJobResult): string {
  return match(result)
    .with('success', () => {
      return 'verified successfully';
    })
    .with('failure', () => {
      return 'failed';
    })
    .with('skipped', () => {
      return 'not run';
    })
    .with('cancelled', () => {
      return 'cancelled';
    })
    .exhaustive();
}

function renderRuntimeVerificationLines(result: Maybe<WorkflowJobResult>): string[] {
  return result.mapOrElse(
    () => {
      return [];
    },
    actualResult => {
      return [`- Runtime verification result: ${formatRuntimeVerificationResult(actualResult)}`];
    },
  );
}

function formatProductionPreflightResult(input: ProductionSummaryInput): string {
  return input.preflightResult.mapOrElse(
    () => {
      return input.preflightJobResult.mapOrElse(
        () => {
          return 'unknown result';
        },
        preflightJobResult => {
          return match(preflightJobResult)
            .with('failure', () => {
              return 'failed';
            })
            .with('cancelled', () => {
              return 'cancelled';
            })
            .with('skipped', () => {
              return 'not run';
            })
            .with('success', () => {
              return 'unknown result';
            })
            .exhaustive();
        },
      );
    },
    preflightResult => {
      return match(preflightResult)
        .with('ready', () => {
          return 'ready';
        })
        .with('already_tagged', () => {
          return 'already tagged';
        })
        .with('skipped', () => {
          return 'skipped';
        })
        .with('failure', () => {
          return 'failed';
        })
        .exhaustive();
    },
  );
}

function formatProductionResult(input: ProductionSummaryInput): string {
  if (input.promotionRequested === false) {
    return 'not requested';
  }

  if (hasProductionPreflightResult(input.preflightResult, 'already_tagged')) {
    return 'already tagged; deployment not required';
  }

  if (hasWorkflowJobResult(input.preflightJobResult, 'failure')) {
    return 'failed during preflight';
  }

  if (hasWorkflowJobResult(input.preflightJobResult, 'cancelled')) {
    return 'cancelled during preflight';
  }

  if (hasWorkflowJobResult(input.preflightJobResult, 'skipped')) {
    return 'not run because Production preflight did not run';
  }

  if (!hasProductionPreflightResult(input.preflightResult, 'ready')) {
    return 'unknown result';
  }

  if (hasWorkflowJobResult(input.deploymentResult, 'failure')) {
    return 'failed during deployment';
  }

  if (hasWorkflowJobResult(input.deploymentResult, 'cancelled')) {
    return 'cancelled during deployment';
  }

  if (hasWorkflowJobResult(input.deploymentResult, 'skipped')) {
    return 'not run';
  }

  if (!hasWorkflowJobResult(input.deploymentResult, 'success')) {
    return 'unknown result';
  }

  if (hasWorkflowJobResult(input.runtimeVerificationResult, 'failure')) {
    return 'deployed, but runtime verification failed';
  }

  if (hasWorkflowJobResult(input.runtimeVerificationResult, 'cancelled')) {
    return 'deployed, but runtime verification was cancelled';
  }

  if (hasWorkflowJobResult(input.runtimeVerificationResult, 'skipped')) {
    return 'deployed, but runtime verification did not run';
  }

  if (!hasWorkflowJobResult(input.runtimeVerificationResult, 'success')) {
    return 'unknown result';
  }

  if (hasWorkflowJobResult(input.tagCreationResult, 'success')) {
    return 'deployed, verified, and tagged successfully';
  }

  if (hasWorkflowJobResult(input.tagCreationResult, 'failure')) {
    return 'deployed and verified, but tag creation failed';
  }

  if (hasWorkflowJobResult(input.tagCreationResult, 'cancelled')) {
    return 'deployed and verified, but tag creation was cancelled';
  }

  return 'unknown result';
}

function formatProductionSkipReason(input: ProductionSummaryInput): Maybe<string> {
  if (input.skippedReason.isJust) {
    return input.skippedReason;
  }

  if (input.promotionRequested === false) {
    return Maybe.just('Production promotion was not requested');
  }

  if (hasWorkflowJobResult(input.preflightJobResult, 'skipped')) {
    return Maybe.just('Production preflight did not run');
  }

  if (hasWorkflowJobResult(input.preflightJobResult, 'cancelled')) {
    return Maybe.just('Production preflight was cancelled');
  }

  if (hasWorkflowJobResult(input.preflightJobResult, 'failure')) {
    return Maybe.just('Production preflight failed');
  }

  if (hasWorkflowJobResult(input.deploymentResult, 'skipped')) {
    return Maybe.just('Production deployment did not run');
  }

  return Maybe.nothing<string>();
}

function formatApprovalGate(input: ProductionSummaryInput): string {
  if (input.promotionRequested === false) {
    return 'not requested';
  }

  if (hasProductionPreflightResult(input.preflightResult, 'already_tagged')) {
    return 'not required; the release is already tagged as Production';
  }

  if (hasProductionPreflightResult(input.preflightResult, 'ready')) {
    return `${formatValueOrFallback(input.environmentName)} GitHub Environment settings`;
  }

  return 'not reached';
}

function formatProductionTag(input: ProductionSummaryInput, github: GitHubLinkContext): string {
  if (hasWorkflowJobResult(input.tagCreationResult, 'success')) {
    return formatRepositoryTreeLink(input.createdTagName, github).unwrapOr('not available');
  }

  if (hasProductionPreflightResult(input.preflightResult, 'already_tagged')) {
    return formatRepositoryTreeLink(input.plannedTagName, github).unwrapOr('not available');
  }

  if (input.promotionRequested === false) {
    return 'not requested';
  }

  if (hasProductionPreflightResult(input.preflightResult, 'already_tagged')) {
    return 'not available';
  }

  if (
    hasWorkflowJobResult(input.tagCreationResult, 'failure') ||
    hasWorkflowJobResult(input.tagCreationResult, 'cancelled') ||
    hasWorkflowJobResult(input.tagCreationResult, 'skipped') ||
    hasWorkflowJobResult(input.deploymentResult, 'failure') ||
    hasWorkflowJobResult(input.deploymentResult, 'cancelled') ||
    hasWorkflowJobResult(input.deploymentResult, 'skipped') ||
    hasWorkflowJobResult(input.runtimeVerificationResult, 'failure') ||
    hasWorkflowJobResult(input.runtimeVerificationResult, 'cancelled') ||
    hasWorkflowJobResult(input.runtimeVerificationResult, 'skipped') ||
    hasWorkflowJobResult(input.preflightJobResult, 'failure') ||
    hasWorkflowJobResult(input.preflightJobResult, 'cancelled') ||
    hasWorkflowJobResult(input.preflightJobResult, 'skipped')
  ) {
    return 'not created';
  }

  return 'not available';
}

function formatProductionTagCreationResult(input: ProductionSummaryInput): string {
  return input.tagCreationResult.mapOrElse(
    () => {
      if (hasProductionPreflightResult(input.preflightResult, 'already_tagged')) {
        return 'not required; tag already exists';
      }

      if (input.promotionRequested === false) {
        return 'not requested';
      }

      return 'unknown result';
    },
    tagCreationResult => {
      return match(tagCreationResult)
        .with('success', () => {
          return 'created successfully';
        })
        .with('failure', () => {
          return 'failed';
        })
        .with('cancelled', () => {
          return 'cancelled';
        })
        .with('skipped', () => {
          if (hasProductionPreflightResult(input.preflightResult, 'already_tagged')) {
            return 'not required; tag already exists';
          }

          return 'not run';
        })
        .exhaustive();
    },
  );
}

function formatDistributionResult(
  input: ProductionSummaryInput,
  distribution: ProductionDistributionSummaryInput,
): string {
  if (
    hasWorkflowJobResult(distribution.distributionJobResult, 'success') &&
    hasWorkflowJobResult(distribution.distributionResult, 'success')
  ) {
    return 'published successfully';
  }

  if (hasWorkflowJobResult(distribution.distributionJobResult, 'failure')) {
    return 'failed';
  }

  if (hasWorkflowJobResult(distribution.distributionJobResult, 'cancelled')) {
    return 'cancelled';
  }

  if (hasWorkflowJobResult(distribution.distributionJobResult, 'skipped') && input.promotionRequested === false) {
    return 'not requested';
  }

  if (
    hasWorkflowJobResult(distribution.distributionJobResult, 'skipped') &&
    hasProductionPreflightResult(input.preflightResult, 'already_tagged')
  ) {
    return 'not run; Production tag already exists';
  }

  if (hasWorkflowJobResult(distribution.distributionJobResult, 'skipped')) {
    return 'not run';
  }

  return 'unknown result';
}

function formatDockerImage(distribution: ProductionDistributionSummaryInput): string {
  return distribution.dockerRepository
    .andThen(repository => {
      return distribution.dockerImageTag.map(imageTag => {
        return `${repository}:${imageTag}`;
      });
    })
    .unwrapOr('not published');
}

function formatWireBuildsCommit(distribution: ProductionDistributionSummaryInput, github: GitHubLinkContext): string {
  return distribution.wireBuildsCommitSha
    .andThen(commitSha => {
      return github.serverUrl.andThen(serverUrl => {
        return github.wireBuildsRepository.map(repository => {
          return formatMarkdownLink(commitSha, `${serverUrl}/${repository}/commit/${commitSha}`);
        });
      });
    })
    .unwrapOr('not updated');
}

function formatOptionalExternalLink(label: string, url: Maybe<string>): Maybe<string> {
  return url.andThen(value => {
    if (value.startsWith('http://') || value.startsWith('https://')) {
      return Maybe.just(formatMarkdownLink(label, value));
    }

    return Maybe.nothing<string>();
  });
}

function formatVerifiedBetaTagLink(input: BetaSummaryInput, github: GitHubLinkContext): Maybe<string> {
  if (hasWorkflowJobResult(input.tagCreationResult, 'success')) {
    return formatRepositoryTreeLink(input.tagName, github);
  }

  return Maybe.nothing<string>();
}

function formatVerifiedProductionTagLink(input: ProductionSummaryInput, github: GitHubLinkContext): Maybe<string> {
  if (hasWorkflowJobResult(input.tagCreationResult, 'success')) {
    return formatRepositoryTreeLink(input.createdTagName, github);
  }

  if (hasProductionPreflightResult(input.preflightResult, 'already_tagged')) {
    return formatRepositoryTreeLink(input.plannedTagName, github);
  }

  return Maybe.nothing<string>();
}

function formatCodeValue(value: Maybe<string>): string {
  return `\`${formatValueOrFallback(value)}\``;
}

function formatBetaStageOverview(input: WebappReleaseSummaryInput): string {
  const betaTagLink = formatVerifiedBetaTagLink(input.beta, input.github);
  const betaResult = formatBetaResult(input.beta.deploymentResult);

  return betaTagLink.mapOr(betaResult, tagLink => {
    return `${betaResult} — tag ${tagLink}`;
  });
}

function formatE2EStageOverview(input: WebappReleaseSummaryInput): string {
  const reportLink = formatOptionalExternalLink('Playwright report', input.e2e.reportUrl);
  const e2EResult = formatE2EResult(input.e2e.result);

  return reportLink.mapOr(e2EResult, link => {
    return `${e2EResult} — ${link}`;
  });
}

function hasProductionPreflightFailure(input: ProductionSummaryInput): boolean {
  return (
    hasWorkflowJobResult(input.preflightJobResult, 'failure') ||
    hasProductionPreflightResult(input.preflightResult, 'failure')
  );
}

function hasProductionPreflightCancellation(input: ProductionSummaryInput): boolean {
  return hasWorkflowJobResult(input.preflightJobResult, 'cancelled');
}

function hasHostedProductionCompleted(input: ProductionSummaryInput): boolean {
  return (
    input.promotionRequested &&
    hasProductionPreflightResult(input.preflightResult, 'ready') &&
    hasWorkflowJobResult(input.preflightJobResult, 'success') &&
    hasWorkflowJobResult(input.deploymentResult, 'success') &&
    hasWorkflowJobResult(input.runtimeVerificationResult, 'success') &&
    hasWorkflowJobResult(input.tagCreationResult, 'success')
  );
}

function formatBetaReleaseOutcome(input: WebappReleaseSummaryInput): string {
  if (hasWorkflowJobResult(input.beta.deploymentResult, 'failure')) {
    return 'Beta release stopped because Hosted Beta deployment failed';
  }

  if (hasWorkflowJobResult(input.beta.deploymentResult, 'cancelled')) {
    return 'Beta release stopped because Hosted Beta deployment was cancelled';
  }

  if (hasWorkflowJobResult(input.beta.deploymentResult, 'skipped')) {
    return 'Beta release incomplete because Hosted Beta deployment did not run';
  }

  if (hasWorkflowJobResult(input.beta.tagCreationResult, 'failure')) {
    return 'Beta release stopped because Beta tag creation failed';
  }

  if (hasWorkflowJobResult(input.beta.tagCreationResult, 'cancelled')) {
    return 'Beta release stopped because Beta tag creation was cancelled';
  }

  if (hasWorkflowJobResult(input.beta.tagCreationResult, 'skipped')) {
    return 'Beta release incomplete because Beta tag creation did not run';
  }

  if (
    hasWorkflowJobResult(input.beta.deploymentResult, 'success') &&
    hasWorkflowJobResult(input.beta.tagCreationResult, 'success')
  ) {
    return 'Beta release completed successfully';
  }

  return 'Beta release status is unavailable or unexpected';
}

function formatFinalReleaseOutcome(input: WebappReleaseSummaryInput): string {
  if (hasWorkflowJobResult(input.beta.deploymentResult, 'failure')) {
    return 'Release stopped because Hosted Beta deployment failed';
  }

  if (hasWorkflowJobResult(input.beta.deploymentResult, 'cancelled')) {
    return 'Release stopped because Hosted Beta deployment was cancelled';
  }

  if (hasWorkflowJobResult(input.beta.deploymentResult, 'skipped')) {
    return 'Release incomplete because Hosted Beta deployment did not run';
  }

  if (hasWorkflowJobResult(input.beta.tagCreationResult, 'failure')) {
    return 'Release stopped because Beta tag creation failed';
  }

  if (hasWorkflowJobResult(input.beta.tagCreationResult, 'cancelled')) {
    return 'Release stopped because Beta tag creation was cancelled';
  }

  if (hasWorkflowJobResult(input.beta.tagCreationResult, 'skipped')) {
    return 'Release incomplete because Beta tag creation did not run';
  }

  if (hasWorkflowJobResult(input.e2e.result, 'failure')) {
    return 'Release stopped because the E2E system gate failed';
  }

  if (hasWorkflowJobResult(input.e2e.result, 'cancelled')) {
    return 'Release stopped because the E2E system gate was cancelled';
  }

  if (hasWorkflowJobResult(input.e2e.result, 'skipped')) {
    return 'Release incomplete because the E2E system gate did not run';
  }

  if (hasWorkflowJobResult(input.e2e.result, 'success') && input.production.promotionRequested === false) {
    return 'Beta release completed; Production promotion was not requested';
  }

  if (hasProductionPreflightResult(input.production.preflightResult, 'already_tagged')) {
    return 'Release already has the matching Production tag; deployment was not repeated';
  }

  if (hasProductionPreflightFailure(input.production)) {
    return 'Release stopped because Production preflight failed';
  }

  if (hasProductionPreflightCancellation(input.production)) {
    return 'Release stopped because Production preflight was cancelled';
  }

  if (hasWorkflowJobResult(input.production.deploymentResult, 'failure')) {
    return 'Release stopped because Hosted Production deployment failed';
  }

  if (hasWorkflowJobResult(input.production.deploymentResult, 'cancelled')) {
    return 'Release stopped because Hosted Production deployment was cancelled';
  }

  if (hasWorkflowJobResult(input.production.runtimeVerificationResult, 'failure')) {
    return 'Hosted Production was deployed, but runtime verification failed';
  }

  if (hasWorkflowJobResult(input.production.runtimeVerificationResult, 'cancelled')) {
    return 'Hosted Production was deployed, but runtime verification was cancelled';
  }

  if (hasWorkflowJobResult(input.production.tagCreationResult, 'failure')) {
    return 'Hosted Production was deployed and verified, but Production tag creation failed';
  }

  if (hasWorkflowJobResult(input.production.tagCreationResult, 'cancelled')) {
    return 'Hosted Production was deployed and verified, but Production tag creation was cancelled';
  }

  if (
    hasHostedProductionCompleted(input.production) &&
    (hasWorkflowJobResult(input.distribution.distributionJobResult, 'failure') ||
      hasWorkflowJobResult(input.distribution.distributionResult, 'failure'))
  ) {
    return 'Hosted Production completed, but release distribution failed';
  }

  if (
    hasHostedProductionCompleted(input.production) &&
    (hasWorkflowJobResult(input.distribution.distributionJobResult, 'cancelled') ||
      hasWorkflowJobResult(input.distribution.distributionResult, 'cancelled'))
  ) {
    return 'Hosted Production completed, but release distribution was cancelled';
  }

  if (
    hasHostedProductionCompleted(input.production) &&
    hasWorkflowJobResult(input.distribution.distributionJobResult, 'success') &&
    hasWorkflowJobResult(input.distribution.distributionResult, 'success')
  ) {
    return 'Release completed successfully';
  }

  return 'Release status is unavailable or unexpected';
}

function formatFinalProductionOverview(input: WebappReleaseSummaryInput): string {
  if (hasWorkflowJobResult(input.beta.deploymentResult, 'failure')) {
    return 'blocked because Hosted Beta deployment failed';
  }

  if (hasWorkflowJobResult(input.beta.deploymentResult, 'cancelled')) {
    return 'unavailable because Hosted Beta deployment was cancelled';
  }

  if (hasWorkflowJobResult(input.beta.deploymentResult, 'skipped')) {
    return 'unavailable because Hosted Beta deployment did not run';
  }

  if (hasWorkflowJobResult(input.beta.tagCreationResult, 'failure')) {
    return 'blocked because Beta tag creation failed';
  }

  if (hasWorkflowJobResult(input.beta.tagCreationResult, 'cancelled')) {
    return 'unavailable because Beta tag creation was cancelled';
  }

  if (hasWorkflowJobResult(input.beta.tagCreationResult, 'skipped')) {
    return 'unavailable because Beta tag creation did not run';
  }

  if (hasWorkflowJobResult(input.e2e.result, 'failure')) {
    return 'blocked because the E2E system gate failed';
  }

  if (hasWorkflowJobResult(input.e2e.result, 'cancelled')) {
    return 'unavailable because the E2E system gate was cancelled';
  }

  if (hasWorkflowJobResult(input.e2e.result, 'skipped')) {
    return 'unavailable because the E2E system gate did not run';
  }

  return formatProductionResult(input.production);
}

function formatDistributionPublicationEvidence(
  distribution: ProductionDistributionSummaryInput,
  github: GitHubLinkContext,
): string {
  const evidence: string[] = [];

  const dockerImage = formatDockerImage(distribution);
  if (dockerImage !== 'not published') {
    evidence.push(`Docker \`${dockerImage}\``);
  }

  distribution.helmChartVersion.map(version => {
    evidence.push(`Helm \`${version}\``);

    return version;
  });

  const wireBuildsCommitLink = distribution.wireBuildsCommitSha.andThen(commitSha => {
    return github.serverUrl.andThen(serverUrl => {
      return github.wireBuildsRepository.map(repository => {
        return formatMarkdownLink(commitSha, `${serverUrl}/${repository}/commit/${commitSha}`);
      });
    });
  });
  wireBuildsCommitLink.map(commitLink => {
    evidence.push(`wire-builds ${commitLink}`);

    return commitLink;
  });

  return evidence.join(', ');
}

function renderReleaseIdentity({title, outcome, input}: RenderReleaseIdentityParameters): string {
  const identityLines = [
    title,
    '',
    `- Outcome: ${outcome}`,
    `- Release: ${formatCodeValue(input.release.identifier)}`,
    `- Release branch: ${formatCodeValue(input.release.branch)}`,
    `- Commit: ${formatCommitLink(input.release.commitSha, input.github)}`,
    `- Webapp version: ${formatCodeValue(input.release.artifactVersion)}`,
  ];

  identityLines.push(`- Workflow run: ${formatWorkflowRunLink(input.github)}`);

  return identityLines.join('\n');
}

function renderBetaSection(input: WebappReleaseSummaryInput): string {
  return [
    '### Hosted Beta validation',
    '',
    `- Result: ${formatBetaResult(input.beta.deploymentResult)}`,
    '- GitHub Environment: wire-webapp-beta',
    `- Target environment: ${formatValueOrFallback(input.beta.environmentName)}`,
    `- Frontend URL: ${formatOptionalFrontendUrl(input.beta.webappUrl)}`,
    `- REST backend URL: ${formatValueOrFallback(input.beta.runtimeBackendRest)}`,
    `- WebSocket backend URL: ${formatValueOrFallback(input.beta.runtimeBackendWebSocket)}`,
    ...renderRuntimeVerificationLines(input.beta.runtimeVerificationResult),
    ...(hasWorkflowJobResult(input.beta.deploymentResult, 'success')
      ? ['- Runtime verification: /version and /config.js']
      : []),
    `- Beta tag: ${formatBetaTag(input.beta, input.github)}`,
  ].join('\n');
}

function renderE2ESection(input: WebappReleaseSummaryInput): string {
  const testinyRunName =
    input.release.identifier.isJust && input.beta.tagName.isJust
      ? formatValueOrFallback(input.e2e.testinyRunName)
      : 'not run';

  return [
    '### E2E system gate',
    '',
    `- Result: ${formatE2EResult(input.e2e.result)}`,
    `- Target environment: ${formatValueOrFallback(input.e2e.environmentName)}`,
    `- Frontend URL: ${formatOptionalFrontendUrl(input.e2e.webappUrl)}`,
    `- REST backend URL: ${formatValueOrFallback(input.e2e.runtimeBackendRest)}`,
    `- WebSocket backend URL: ${formatValueOrFallback(input.e2e.runtimeBackendWebSocket)}`,
    ...(hasWorkflowJobResult(input.e2e.result, 'success') ? ['- Runtime verification: /version and /config.js'] : []),
    `- Playwright report URL: ${formatOptionalReportUrl(input.e2e.reportUrl)}`,
    `- Testiny run name: ${testinyRunName}`,
  ].join('\n');
}

function renderProductionSection(input: WebappReleaseSummaryInput): string {
  const productionSkipReason = formatProductionSkipReason(input.production);
  const productionSkipReasonLines = productionSkipReason
    .map(reason => {
      return [`- Skip reason: ${reason}`];
    })
    .unwrapOr([]);

  return [
    '### Hosted Production promotion',
    '',
    `- Result: ${formatProductionResult(input.production)}`,
    `- Production promotion requested: ${input.production.promotionRequested === true ? 'true' : 'false'}`,
    `- Production preflight result: ${formatProductionPreflightResult(input.production)}`,
    ...productionSkipReasonLines,
    `- Target environment: ${formatValueOrFallback(input.production.environmentName)}`,
    `- Frontend URL: ${formatOptionalFrontendUrl(input.production.webappUrl)}`,
    `- REST backend URL: ${formatValueOrFallback(input.production.runtimeBackendRest)}`,
    `- WebSocket backend URL: ${formatValueOrFallback(input.production.runtimeBackendWebSocket)}`,
    ...renderRuntimeVerificationLines(input.production.runtimeVerificationResult),
    ...(hasWorkflowJobResult(input.production.runtimeVerificationResult, 'success')
      ? ['- Runtime verification: /version and /config.js']
      : []),
    `- Production tag: ${formatProductionTag(input.production, input.github)}`,
    `- Production tag creation result: ${formatProductionTagCreationResult(input.production)}`,
    `- Approval gate: ${formatApprovalGate(input.production)}`,
  ].join('\n');
}

function renderProductionDistributionSection(input: WebappReleaseSummaryInput): string {
  return [
    '### Release distribution',
    '',
    `- Result: ${formatDistributionResult(input.production, input.distribution)}`,
    `- Docker image: ${formatDockerImage(input.distribution)}`,
    `- Helm chart repository: ${formatValueOrFallback(input.distribution.chartRepositoryUrl)}`,
    `- Helm chart version: ${formatValueOrFallback(input.distribution.helmChartVersion, 'not published')}`,
    `- wire-builds/main commit: ${formatWireBuildsCommit(input.distribution, input.github)}`,
  ].join('\n');
}

function renderReleasePreparationSection(input: WebappReleaseSummaryInput): string {
  const commitLink = formatCommitLink(input.release.commitSha, input.github);
  const sourceCommitLink = formatSourceCommit(input);
  const workflowRunLink = formatWorkflowRunLink(input.github);

  return [
    '### Release preparation',
    '',
    `- Release identifier: ${formatValueOrFallback(input.release.identifier)}`,
    `- Release branch: ${formatValueOrFallback(input.release.branch)}`,
    `- Branch action: ${formatReleaseBranchAction(input.preparation.branchAction)}`,
    `- Source ref: ${formatValueOrFallback(input.preparation.sourceRef)}`,
    `- Source commit used for creation: ${sourceCommitLink}`,
    `- Authoritative release commit: ${commitLink}`,
    `- Branch preparation: ${formatReleaseBranchPreparationNote(input.preparation.branchAction)}`,
    `- Actor: ${formatValueOrFallback(input.github.actor)}`,
    `- Webapp version: ${formatValueOrFallback(input.release.artifactVersion)}`,
    `- Asset version: ${formatValueOrFallback(input.release.artifactAssetVersion)}`,
    `- Built at (UTC): ${formatValueOrFallback(input.release.artifactBuiltAt)}`,
    `- Artifact name: ${formatValueOrFallback(input.release.artifactName)}`,
    `- Artifact checksum: ${formatValueOrFallback(input.release.artifactChecksum)}`,
    `- Workflow run URL: ${workflowRunLink}`,
    ...input.release.manualReason
      .map(reason => {
        return [`- Manual reason: ${reason}`];
      })
      .unwrapOr([]),
  ].join('\n');
}

type WebappReleaseSummaryPhase = 'beta' | 'final';

function renderTechnicalReleaseEvidence(input: WebappReleaseSummaryInput, phase: WebappReleaseSummaryPhase): string {
  const technicalSections = [renderReleasePreparationSection(input), renderBetaSection(input)];

  if (phase === 'final') {
    technicalSections.push(renderE2ESection(input), renderProductionSection(input));
    technicalSections.push(renderProductionDistributionSection(input));
  }

  return [
    '<details>',
    '<summary>Technical release evidence</summary>',
    '',
    technicalSections.join('\n\n'),
    '',
    '</details>',
  ].join('\n');
}

export function renderWebappBetaReleaseSummary(input: WebappReleaseSummaryInput): string {
  const visibleSummary = [
    renderReleaseIdentity({
      title: '## WebApp Beta release',
      outcome: formatBetaReleaseOutcome(input),
      input,
    }),
    ['### Release stages', '', `- Hosted Beta: ${formatBetaStageOverview(input)}`].join('\n'),
  ].join('\n\n');

  return `${visibleSummary}\n\n${renderTechnicalReleaseEvidence(input, 'beta')}\n`;
}

export function renderWebappReleaseSummary(input: WebappReleaseSummaryInput): string {
  const distributionResult = formatDistributionResult(input.production, input.distribution);
  const distributionEvidence =
    distributionResult === 'published successfully'
      ? formatDistributionPublicationEvidence(input.distribution, input.github)
      : '';
  const distributionOverview =
    distributionEvidence === '' ? distributionResult : `${distributionResult} — ${distributionEvidence}`;
  const productionTagLink = formatVerifiedProductionTagLink(input.production, input.github);
  const formattedProductionOverview = formatFinalProductionOverview(input);
  const productionOverview = productionTagLink.mapOr(formattedProductionOverview, tagLink => {
    return `${formattedProductionOverview} — tag ${tagLink}`;
  });
  const visibleSummary = [
    renderReleaseIdentity({
      title: '## WebApp release',
      outcome: formatFinalReleaseOutcome(input),
      input,
    }),
    [
      '### Release stages',
      '',
      `- Hosted Beta: ${formatBetaStageOverview(input)}`,
      `- E2E system gate: ${formatE2EStageOverview(input)}`,
      `- Hosted Production: ${productionOverview}`,
      `- Release distribution: ${distributionOverview}`,
    ].join('\n'),
  ].join('\n\n');

  return `${visibleSummary}\n\n${renderTechnicalReleaseEvidence(input, 'final')}\n`;
}

const commandLineArgumentStartIndex = 2;

function readWebappReleaseSummaryPhase(commandLineArguments: readonly string[]): WebappReleaseSummaryPhase {
  if (commandLineArguments.includes('--beta-release')) {
    return 'beta';
  }

  return 'final';
}

function main(): void {
  try {
    const input = readWebappReleaseSummaryInput(process.env);
    const summaryPhase = readWebappReleaseSummaryPhase(process.argv.slice(commandLineArgumentStartIndex));
    const summary = summaryPhase === 'beta' ? renderWebappBetaReleaseSummary(input) : renderWebappReleaseSummary(input);

    process.stdout.write(summary);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  }
}

if (process.argv[1]?.endsWith('renderWebappReleaseSummary.ts') === true) {
  main();
}
