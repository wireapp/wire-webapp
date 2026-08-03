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

import {isError, isNonEmptyStringAndNotWhitespace} from '@sindresorhus/is';
import {Maybe, Result, Unit} from 'true-myth';
import {match} from 'ts-pattern';

import {execFile} from 'node:child_process';
import {appendFile} from 'node:fs/promises';
import {promisify} from 'node:util';

import {createGitHubClient} from './githubClient.ts';
import type {GitHubClient, IssueCommentRecord} from './githubClient.ts';
import {createRuntimeKyHttpClient} from './httpClient.ts';
import {
  mergeReleaseAppearanceComments,
  parsePersistentMarkerComment,
  renderPersistentComment,
} from './releaseAppearance.ts';
import type {ReleaseAppearanceState} from './releaseAppearance.ts';
import {planBetaReleaseHistory, planProductionReleaseHistory} from './releaseHistory.ts';
import type {CommitRange, ExecuteGitCommand, ReleaseHistoryPlan} from './releaseHistory.ts';

export type ReleaseAppearanceCommandStage = 'beta' | 'production';
export type ExecutionMode = 'write' | 'dry-run';

export type ParsedCommand =
  | {
      readonly stage: 'beta';
      readonly releaseTag: string;
      readonly releaseCommit: string;
      readonly executionMode: ExecutionMode;
    }
  | {
      readonly stage: 'production';
      readonly releaseTag: string;
      readonly releaseCommit: string;
      readonly promotedBetaTag: string;
      readonly executionMode: ExecutionMode;
    };

export type CommandEnvironment = {
  readonly githubApiUrl: URL;
  readonly githubRepository: string;
  readonly githubStepSummary: string;
  readonly githubToken: string;
};

export type ReleaseAppearanceCommandDependencies = {
  readonly executeGitCommand: ExecuteGitCommand;
  readonly githubClient: GitHubClient;
  readonly writeFailure: (message: string) => Promise<void>;
  readonly writeInformation: (message: string) => Promise<void>;
  readonly writeSummary: (summary: string) => Promise<void>;
};

export type ExecuteReleaseAppearanceCommandOptions = {
  readonly commandLineArguments: readonly string[];
  readonly environment: NodeJS.ProcessEnv;
  readonly dependencies: ReleaseAppearanceCommandDependencies;
};

export type ReleaseAppearanceCommandResult = {
  readonly exitCode: number;
  readonly summary: string;
};

export type CommentOperation =
  | {readonly kind: 'create'; readonly commentBody: string}
  | {readonly kind: 'update'; readonly commentId: number; readonly commentBody: string}
  | {readonly kind: 'unchanged'};

type PullRequestAppearance = {
  readonly number: number;
  readonly earliestBetaTag: string;
};

type DiscoveryRange = {
  readonly candidateTag: string;
  readonly commitRange: CommitRange;
};

type DiscoveryResult = {
  readonly pullRequests: readonly PullRequestAppearance[];
  readonly commitsInspected: readonly string[];
  readonly commitsWithoutPullRequests: readonly string[];
  readonly failureMessages: readonly string[];
};

type PullRequestFailure = {
  readonly pullRequestNumber: number;
  readonly message: string;
};

type PlannedCommentOperation = {
  readonly pullRequestNumber: number;
  readonly kind: CommentOperation['kind'];
};

type ProcessingResult = {
  readonly commentsCreated: number;
  readonly commentsUpdated: number;
  readonly commentsUnchanged: number;
  readonly plannedCommentOperations: readonly PlannedCommentOperation[];
  readonly failures: readonly PullRequestFailure[];
};

type SummaryOptions = {
  readonly executionMode: ExecutionMode;
  readonly stage: ReleaseAppearanceCommandStage;
  readonly releaseTag: string;
  readonly releaseCommit: string;
  readonly bootstrap: boolean;
  readonly precedingProductionTag: string;
  readonly candidateRanges: readonly DiscoveryRange[];
  readonly commitsInspected: readonly string[];
  readonly pullRequestsDiscovered: readonly PullRequestAppearance[];
  readonly commitsWithoutPullRequests: readonly string[];
  readonly commentsCreated: number;
  readonly commentsUpdated: number;
  readonly commentsUnchanged: number;
  readonly plannedCommentOperations: readonly PlannedCommentOperation[];
  readonly generalFailureMessages: readonly string[];
  readonly pullRequestFailures: readonly PullRequestFailure[];
};

type FinalizeSummaryOptions = {
  readonly dependencies: Pick<
    ReleaseAppearanceCommandDependencies,
    'writeFailure' | 'writeInformation' | 'writeSummary'
  >;
  readonly summaryOptions: SummaryOptions;
  readonly githubToken: string;
  readonly exitCode: number;
};

const betaCommandArgumentCount = 3;
const productionCommandArgumentCount = 4;
const processArgumentStartIndex = 2;
const stageArgumentIndex = 0;
const releaseTagArgumentIndex = 1;
const releaseCommitArgumentIndex = 2;
const promotedBetaTagArgumentIndex = 3;
const dryRunFlag = '--dry-run';
const fullGitCommitPattern = /^[0-9a-f]{40}$/i;

function createSuccess<valueType>(value: valueType): Result<valueType, Error> {
  return Result.ok<valueType, Error>(value);
}

function createFailure<valueType>(message: string, cause?: unknown): Result<valueType, Error> {
  return Result.err<valueType, Error>(new Error(message, {cause}));
}

function errorMessage(error: unknown): string {
  return isError(error) ? error.message : 'Unknown failure';
}

function redactSecret(message: string, secret: string): string {
  return secret.length === 0 ? message : message.replaceAll(secret, '[REDACTED]');
}

function createGeneralFailureMessage(category: string, message: string, githubToken: string): string {
  return `${category}: ${redactSecret(message, githubToken)}`;
}

function createPullRequestFailure(pullRequestNumber: number, message: string, githubToken: string): PullRequestFailure {
  return {
    pullRequestNumber,
    message: redactSecret(message, githubToken),
  };
}

function formatPullRequestFailure(pullRequestFailure: PullRequestFailure): string {
  return `Pull request #${pullRequestFailure.pullRequestNumber}: ${pullRequestFailure.message}`;
}

function usageFailure(): Result<ParsedCommand, Error> {
  return createFailure(
    'Usage: beta <beta-tag> <release-commit-sha> [--dry-run] or production <production-tag> <release-commit-sha> <promoted-beta-tag> [--dry-run]',
  );
}

function parseExecutionMode(
  commandLineArguments: readonly string[],
  writeArgumentCount: number,
): Result<ExecutionMode, Error> {
  if (commandLineArguments.length === writeArgumentCount) {
    return createSuccess('write');
  }

  const dryRunFlagArgument = Maybe.of(commandLineArguments[writeArgumentCount]);
  if (
    commandLineArguments.length === writeArgumentCount + 1 &&
    dryRunFlagArgument.isJust &&
    dryRunFlagArgument.value === dryRunFlag
  ) {
    return createSuccess('dry-run');
  }

  return createFailure('Dry-run mode requires exactly one final --dry-run argument');
}

function readRequiredArgument(
  commandLineArguments: readonly string[],
  argumentIndex: number,
  argumentName: string,
): Result<string, Error> {
  const argument = Maybe.of(commandLineArguments[argumentIndex]);
  if (argument.isNothing || !isNonEmptyStringAndNotWhitespace(argument.value)) {
    return createFailure(`${argumentName} must not be empty`);
  }

  return createSuccess(argument.value);
}

function readReleaseCommit(commandLineArguments: readonly string[]): Result<string, Error> {
  return readRequiredArgument(commandLineArguments, releaseCommitArgumentIndex, 'Release commit SHA').andThen(
    releaseCommit => {
      return fullGitCommitPattern.test(releaseCommit)
        ? createSuccess(releaseCommit)
        : createFailure('Release commit SHA must contain exactly 40 hexadecimal characters');
    },
  );
}

function parseBetaCommand(
  commandLineArguments: readonly string[],
  executionMode: ExecutionMode,
): Result<ParsedCommand, Error> {
  const betaTagResult = readRequiredArgument(commandLineArguments, releaseTagArgumentIndex, 'Beta tag');
  if (betaTagResult.isErr) {
    return createFailure(betaTagResult.error.message);
  }

  return readReleaseCommit(commandLineArguments).map(releaseCommit => {
    return {stage: 'beta', releaseTag: betaTagResult.value, releaseCommit, executionMode};
  });
}

function parseProductionCommand(
  commandLineArguments: readonly string[],
  executionMode: ExecutionMode,
): Result<ParsedCommand, Error> {
  const productionTagResult = readRequiredArgument(commandLineArguments, releaseTagArgumentIndex, 'Production tag');
  if (productionTagResult.isErr) {
    return createFailure(productionTagResult.error.message);
  }

  const releaseCommitResult = readReleaseCommit(commandLineArguments);
  if (releaseCommitResult.isErr) {
    return createFailure(releaseCommitResult.error.message);
  }

  return readRequiredArgument(commandLineArguments, promotedBetaTagArgumentIndex, 'Promoted Beta tag').map(
    promotedBetaTag => {
      return {
        stage: 'production',
        releaseTag: productionTagResult.value,
        releaseCommit: releaseCommitResult.value,
        promotedBetaTag,
        executionMode,
      };
    },
  );
}

export function parseCommandLineArguments(commandLineArguments: readonly string[]): Result<ParsedCommand, Error> {
  const stage = Maybe.of(commandLineArguments[stageArgumentIndex]);
  if (stage.isNothing) {
    return usageFailure();
  }

  return match(stage.value)
    .with('beta', () => {
      const executionModeResult = parseExecutionMode(commandLineArguments, betaCommandArgumentCount);
      return executionModeResult.isOk
        ? parseBetaCommand(commandLineArguments, executionModeResult.value)
        : usageFailure();
    })
    .with('production', () => {
      const executionModeResult = parseExecutionMode(commandLineArguments, productionCommandArgumentCount);
      return executionModeResult.isOk
        ? parseProductionCommand(commandLineArguments, executionModeResult.value)
        : usageFailure();
    })
    .otherwise(() => {
      return usageFailure();
    });
}

function readRequiredEnvironmentValue(environment: NodeJS.ProcessEnv, variableName: string): Result<string, Error> {
  const environmentValue = environment[variableName];
  return isNonEmptyStringAndNotWhitespace(environmentValue)
    ? createSuccess(environmentValue)
    : createFailure(`${variableName} must be set`);
}

export function readCommandEnvironment(environment: NodeJS.ProcessEnv): Result<CommandEnvironment, Error> {
  const githubApiUrlResult = readRequiredEnvironmentValue(environment, 'GITHUB_API_URL');
  if (githubApiUrlResult.isErr) {
    return createFailure(githubApiUrlResult.error.message);
  }

  let githubApiUrl: URL;
  try {
    githubApiUrl = new URL(githubApiUrlResult.value);
  } catch (error: unknown) {
    return createFailure('GITHUB_API_URL must be a valid URL', error);
  }

  if (githubApiUrl.protocol !== 'https:' && githubApiUrl.protocol !== 'http:') {
    return createFailure('GITHUB_API_URL must use HTTP or HTTPS');
  }

  const githubRepositoryResult = readRequiredEnvironmentValue(environment, 'GITHUB_REPOSITORY');
  if (githubRepositoryResult.isErr) {
    return createFailure(githubRepositoryResult.error.message);
  }

  if (!/^[^/]+\/[^/]+$/.test(githubRepositoryResult.value)) {
    return createFailure('GITHUB_REPOSITORY must use the OWNER/REPOSITORY format');
  }

  const githubStepSummaryResult = readRequiredEnvironmentValue(environment, 'GITHUB_STEP_SUMMARY');
  const githubTokenResult = readRequiredEnvironmentValue(environment, 'GITHUB_TOKEN');
  if (githubStepSummaryResult.isErr) {
    return createFailure(githubStepSummaryResult.error.message);
  }
  if (githubTokenResult.isErr) {
    return createFailure(githubTokenResult.error.message);
  }

  return createSuccess({
    githubApiUrl,
    githubRepository: githubRepositoryResult.value,
    githubStepSummary: githubStepSummaryResult.value,
    githubToken: githubTokenResult.value,
  });
}

async function writeFailureSafely(writeFailure: (message: string) => Promise<void>, message: string): Promise<void> {
  try {
    await writeFailure(message);
  } catch {
    // Reporting must not stop processing the remaining pull requests.
  }
}

async function writeSummarySafely(
  dependencies: Pick<ReleaseAppearanceCommandDependencies, 'writeFailure' | 'writeSummary'>,
  summary: string,
  githubToken: string,
): Promise<Maybe<string>> {
  try {
    await dependencies.writeSummary(summary);
    return Maybe.nothing<string>();
  } catch (error: unknown) {
    const failureMessage = `Unable to write GitHub Actions summary: ${redactSecret(errorMessage(error), githubToken)}`;
    await writeFailureSafely(dependencies.writeFailure, failureMessage);
    return Maybe.just(failureMessage);
  }
}

async function discoverPullRequests(
  ranges: readonly DiscoveryRange[],
  githubClient: GitHubClient,
  githubToken: string,
): Promise<DiscoveryResult> {
  const pullRequestsByNumber = new Map<number, PullRequestAppearance>();
  const commitsInspected = new Set<string>();
  const commitsWithoutPullRequests = new Set<string>();
  const failureMessages: string[] = [];

  for (const range of ranges) {
    for (const commitSha of range.commitRange.commits) {
      commitsInspected.add(commitSha);
      const pullRequestsResult = await githubClient.listPullRequestsForCommit({commitSha});
      if (pullRequestsResult.isErr) {
        failureMessages.push(redactSecret(pullRequestsResult.error.message, githubToken));
        continue;
      }

      if (pullRequestsResult.value.length === 0) {
        commitsWithoutPullRequests.add(commitSha);
      }

      for (const pullRequest of pullRequestsResult.value) {
        if (!pullRequestsByNumber.has(pullRequest.number)) {
          pullRequestsByNumber.set(pullRequest.number, {
            number: pullRequest.number,
            earliestBetaTag: range.candidateTag,
          });
        }
      }
    }
  }

  return {
    pullRequests: [...pullRequestsByNumber.values()].toSorted((leftPullRequest, rightPullRequest) => {
      return leftPullRequest.number - rightPullRequest.number;
    }),
    commitsInspected: [...commitsInspected],
    commitsWithoutPullRequests: [...commitsWithoutPullRequests],
    failureMessages,
  };
}

function findPersistentCommentIndex(existingComments: readonly IssueCommentRecord[]): Result<Maybe<number>, Error> {
  let markerCommentIndex: Maybe<number> = Maybe.nothing<number>();
  for (let commentIndex = 0; commentIndex < existingComments.length; commentIndex += 1) {
    const existingComment = Maybe.of(existingComments[commentIndex]);
    if (existingComment.isNothing) {
      return createFailure('Issue comment was not found');
    }

    const parsedCommentResult = parsePersistentMarkerComment(existingComment.value.body);
    if (parsedCommentResult.isErr) {
      return createFailure(parsedCommentResult.error.message);
    }
    if (parsedCommentResult.value.isNothing) {
      continue;
    }
    if (markerCommentIndex.isJust) {
      return createFailure('More than one release-appearance marker comment exists');
    }
    markerCommentIndex = Maybe.just(commentIndex);
  }
  return createSuccess(markerCommentIndex);
}

export function prepareCommentOperation(
  existingComments: readonly IssueCommentRecord[],
  desiredReleaseState: ReleaseAppearanceState,
): Result<CommentOperation, Error> {
  const markerCommentIndexResult = findPersistentCommentIndex(existingComments);
  if (markerCommentIndexResult.isErr) {
    return createFailure(markerCommentIndexResult.error.message);
  }

  const mergedCommentsResult = mergeReleaseAppearanceComments(
    existingComments.map(existingComment => {
      return existingComment.body;
    }),
    desiredReleaseState,
  );
  if (mergedCommentsResult.isErr) {
    return createFailure(mergedCommentsResult.error.message);
  }

  if (markerCommentIndexResult.value.isNothing) {
    return createSuccess({kind: 'create', commentBody: renderPersistentComment(desiredReleaseState)});
  }

  const commentIndex = markerCommentIndexResult.value.value;
  const existingComment = Maybe.of(existingComments[commentIndex]);
  const mergedCommentBody = Maybe.of(mergedCommentsResult.value[commentIndex]);
  if (existingComment.isNothing || mergedCommentBody.isNothing) {
    return createFailure('Release-appearance marker comment merge returned no comment body');
  }
  if (mergedCommentBody.value === existingComment.value.body) {
    return createSuccess({kind: 'unchanged'});
  }
  return createSuccess({
    kind: 'update',
    commentId: existingComment.value.id,
    commentBody: mergedCommentBody.value,
  });
}

function createDesiredReleaseState(
  stage: ReleaseAppearanceCommandStage,
  releaseTag: string,
  earliestBetaTag: string,
): ReleaseAppearanceState {
  return match(stage)
    .with('beta', () => {
      return {beta: Maybe.just(releaseTag), production: Maybe.nothing<string>()};
    })
    .with('production', () => {
      return {beta: Maybe.just(earliestBetaTag), production: Maybe.just(releaseTag)};
    })
    .exhaustive();
}

async function writePullRequestComment(
  pullRequestNumber: number,
  operation: Exclude<CommentOperation, {readonly kind: 'unchanged'}>,
  githubClient: GitHubClient,
): Promise<Result<Unit, Error>> {
  const writeResult = await match(operation)
    .with({kind: 'create'}, createOperation => {
      return githubClient.createIssueComment({
        pullRequestNumber,
        commentBody: createOperation.commentBody,
      });
    })
    .with({kind: 'update'}, updateOperation => {
      return githubClient.updateIssueComment({
        commentId: updateOperation.commentId,
        commentBody: updateOperation.commentBody,
      });
    })
    .exhaustive();
  return writeResult.map(() => {
    return Unit;
  });
}

async function processPullRequests(
  pullRequests: readonly PullRequestAppearance[],
  stage: ReleaseAppearanceCommandStage,
  releaseTag: string,
  executionMode: ExecutionMode,
  dependencies: Pick<ReleaseAppearanceCommandDependencies, 'githubClient' | 'writeFailure'>,
  githubToken: string,
): Promise<ProcessingResult> {
  let commentsCreated = 0;
  let commentsUpdated = 0;
  let commentsUnchanged = 0;
  const plannedCommentOperations: PlannedCommentOperation[] = [];
  const failures: PullRequestFailure[] = [];

  for (const pullRequest of pullRequests) {
    const commentsResult = await dependencies.githubClient.listIssueComments({
      pullRequestNumber: pullRequest.number,
    });
    if (commentsResult.isErr) {
      const pullRequestFailure = createPullRequestFailure(
        pullRequest.number,
        commentsResult.error.message,
        githubToken,
      );
      failures.push(pullRequestFailure);
      await writeFailureSafely(dependencies.writeFailure, formatPullRequestFailure(pullRequestFailure));
      continue;
    }

    const operationResult = prepareCommentOperation(
      commentsResult.value,
      createDesiredReleaseState(stage, releaseTag, pullRequest.earliestBetaTag),
    );
    if (operationResult.isErr) {
      const pullRequestFailure = createPullRequestFailure(
        pullRequest.number,
        operationResult.error.message,
        githubToken,
      );
      failures.push(pullRequestFailure);
      await writeFailureSafely(dependencies.writeFailure, formatPullRequestFailure(pullRequestFailure));
      continue;
    }
    plannedCommentOperations.push({
      pullRequestNumber: pullRequest.number,
      kind: operationResult.value.kind,
    });
    if (operationResult.value.kind === 'unchanged') {
      commentsUnchanged += 1;
      continue;
    }
    if (executionMode === 'dry-run') {
      if (operationResult.value.kind === 'create') {
        commentsCreated += 1;
      } else {
        commentsUpdated += 1;
      }
      continue;
    }

    const writeResult = await writePullRequestComment(
      pullRequest.number,
      operationResult.value,
      dependencies.githubClient,
    );
    if (writeResult.isErr) {
      const pullRequestFailure = createPullRequestFailure(pullRequest.number, writeResult.error.message, githubToken);
      failures.push(pullRequestFailure);
      await writeFailureSafely(dependencies.writeFailure, formatPullRequestFailure(pullRequestFailure));
      continue;
    }
    if (operationResult.value.kind === 'create') {
      commentsCreated += 1;
    } else {
      commentsUpdated += 1;
    }
  }

  return {
    commentsCreated,
    commentsUpdated,
    commentsUnchanged,
    plannedCommentOperations,
    failures: failures.toSorted((leftFailure, rightFailure) => {
      return leftFailure.pullRequestNumber - rightFailure.pullRequestNumber;
    }),
  };
}

function createEmptySummaryOptions(parsedCommand: ParsedCommand): SummaryOptions {
  return {
    executionMode: parsedCommand.executionMode,
    stage: parsedCommand.stage,
    releaseTag: parsedCommand.releaseTag,
    releaseCommit: parsedCommand.releaseCommit,
    bootstrap: false,
    precedingProductionTag: 'unavailable',
    candidateRanges: [],
    commitsInspected: [],
    pullRequestsDiscovered: [],
    commitsWithoutPullRequests: [],
    commentsCreated: 0,
    commentsUpdated: 0,
    commentsUnchanged: 0,
    plannedCommentOperations: [],
    generalFailureMessages: [],
    pullRequestFailures: [],
  };
}

function addPlanToSummary(summaryOptions: SummaryOptions, releaseHistoryPlan: ReleaseHistoryPlan): SummaryOptions {
  return match(releaseHistoryPlan)
    .with({kind: 'bootstrap'}, () => {
      return {...summaryOptions, bootstrap: true, precedingProductionTag: 'not applicable'};
    })
    .with({kind: 'beta'}, betaPlan => {
      return {
        ...summaryOptions,
        precedingProductionTag: betaPlan.precedingProductionTag,
        candidateRanges: [{candidateTag: betaPlan.currentTag, commitRange: betaPlan.commitRange}],
      };
    })
    .with({kind: 'production'}, productionPlan => {
      return {
        ...summaryOptions,
        precedingProductionTag: productionPlan.precedingProductionTag,
        candidateRanges: productionPlan.candidateRanges,
      };
    })
    .exhaustive();
}

function formatStringList(values: readonly string[]): string {
  return values.length === 0 ? 'none' : values.join(', ');
}

function formatPullRequestList(pullRequests: readonly PullRequestAppearance[]): string {
  return pullRequests.length === 0
    ? 'none'
    : pullRequests
        .map(pullRequest => {
          return `#${pullRequest.number}`;
        })
        .join(', ');
}

function formatFailedPullRequests(pullRequestFailures: readonly PullRequestFailure[]): string {
  return pullRequestFailures.length === 0
    ? 'none'
    : pullRequestFailures
        .map(pullRequestFailure => {
          return `#${pullRequestFailure.pullRequestNumber}`;
        })
        .join(', ');
}

function formatCandidateRanges(candidateRanges: readonly DiscoveryRange[]): string {
  return candidateRanges.length === 0
    ? 'not applicable'
    : candidateRanges
        .map(candidateRange => {
          return `${candidateRange.candidateTag}: ${candidateRange.commitRange.startTag} -> ${candidateRange.commitRange.endTag}`;
        })
        .join('; ');
}

function formatFailureSection(summaryOptions: SummaryOptions): readonly string[] {
  const failureLines = [
    ...summaryOptions.generalFailureMessages.map(failureMessage => {
      return `- ${failureMessage}`;
    }),
    ...summaryOptions.pullRequestFailures.map(pullRequestFailure => {
      return `- ${formatPullRequestFailure(pullRequestFailure)}`;
    }),
  ];

  return ['', '### Failures', '', ...(failureLines.length === 0 ? ['None'] : failureLines)];
}

function createWriteSummary(summaryOptions: SummaryOptions): string {
  return [
    '### Release appearance',
    '',
    `- Stage: ${summaryOptions.stage}`,
    `- Release tag: \`${summaryOptions.releaseTag}\``,
    `- Bootstrap: ${summaryOptions.bootstrap ? 'yes' : 'no'}`,
    `- Preceding Production tag: ${summaryOptions.precedingProductionTag}`,
    `- Beta candidate ranges for Production: ${formatCandidateRanges(summaryOptions.candidateRanges)}`,
    `- Commits inspected: ${summaryOptions.commitsInspected.length} (${formatStringList(summaryOptions.commitsInspected)})`,
    `- Pull requests discovered: ${summaryOptions.pullRequestsDiscovered.length} (${formatPullRequestList(summaryOptions.pullRequestsDiscovered)})`,
    `- Comments created: ${summaryOptions.commentsCreated}`,
    `- Comments updated: ${summaryOptions.commentsUpdated}`,
    `- Comments unchanged: ${summaryOptions.commentsUnchanged}`,
    `- Failed pull requests: ${formatFailedPullRequests(summaryOptions.pullRequestFailures)}`,
    `- Commits without associated pull requests: ${formatStringList(summaryOptions.commitsWithoutPullRequests)}`,
    ...formatFailureSection(summaryOptions),
  ].join('\n');
}

function formatPlannedCommentOperations(
  plannedCommentOperations: readonly PlannedCommentOperation[],
): readonly string[] {
  if (plannedCommentOperations.length === 0) {
    return ['No pull request comment operations were planned.'];
  }

  return plannedCommentOperations.map(plannedCommentOperation => {
    const operationDescription = match(plannedCommentOperation.kind)
      .with('create', () => {
        return 'would create';
      })
      .with('update', () => {
        return 'would update';
      })
      .with('unchanged', () => {
        return 'unchanged';
      })
      .exhaustive();
    return `- #${plannedCommentOperation.pullRequestNumber}: ${operationDescription}`;
  });
}

function createDryRunSummary(summaryOptions: SummaryOptions): string {
  return [
    '### Release appearance',
    '',
    '- Mode: dry run',
    `- Stage: ${summaryOptions.stage}`,
    `- Release tag: \`${summaryOptions.releaseTag}\``,
    `- Release commit: \`${summaryOptions.releaseCommit}\``,
    `- Bootstrap: ${summaryOptions.bootstrap ? 'yes' : 'no'}`,
    `- Preceding Production tag: ${summaryOptions.precedingProductionTag}`,
    `- Beta candidate ranges for Production: ${formatCandidateRanges(summaryOptions.candidateRanges)}`,
    `- Commits inspected: ${summaryOptions.commitsInspected.length} (${formatStringList(summaryOptions.commitsInspected)})`,
    `- Pull requests discovered: ${summaryOptions.pullRequestsDiscovered.length} (${formatPullRequestList(summaryOptions.pullRequestsDiscovered)})`,
    `- Comments that would be created: ${summaryOptions.commentsCreated}`,
    `- Comments that would be updated: ${summaryOptions.commentsUpdated}`,
    `- Unchanged comments: ${summaryOptions.commentsUnchanged}`,
    `- Failed pull requests: ${formatFailedPullRequests(summaryOptions.pullRequestFailures)}`,
    `- Commits without associated pull requests: ${formatStringList(summaryOptions.commitsWithoutPullRequests)}`,
    '',
    '### Planned comment operations',
    '',
    ...formatPlannedCommentOperations(summaryOptions.plannedCommentOperations),
    '',
    'No GitHub comments were created or updated.',
    ...formatFailureSection(summaryOptions),
  ].join('\n');
}

function createDryRunLogOutput(summaryOptions: SummaryOptions): string {
  const releaseDetails = [
    'Release appearance dry run',
    `Stage: ${summaryOptions.stage}`,
    `Release tag: ${summaryOptions.releaseTag}`,
    `Release commit: ${summaryOptions.releaseCommit}`,
  ];

  if (summaryOptions.bootstrap) {
    return [
      ...releaseDetails,
      'Bootstrap: yes',
      'No preceding new-format Production release exists.',
      'No commit range was inspected.',
      'No pull request comment operations were planned.',
      'No GitHub comments were created or updated.',
    ].join('\n');
  }

  const failureReasons = [
    ...summaryOptions.generalFailureMessages,
    ...summaryOptions.pullRequestFailures.map(pullRequestFailure => {
      return formatPullRequestFailure(pullRequestFailure);
    }),
  ];

  return [
    ...releaseDetails,
    `Preceding Production tag: ${summaryOptions.precedingProductionTag}`,
    `Commits inspected: ${summaryOptions.commitsInspected.length}`,
    `Pull requests discovered: ${summaryOptions.pullRequestsDiscovered.length}`,
    `Would create: ${summaryOptions.commentsCreated}`,
    `Would update: ${summaryOptions.commentsUpdated}`,
    `Unchanged: ${summaryOptions.commentsUnchanged}`,
    `Failed pull requests: ${summaryOptions.pullRequestFailures.length}`,
    ...(failureReasons.length === 0
      ? []
      : [
          'Failures:',
          ...failureReasons.map(failureReason => {
            return `- ${failureReason}`;
          }),
        ]),
    'No GitHub comments were created or updated.',
  ].join('\n');
}

function createSummary(summaryOptions: SummaryOptions): string {
  return summaryOptions.executionMode === 'dry-run'
    ? createDryRunSummary(summaryOptions)
    : createWriteSummary(summaryOptions);
}

async function writeDryRunLogOutputSafely(
  dependencies: Pick<ReleaseAppearanceCommandDependencies, 'writeFailure' | 'writeInformation'>,
  summaryOptions: SummaryOptions,
  githubToken: string,
): Promise<Maybe<string>> {
  if (summaryOptions.executionMode !== 'dry-run') {
    return Maybe.nothing<string>();
  }

  try {
    await dependencies.writeInformation(createDryRunLogOutput(summaryOptions));
    return Maybe.nothing<string>();
  } catch (error: unknown) {
    const failureMessage = `Unable to write dry-run log output: ${redactSecret(errorMessage(error), githubToken)}`;
    await writeFailureSafely(dependencies.writeFailure, failureMessage);
    return Maybe.just(failureMessage);
  }
}

async function finalizeSummary(
  finalizeSummaryOptions: FinalizeSummaryOptions,
): Promise<ReleaseAppearanceCommandResult> {
  const {dependencies, summaryOptions, githubToken, exitCode} = finalizeSummaryOptions;
  const summary = createSummary(summaryOptions);
  const summaryWriteFailure = await writeSummarySafely(dependencies, summary, githubToken);
  const dryRunLogOutputWriteFailure = await writeDryRunLogOutputSafely(dependencies, summaryOptions, githubToken);
  if (summaryWriteFailure.isJust) {
    return {
      exitCode: 1,
      summary: createSummary({
        ...summaryOptions,
        generalFailureMessages: [
          ...summaryOptions.generalFailureMessages,
          createGeneralFailureMessage('Summary', summaryWriteFailure.value, githubToken),
        ],
      }),
    };
  }

  return {exitCode: dryRunLogOutputWriteFailure.isJust ? 1 : exitCode, summary};
}

async function planReleaseHistory(
  parsedCommand: ParsedCommand,
  executeGitCommand: ExecuteGitCommand,
): Promise<Result<ReleaseHistoryPlan, Error>> {
  return match(parsedCommand)
    .with({stage: 'beta'}, betaCommand => {
      return planBetaReleaseHistory({
        executeGitCommand,
        currentBetaTag: betaCommand.releaseTag,
        releaseCommit: betaCommand.releaseCommit,
      });
    })
    .with({stage: 'production'}, productionCommand => {
      return planProductionReleaseHistory({
        executeGitCommand,
        currentProductionTag: productionCommand.releaseTag,
        promotedBetaTag: productionCommand.promotedBetaTag,
        releaseCommit: productionCommand.releaseCommit,
      });
    })
    .exhaustive();
}

export async function executeReleaseAppearanceCommand(
  executeReleaseAppearanceCommandOptions: ExecuteReleaseAppearanceCommandOptions,
): Promise<ReleaseAppearanceCommandResult> {
  const {commandLineArguments, environment, dependencies} = executeReleaseAppearanceCommandOptions;
  const githubToken = Maybe.of(environment.GITHUB_TOKEN).unwrapOr('');
  const parsedCommandResult = parseCommandLineArguments(commandLineArguments);
  if (parsedCommandResult.isErr) {
    await writeFailureSafely(dependencies.writeFailure, parsedCommandResult.error.message);
    return {exitCode: 1, summary: ''};
  }

  const commandEnvironmentResult = readCommandEnvironment(environment);
  if (commandEnvironmentResult.isErr) {
    await writeFailureSafely(
      dependencies.writeFailure,
      redactSecret(commandEnvironmentResult.error.message, githubToken),
    );
    return {exitCode: 1, summary: ''};
  }

  const parsedCommand = parsedCommandResult.value;
  let historyPlanResult: Result<ReleaseHistoryPlan, Error>;
  try {
    historyPlanResult = await planReleaseHistory(parsedCommand, dependencies.executeGitCommand);
  } catch (error: unknown) {
    historyPlanResult = createFailure(
      `Unable to plan release history: ${redactSecret(errorMessage(error), githubToken)}`,
      error,
    );
  }

  let summaryOptions = createEmptySummaryOptions(parsedCommand);
  if (historyPlanResult.isErr) {
    const historyFailureMessage = createGeneralFailureMessage(
      'Release history',
      historyPlanResult.error.message,
      githubToken,
    );
    summaryOptions = {
      ...summaryOptions,
      generalFailureMessages: [historyFailureMessage],
    };
    await writeFailureSafely(dependencies.writeFailure, historyFailureMessage);
  } else {
    summaryOptions = addPlanToSummary(summaryOptions, historyPlanResult.value);
    if (historyPlanResult.value.kind === 'bootstrap') {
      return finalizeSummary({
        dependencies,
        summaryOptions,
        githubToken,
        exitCode: 0,
      });
    }

    const discoveryRanges = match(historyPlanResult.value)
      .with({kind: 'beta'}, betaPlan => {
        return [{candidateTag: betaPlan.currentTag, commitRange: betaPlan.commitRange}];
      })
      .with({kind: 'production'}, productionPlan => {
        return productionPlan.candidateRanges;
      })
      .exhaustive();
    const discoveryResult = await discoverPullRequests(discoveryRanges, dependencies.githubClient, githubToken);
    const discoveryFailureMessages = discoveryResult.failureMessages.map(failureMessage => {
      return createGeneralFailureMessage('Discovery', failureMessage, githubToken);
    });
    for (const discoveryFailureMessage of discoveryFailureMessages) {
      await writeFailureSafely(dependencies.writeFailure, discoveryFailureMessage);
    }

    const processingResult = await processPullRequests(
      discoveryResult.pullRequests,
      parsedCommand.stage,
      parsedCommand.releaseTag,
      parsedCommand.executionMode,
      dependencies,
      githubToken,
    );
    summaryOptions = {
      ...summaryOptions,
      commitsInspected: discoveryResult.commitsInspected,
      pullRequestsDiscovered: discoveryResult.pullRequests,
      commitsWithoutPullRequests: discoveryResult.commitsWithoutPullRequests,
      commentsCreated: processingResult.commentsCreated,
      commentsUpdated: processingResult.commentsUpdated,
      commentsUnchanged: processingResult.commentsUnchanged,
      plannedCommentOperations: processingResult.plannedCommentOperations,
      generalFailureMessages: discoveryFailureMessages,
      pullRequestFailures: processingResult.failures,
    };
    const hasFailures = discoveryFailureMessages.length > 0 || processingResult.failures.length > 0;
    return finalizeSummary({
      dependencies,
      summaryOptions,
      githubToken,
      exitCode: hasFailures ? 1 : 0,
    });
  }

  return finalizeSummary({
    dependencies,
    summaryOptions,
    githubToken,
    exitCode: 1,
  });
}

export async function main(
  executeReleaseAppearanceCommandOptions: ExecuteReleaseAppearanceCommandOptions,
): Promise<void> {
  const githubToken = Maybe.of(executeReleaseAppearanceCommandOptions.environment.GITHUB_TOKEN).unwrapOr('');
  try {
    const commandResult = await executeReleaseAppearanceCommand(executeReleaseAppearanceCommandOptions);
    process.exitCode = commandResult.exitCode;
  } catch (error: unknown) {
    await writeFailureSafely(
      executeReleaseAppearanceCommandOptions.dependencies.writeFailure,
      redactSecret(errorMessage(error), githubToken),
    );
    process.exitCode = 1;
  }
}

async function executeGitCommand(commandArguments: readonly string[]): Promise<string> {
  const executeFile = promisify(execFile);
  const commandResult = await executeFile('git', commandArguments, {encoding: 'utf8'});
  return commandResult.stdout.toString();
}

async function writeRuntimeFailure(message: string): Promise<void> {
  process.stderr.write(`${message}\n`);
}

async function writeRuntimeInformation(message: string): Promise<void> {
  process.stdout.write(`${message}\n`);
}

function createRuntimeDependencies(commandEnvironment: CommandEnvironment): ReleaseAppearanceCommandDependencies {
  const httpClient = createRuntimeKyHttpClient();
  const githubClient = createGitHubClient({
    httpClient,
    githubApiUrl: commandEnvironment.githubApiUrl,
    githubRepository: commandEnvironment.githubRepository,
    githubToken: commandEnvironment.githubToken,
  });

  return {
    executeGitCommand,
    githubClient,
    writeFailure: writeRuntimeFailure,
    writeInformation: writeRuntimeInformation,
    async writeSummary(summary): Promise<void> {
      await appendFile(commandEnvironment.githubStepSummary, `${summary}\n`, 'utf8');
    },
  };
}

async function startReleaseAppearanceCommand(): Promise<void> {
  const commandLineArguments = process.argv.slice(processArgumentStartIndex);
  const parsedCommandResult = parseCommandLineArguments(commandLineArguments);
  if (parsedCommandResult.isErr) {
    await writeRuntimeFailure(parsedCommandResult.error.message);
    process.exitCode = 1;
    return;
  }

  const commandEnvironmentResult = readCommandEnvironment(process.env);
  if (commandEnvironmentResult.isErr) {
    await writeRuntimeFailure(commandEnvironmentResult.error.message);
    process.exitCode = 1;
    return;
  }

  await main({
    commandLineArguments,
    environment: process.env,
    dependencies: createRuntimeDependencies(commandEnvironmentResult.value),
  });
}

function isReleaseAppearanceCommandEntrypoint(): boolean {
  return Maybe.of(process.argv[1])
    .map(entrypointPath => {
      return /(?:^|[\\/])releaseAppearanceCommand\.ts$/.test(entrypointPath);
    })
    .unwrapOr(false);
}

if (isReleaseAppearanceCommandEntrypoint()) {
  void startReleaseAppearanceCommand();
}
