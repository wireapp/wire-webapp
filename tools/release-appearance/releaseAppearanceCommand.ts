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

import is from '@sindresorhus/is';
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

export type ParsedCommand =
  | {
      readonly stage: 'beta';
      readonly releaseTag: string;
      readonly releaseCommit: string;
    }
  | {
      readonly stage: 'production';
      readonly releaseTag: string;
      readonly releaseCommit: string;
      readonly promotedBetaTag: string;
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
  readonly writeSummary: (summary: string) => Promise<void>;
  readonly writeOutput: (message: string) => Promise<void>;
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
  readonly errors: readonly string[];
};

type ProcessingResult = {
  readonly commentsCreated: number;
  readonly commentsUpdated: number;
  readonly commentsUnchanged: number;
  readonly failedPullRequests: readonly number[];
};

type SummaryOptions = {
  readonly stage: ReleaseAppearanceCommandStage;
  readonly releaseTag: string;
  readonly bootstrap: boolean;
  readonly precedingProductionTag: string;
  readonly candidateRanges: readonly DiscoveryRange[];
  readonly commitsInspected: readonly string[];
  readonly pullRequestsDiscovered: readonly PullRequestAppearance[];
  readonly commitsWithoutPullRequests: readonly string[];
  readonly commentsCreated: number;
  readonly commentsUpdated: number;
  readonly commentsUnchanged: number;
  readonly failedPullRequests: readonly number[];
};

const betaCommandArgumentCount = 3;
const productionCommandArgumentCount = 4;
const processArgumentStartIndex = 2;
const stageArgumentIndex = 0;
const releaseTagArgumentIndex = 1;
const releaseCommitArgumentIndex = 2;
const promotedBetaTagArgumentIndex = 3;
const fullGitCommitPattern = /^[0-9a-f]{40}$/i;

function createSuccess<valueType>(value: valueType): Result<valueType, Error> {
  return Result.ok<valueType, Error>(value);
}

function createFailure<valueType>(message: string, cause?: unknown): Result<valueType, Error> {
  return Result.err<valueType, Error>(new Error(message, {cause}));
}

function errorMessage(error: unknown): string {
  return is.error(error) ? error.message : 'Unknown failure';
}

function redactSecret(message: string, secret: string): string {
  return secret.length === 0 ? message : message.replaceAll(secret, '[REDACTED]');
}

function usageFailure(): Result<ParsedCommand, Error> {
  return createFailure(
    'Usage: beta <beta-tag> <release-commit-sha> or production <production-tag> <release-commit-sha> <promoted-beta-tag>',
  );
}

function readRequiredArgument(
  commandLineArguments: readonly string[],
  argumentIndex: number,
  argumentName: string,
): Result<string, Error> {
  const argument = Maybe.of(commandLineArguments[argumentIndex]);
  if (argument.isNothing || !is.nonEmptyStringAndNotWhitespace(argument.value)) {
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

function parseBetaCommand(commandLineArguments: readonly string[]): Result<ParsedCommand, Error> {
  const betaTagResult = readRequiredArgument(commandLineArguments, releaseTagArgumentIndex, 'Beta tag');
  if (betaTagResult.isErr) {
    return createFailure(betaTagResult.error.message);
  }

  return readReleaseCommit(commandLineArguments).map(releaseCommit => {
    return {stage: 'beta', releaseTag: betaTagResult.value, releaseCommit};
  });
}

function parseProductionCommand(commandLineArguments: readonly string[]): Result<ParsedCommand, Error> {
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
      return commandLineArguments.length === betaCommandArgumentCount
        ? parseBetaCommand(commandLineArguments)
        : usageFailure();
    })
    .with('production', () => {
      return commandLineArguments.length === productionCommandArgumentCount
        ? parseProductionCommand(commandLineArguments)
        : usageFailure();
    })
    .otherwise(() => {
      return usageFailure();
    });
}

function readRequiredEnvironmentValue(environment: NodeJS.ProcessEnv, variableName: string): Result<string, Error> {
  const environmentValue = environment[variableName];
  return is.nonEmptyStringAndNotWhitespace(environmentValue)
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

async function writeFailure(writeOutput: (message: string) => Promise<void>, message: string): Promise<void> {
  try {
    await writeOutput(message);
  } catch {
    // Reporting must not stop processing the remaining pull requests.
  }
}

async function writeSummarySafely(
  dependencies: Pick<ReleaseAppearanceCommandDependencies, 'writeSummary' | 'writeOutput'>,
  summary: string,
  githubToken: string,
): Promise<boolean> {
  try {
    await dependencies.writeSummary(summary);
    return true;
  } catch (error: unknown) {
    await writeFailure(
      dependencies.writeOutput,
      `Unable to write GitHub Actions summary: ${redactSecret(errorMessage(error), githubToken)}`,
    );
    return false;
  }
}

async function discoverPullRequests(
  ranges: readonly DiscoveryRange[],
  githubClient: GitHubClient,
): Promise<DiscoveryResult> {
  const pullRequestsByNumber = new Map<number, PullRequestAppearance>();
  const commitsInspected = new Set<string>();
  const commitsWithoutPullRequests = new Set<string>();
  const errors: string[] = [];

  for (const range of ranges) {
    for (const commitSha of range.commitRange.commits) {
      commitsInspected.add(commitSha);
      const pullRequestsResult = await githubClient.listPullRequestsForCommit({commitSha});
      if (pullRequestsResult.isErr) {
        errors.push(pullRequestsResult.error.message);
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
    errors,
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
  dependencies: Pick<ReleaseAppearanceCommandDependencies, 'githubClient' | 'writeOutput'>,
): Promise<ProcessingResult> {
  let commentsCreated = 0;
  let commentsUpdated = 0;
  let commentsUnchanged = 0;
  const failedPullRequests = new Set<number>();

  for (const pullRequest of pullRequests) {
    const commentsResult = await dependencies.githubClient.listIssueComments({
      pullRequestNumber: pullRequest.number,
    });
    if (commentsResult.isErr) {
      failedPullRequests.add(pullRequest.number);
      await writeFailure(dependencies.writeOutput, commentsResult.error.message);
      continue;
    }

    const operationResult = prepareCommentOperation(
      commentsResult.value,
      createDesiredReleaseState(stage, releaseTag, pullRequest.earliestBetaTag),
    );
    if (operationResult.isErr) {
      failedPullRequests.add(pullRequest.number);
      await writeFailure(
        dependencies.writeOutput,
        `Pull request #${pullRequest.number}: ${operationResult.error.message}`,
      );
      continue;
    }
    if (operationResult.value.kind === 'unchanged') {
      commentsUnchanged += 1;
      continue;
    }

    const writeResult = await writePullRequestComment(
      pullRequest.number,
      operationResult.value,
      dependencies.githubClient,
    );
    if (writeResult.isErr) {
      failedPullRequests.add(pullRequest.number);
      await writeFailure(dependencies.writeOutput, writeResult.error.message);
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
    failedPullRequests: [...failedPullRequests].toSorted((leftNumber, rightNumber) => {
      return leftNumber - rightNumber;
    }),
  };
}

function createEmptySummaryOptions(parsedCommand: ParsedCommand): SummaryOptions {
  return {
    stage: parsedCommand.stage,
    releaseTag: parsedCommand.releaseTag,
    bootstrap: false,
    precedingProductionTag: 'unavailable',
    candidateRanges: [],
    commitsInspected: [],
    pullRequestsDiscovered: [],
    commitsWithoutPullRequests: [],
    commentsCreated: 0,
    commentsUpdated: 0,
    commentsUnchanged: 0,
    failedPullRequests: [],
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

function formatFailedPullRequests(pullRequestNumbers: readonly number[]): string {
  return pullRequestNumbers.length === 0
    ? 'none'
    : pullRequestNumbers
        .map(pullRequestNumber => {
          return `#${pullRequestNumber}`;
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

function createSummary(summaryOptions: SummaryOptions): string {
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
    `- Failed pull requests: ${formatFailedPullRequests(summaryOptions.failedPullRequests)}`,
    `- Commits without associated pull requests: ${formatStringList(summaryOptions.commitsWithoutPullRequests)}`,
  ].join('\n');
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
    await writeFailure(dependencies.writeOutput, parsedCommandResult.error.message);
    return {exitCode: 1, summary: ''};
  }

  const commandEnvironmentResult = readCommandEnvironment(environment);
  if (commandEnvironmentResult.isErr) {
    await writeFailure(dependencies.writeOutput, redactSecret(commandEnvironmentResult.error.message, githubToken));
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
    await writeFailure(dependencies.writeOutput, redactSecret(historyPlanResult.error.message, githubToken));
  } else {
    summaryOptions = addPlanToSummary(summaryOptions, historyPlanResult.value);
    if (historyPlanResult.value.kind === 'bootstrap') {
      const summary = createSummary(summaryOptions);
      const summaryWasWritten = await writeSummarySafely(dependencies, summary, githubToken);
      return {exitCode: summaryWasWritten ? 0 : 1, summary};
    }

    const discoveryRanges = match(historyPlanResult.value)
      .with({kind: 'beta'}, betaPlan => {
        return [{candidateTag: betaPlan.currentTag, commitRange: betaPlan.commitRange}];
      })
      .with({kind: 'production'}, productionPlan => {
        return productionPlan.candidateRanges;
      })
      .exhaustive();
    const discoveryResult = await discoverPullRequests(discoveryRanges, dependencies.githubClient);
    for (const discoveryError of discoveryResult.errors) {
      await writeFailure(dependencies.writeOutput, discoveryError);
    }

    const processingResult = await processPullRequests(
      discoveryResult.pullRequests,
      parsedCommand.stage,
      parsedCommand.releaseTag,
      dependencies,
    );
    summaryOptions = {
      ...summaryOptions,
      commitsInspected: discoveryResult.commitsInspected,
      pullRequestsDiscovered: discoveryResult.pullRequests,
      commitsWithoutPullRequests: discoveryResult.commitsWithoutPullRequests,
      ...processingResult,
    };
    const summary = createSummary(summaryOptions);
    const summaryWasWritten = await writeSummarySafely(dependencies, summary, githubToken);
    const hasFailures = discoveryResult.errors.length > 0 || processingResult.failedPullRequests.length > 0;
    return {exitCode: summaryWasWritten && !hasFailures ? 0 : 1, summary};
  }

  const summary = createSummary(summaryOptions);
  await writeSummarySafely(dependencies, summary, githubToken);
  return {exitCode: 1, summary};
}

export async function main(
  executeReleaseAppearanceCommandOptions: ExecuteReleaseAppearanceCommandOptions,
): Promise<void> {
  const githubToken = Maybe.of(executeReleaseAppearanceCommandOptions.environment.GITHUB_TOKEN).unwrapOr('');
  try {
    const commandResult = await executeReleaseAppearanceCommand(executeReleaseAppearanceCommandOptions);
    process.exitCode = commandResult.exitCode;
  } catch (error: unknown) {
    await writeFailure(
      executeReleaseAppearanceCommandOptions.dependencies.writeOutput,
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

async function writeRuntimeOutput(message: string): Promise<void> {
  process.stderr.write(`${message}\n`);
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
    async writeSummary(summary): Promise<void> {
      await appendFile(commandEnvironment.githubStepSummary, `${summary}\n`, 'utf8');
    },
    writeOutput: writeRuntimeOutput,
  };
}

async function startReleaseAppearanceCommand(): Promise<void> {
  const commandLineArguments = process.argv.slice(processArgumentStartIndex);
  const parsedCommandResult = parseCommandLineArguments(commandLineArguments);
  if (parsedCommandResult.isErr) {
    await writeRuntimeOutput(parsedCommandResult.error.message);
    process.exitCode = 1;
    return;
  }

  const commandEnvironmentResult = readCommandEnvironment(process.env);
  if (commandEnvironmentResult.isErr) {
    await writeRuntimeOutput(commandEnvironmentResult.error.message);
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
