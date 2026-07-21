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
  readonly repository: Maybe<string>;
  readonly runId: Maybe<string>;
  readonly serverUrl: Maybe<string>;
  readonly wireBuildsRepository: Maybe<string>;
};

export type WebappReleaseSummaryInput = {
  readonly beta: BetaSummaryInput;
  readonly distribution: ProductionDistributionSummaryInput;
  readonly e2e: E2ESummaryInput;
  readonly github: GitHubLinkContext;
  readonly production: ProductionSummaryInput;
  readonly release: ReleaseMetadata;
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

function formatProductionDeploymentRequired(input: ProductionSummaryInput): string {
  const inferredDeploymentRequirement = input.preflightResult.mapOrElse(
    () => {
      return match(input.promotionRequested)
        .with(false, () => {
          return 'false';
        })
        .otherwise(() => {
          return 'not available';
        });
    },
    preflightResult => {
      return match([preflightResult, input.promotionRequested])
        .with(['ready', P._], () => {
          return 'true';
        })
        .with(['already_tagged', P._], () => {
          return 'false';
        })
        .with([P._, false], () => {
          return 'false';
        })
        .otherwise(() => {
          return 'not available';
        });
    },
  );

  return input.deploymentRequired.mapOr(inferredDeploymentRequirement, deploymentRequired => {
    return match(deploymentRequired)
      .with(true, () => {
        return 'true';
      })
      .with(false, () => {
        return 'false';
      })
      .exhaustive();
  });
}

function formatPlannedProductionTag(input: ProductionSummaryInput, release: ReleaseMetadata): string {
  const plannedTagName = input.plannedTagName.orElse(() => {
    return release.identifier.map(identifier => {
      return `${identifier}-production`;
    });
  });

  if (input.promotionRequested === false) {
    return 'not requested';
  }

  return plannedTagName.mapOr('not available', plannedTag => {
    return `\`${plannedTag}\``;
  });
}

function formatEarlierFailedGate(beta: BetaSummaryInput, e2e: E2ESummaryInput): Maybe<string> {
  if (hasWorkflowJobResult(beta.deploymentResult, 'failure')) {
    return Maybe.just('Beta deployment failed');
  }

  if (hasWorkflowJobResult(beta.tagCreationResult, 'failure')) {
    return Maybe.just('Beta tag creation failed');
  }

  if (hasWorkflowJobResult(e2e.result, 'failure')) {
    return Maybe.just('E2E system gate failed');
  }

  return Maybe.nothing<string>();
}

function formatProductionApprovalStatus(
  input: ProductionSummaryInput,
  beta: BetaSummaryInput,
  e2e: E2ESummaryInput,
): string {
  if (input.promotionRequested === false) {
    return 'Production promotion was not requested';
  }

  if (hasProductionPreflightResult(input.preflightResult, 'already_tagged')) {
    return 'Production deployment is not required because the release is already tagged';
  }

  if (
    hasProductionPreflightResult(input.preflightResult, 'ready') &&
    hasWorkflowJobResult(input.preflightJobResult, 'success')
  ) {
    return 'Production is ready for deployment. Approval is enforced through the wire-webapp-prod GitHub Environment.';
  }

  if (hasWorkflowJobResult(input.preflightJobResult, 'failure')) {
    return 'Production is blocked because Production preflight failed';
  }

  if (hasWorkflowJobResult(input.preflightJobResult, 'cancelled')) {
    return 'Production preflight was cancelled; Production approval is unavailable';
  }

  if (hasWorkflowJobResult(input.preflightJobResult, 'skipped')) {
    const earlierFailedGate = formatEarlierFailedGate(beta, e2e);

    if (earlierFailedGate.isJust) {
      return `Production is blocked because an earlier gate failed: ${earlierFailedGate.value}; Production preflight was skipped`;
    }

    if (hasWorkflowJobResult(e2e.result, 'cancelled')) {
      return 'Production preflight was skipped because the E2E system gate was cancelled';
    }

    if (hasWorkflowJobResult(e2e.result, 'skipped')) {
      return 'Production preflight was skipped because the E2E system gate did not run';
    }

    return 'Production preflight was skipped; Production approval is unavailable';
  }

  return 'Production approval status is unavailable or unexpected';
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

function renderBetaSection(input: WebappReleaseSummaryInput, commitLink: string, workflowRunLink: string): string {
  return [
    '### Beta deployment',
    '',
    `- Result: ${formatBetaResult(input.beta.deploymentResult)}`,
    `- Release branch: ${formatValueOrFallback(input.release.branch)}`,
    `- Webapp version: ${formatValueOrFallback(input.release.artifactVersion)}`,
    `- Asset version: ${formatValueOrFallback(input.release.artifactAssetVersion)}`,
    `- Commit SHA: ${commitLink}`,
    `- Built at (UTC): ${formatValueOrFallback(input.release.artifactBuiltAt)}`,
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
    `- Artifact name: ${formatValueOrFallback(input.release.artifactName)}`,
    `- Artifact checksum: ${formatValueOrFallback(input.release.artifactChecksum)}`,
    `- Workflow run URL: ${workflowRunLink}`,
  ].join('\n');
}

function renderE2ESection(input: WebappReleaseSummaryInput, commitLink: string, workflowRunLink: string): string {
  const testinyRunName =
    input.release.identifier.isJust && input.beta.tagName.isJust
      ? formatValueOrFallback(input.e2e.testinyRunName)
      : 'not run';

  return [
    '### E2E system gate',
    '',
    `- Result: ${formatE2EResult(input.e2e.result)}`,
    `- Webapp version: ${formatValueOrFallback(input.release.artifactVersion)}`,
    `- Asset version: ${formatValueOrFallback(input.release.artifactAssetVersion)}`,
    `- Commit SHA: ${commitLink}`,
    `- Built at (UTC): ${formatValueOrFallback(input.release.artifactBuiltAt)}`,
    `- Target environment: ${formatValueOrFallback(input.e2e.environmentName)}`,
    `- Frontend URL: ${formatOptionalFrontendUrl(input.e2e.webappUrl)}`,
    `- REST backend URL: ${formatValueOrFallback(input.e2e.runtimeBackendRest)}`,
    `- WebSocket backend URL: ${formatValueOrFallback(input.e2e.runtimeBackendWebSocket)}`,
    ...(hasWorkflowJobResult(input.e2e.result, 'success') ? ['- Runtime verification: /version and /config.js'] : []),
    `- Playwright report URL: ${formatOptionalReportUrl(input.e2e.reportUrl)}`,
    `- Testiny run name: ${testinyRunName}`,
    `- Workflow run URL: ${workflowRunLink}`,
  ].join('\n');
}

function renderProductionReadinessSection(input: WebappReleaseSummaryInput, workflowRunLink: string): string {
  const productionSkipReason = formatProductionSkipReason(input.production);
  const productionSkipReasonLines = productionSkipReason
    .map(reason => {
      return [`- Production skip reason: ${reason}`];
    })
    .unwrapOr([]);

  return [
    '### Production readiness',
    '',
    `- Production promotion requested: ${input.production.promotionRequested === true ? 'true' : 'false'}`,
    `- Production preflight job result: ${formatValueOrFallback(input.production.preflightJobResult)}`,
    `- Production preflight result: ${formatProductionPreflightResult(input.production)}`,
    `- Production deployment required: ${formatProductionDeploymentRequired(input.production)}`,
    ...productionSkipReasonLines,
    `- Planned Production tag: ${formatPlannedProductionTag(input.production, input.release)}`,
    `- GitHub Environment: ${formatValueOrFallback(input.production.environmentName)}`,
    `- Approval status: ${formatProductionApprovalStatus(input.production, input.beta, input.e2e)}`,
    `- Workflow run URL: ${workflowRunLink}`,
  ].join('\n');
}

function renderProductionSection(
  input: WebappReleaseSummaryInput,
  commitLink: string,
  workflowRunLink: string,
): string {
  const productionSkipReason = formatProductionSkipReason(input.production);
  const productionSkipReasonLines = productionSkipReason
    .map(reason => {
      return [`- Skip reason: ${reason}`];
    })
    .unwrapOr([]);

  return [
    '### Production deployment',
    '',
    `- Result: ${formatProductionResult(input.production)}`,
    `- Production promotion requested: ${input.production.promotionRequested === true ? 'true' : 'false'}`,
    `- Production preflight result: ${formatProductionPreflightResult(input.production)}`,
    ...productionSkipReasonLines,
    `- Webapp version: ${formatValueOrFallback(input.release.artifactVersion)}`,
    `- Asset version: ${formatValueOrFallback(input.release.artifactAssetVersion)}`,
    `- Commit SHA: ${commitLink}`,
    `- Built at (UTC): ${formatValueOrFallback(input.release.artifactBuiltAt)}`,
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
    `- Workflow run URL: ${workflowRunLink}`,
  ].join('\n');
}

function renderProductionDistributionSection(
  input: WebappReleaseSummaryInput,
  commitLink: string,
  workflowRunLink: string,
): string {
  return [
    '### Production distribution',
    '',
    `- Result: ${formatDistributionResult(input.production, input.distribution)}`,
    `- Webapp version: ${formatValueOrFallback(input.release.artifactVersion)}`,
    `- Asset version: ${formatValueOrFallback(input.release.artifactAssetVersion)}`,
    `- Commit SHA: ${commitLink}`,
    `- Built at (UTC): ${formatValueOrFallback(input.release.artifactBuiltAt)}`,
    `- Docker image: ${formatDockerImage(input.distribution)}`,
    `- Helm chart repository: ${formatValueOrFallback(input.distribution.chartRepositoryUrl)}`,
    `- Helm chart version: ${formatValueOrFallback(input.distribution.helmChartVersion, 'not published')}`,
    `- wire-builds/main commit: ${formatWireBuildsCommit(input.distribution, input.github)}`,
    `- Workflow run URL: ${workflowRunLink}`,
  ].join('\n');
}

function renderReleaseMetadata(
  input: WebappReleaseSummaryInput,
  title: string,
  commitLink: string,
  workflowRunLink: string,
): string {
  return [
    `## ${title}`,
    '',
    `- Release branch: ${formatValueOrFallback(input.release.branch)}`,
    `- Release identifier: ${formatValueOrFallback(input.release.identifier)}`,
    `- Webapp version: ${formatValueOrFallback(input.release.artifactVersion)}`,
    `- Asset version: ${formatValueOrFallback(input.release.artifactAssetVersion)}`,
    `- Commit SHA: ${commitLink}`,
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

export function renderWebappReleaseCandidateSummary(input: WebappReleaseSummaryInput): string {
  const commitLink = formatCommitLink(input.release.commitSha, input.github);
  const workflowRunLink = formatWorkflowRunLink(input.github);

  return (
    [
      renderReleaseMetadata(input, 'WebApp release candidate', commitLink, workflowRunLink),
      renderBetaSection(input, commitLink, workflowRunLink),
      renderE2ESection(input, commitLink, workflowRunLink),
      renderProductionReadinessSection(input, workflowRunLink),
    ].join('\n\n') + '\n'
  );
}

export function renderWebappReleaseSummary(input: WebappReleaseSummaryInput): string {
  const commitLink = formatCommitLink(input.release.commitSha, input.github);
  const workflowRunLink = formatWorkflowRunLink(input.github);

  return (
    [
      renderReleaseMetadata(input, 'WebApp release', commitLink, workflowRunLink),
      renderBetaSection(input, commitLink, workflowRunLink),
      renderE2ESection(input, commitLink, workflowRunLink),
      renderProductionSection(input, commitLink, workflowRunLink),
      renderProductionDistributionSection(input, commitLink, workflowRunLink),
    ].join('\n\n') + '\n'
  );
}

type WebappReleaseSummaryPhase = 'candidate' | 'final';

function readWebappReleaseSummaryPhase(commandLineArguments: readonly string[]): WebappReleaseSummaryPhase {
  if (commandLineArguments.includes('--release-candidate')) {
    return 'candidate';
  }

  return 'final';
}

function main(): void {
  try {
    const input = readWebappReleaseSummaryInput(process.env);
    const summaryPhase = readWebappReleaseSummaryPhase(process.argv.slice(2));
    const summary =
      summaryPhase === 'candidate' ? renderWebappReleaseCandidateSummary(input) : renderWebappReleaseSummary(input);

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
