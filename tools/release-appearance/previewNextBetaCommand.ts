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
import {Maybe, Result} from 'true-myth';
import type {Task} from 'true-myth';

import {execFile} from 'node:child_process';
import {appendFile} from 'node:fs/promises';
import {promisify} from 'node:util';

import {createGitHubClient} from './githubClient.ts';
import type {GitHubClient, PullRequestRecord} from './githubClient.ts';
import {createRuntimeKyHttpClient} from './httpClient.ts';
import {readCommandEnvironment} from './releaseAppearanceCommand.ts';
import type {CommandEnvironment} from './releaseAppearanceCommand.ts';
import {planNextBetaPreviewHistory} from './releaseHistory.ts';
import type {
  BetaReleaseTagReference,
  ExecuteGitCommand,
  NextBetaPreviewHistoryPlan,
  PlanNextBetaPreviewHistoryOptions,
} from './releaseHistory.ts';

export type PreviewNextBetaCommandDependencies = {
  readonly executeGitCommand: ExecuteGitCommand;
  readonly githubClient: GitHubClient;
  readonly planNextBetaPreviewHistory: (
    options: PlanNextBetaPreviewHistoryOptions,
  ) => Task<NextBetaPreviewHistoryPlan, Error>;
  readonly writeFailure: (message: string) => Promise<void>;
  readonly writeInformation: (message: string) => Promise<void>;
  readonly writeSummary: (summary: string) => Promise<void>;
};

export type ExecutePreviewNextBetaCommandOptions = {
  readonly commandLineArguments: readonly string[];
  readonly environment: NodeJS.ProcessEnv;
  readonly dependencies: PreviewNextBetaCommandDependencies;
};

export type PreviewNextBetaCommandResult = {
  readonly exitCode: number;
  readonly summary: string;
};

type PreviewNextBetaState = {
  readonly latestBetaReleaseTag: Maybe<BetaReleaseTagReference>;
  readonly targetMainCommit: string;
  readonly mergeBase: Maybe<string>;
  readonly commitsInspected: readonly string[];
  readonly pullRequestNumbers: readonly number[];
  readonly commitsWithoutMergedMainPullRequest: readonly string[];
  readonly failureMessages: readonly string[];
};

type DiscoverPullRequestsOptions = {
  readonly commits: readonly string[];
  readonly githubClient: GitHubClient;
  readonly githubToken: string;
};

type DiscoverPullRequestsResult = {
  readonly pullRequestNumbers: readonly number[];
  readonly commitsWithoutMergedMainPullRequest: readonly string[];
  readonly failureMessages: readonly string[];
};

type CreatePreviewStateOptions = {
  readonly targetMainCommit: string;
  readonly executeGitCommand: ExecuteGitCommand;
  readonly planNextBetaPreviewHistory: (
    options: PlanNextBetaPreviewHistoryOptions,
  ) => Task<NextBetaPreviewHistoryPlan, Error>;
  readonly githubClient: GitHubClient;
  readonly githubToken: string;
};

type CreateReportOptions = {
  readonly state: PreviewNextBetaState;
  readonly githubRepository: string;
  readonly markdown: boolean;
};

type WriteInformationSafelyOptions = {
  readonly writeFailure: (message: string) => Promise<void>;
  readonly writeInformation: (message: string) => Promise<void>;
  readonly information: string;
  readonly githubToken: string;
};

type WriteSummarySafelyOptions = {
  readonly writeFailure: (message: string) => Promise<void>;
  readonly writeSummary: (summary: string) => Promise<void>;
  readonly summary: string;
  readonly githubToken: string;
};

const processArgumentStartIndex = 2;
const fullGitCommitPattern = /^[0-9a-f]{40}$/i;
const executeFile = promisify(execFile);
const advisoryMessage =
  'This is an advisory preview. These changes are on main but have not been deployed or verified in Beta.';

function redactSecret(message: string, secret: string): string {
  if (is.emptyString(secret)) {
    return message;
  }

  return message.replaceAll(secret, '[REDACTED]');
}

async function writeFailureSafely(writeFailure: (message: string) => Promise<void>, message: string): Promise<void> {
  try {
    await writeFailure(message);
  } catch {
    // Failure reporting must not turn an operational failure into an unhandled rejection.
  }
}

async function writeInformationSafely(
  writeInformationSafelyOptions: WriteInformationSafelyOptions,
): Promise<Maybe<string>> {
  const {writeFailure, writeInformation, information, githubToken} = writeInformationSafelyOptions;
  try {
    await writeInformation(information);

    return Maybe.nothing<string>();
  } catch (error: unknown) {
    const failureMessage = `Unable to write informational output: ${redactSecret(
      is.error(error) ? error.message : 'Unknown failure',
      githubToken,
    )}`;
    await writeFailureSafely(writeFailure, failureMessage);

    return Maybe.just(failureMessage);
  }
}

async function writeSummarySafely(writeSummarySafelyOptions: WriteSummarySafelyOptions): Promise<Maybe<string>> {
  const {writeFailure, writeSummary, summary, githubToken} = writeSummarySafelyOptions;
  try {
    await writeSummary(summary);

    return Maybe.nothing<string>();
  } catch (error: unknown) {
    const failureMessage = `Unable to write GitHub Actions summary: ${redactSecret(
      is.error(error) ? error.message : 'Unknown failure',
      githubToken,
    )}`;
    await writeFailureSafely(writeFailure, failureMessage);

    return Maybe.just(failureMessage);
  }
}

export function parseCommandLineArguments(commandLineArguments: readonly string[]): Result<string, Error> {
  if (commandLineArguments.length !== 1) {
    return Result.err(
      new Error('Usage: node tools/release-appearance/previewNextBetaCommand.ts <target-main-commit-sha>'),
    );
  }

  const targetMainCommit = Maybe.of(commandLineArguments[0]);
  if (targetMainCommit.isNothing || !fullGitCommitPattern.test(targetMainCommit.value)) {
    return Result.err(new Error('Target main commit SHA must contain exactly 40 hexadecimal characters'));
  }

  return Result.ok(targetMainCommit.value);
}

async function discoverPullRequests(
  discoverPullRequestsOptions: DiscoverPullRequestsOptions,
): Promise<DiscoverPullRequestsResult> {
  const {commits, githubClient, githubToken} = discoverPullRequestsOptions;
  const pullRequestNumbersByNumber = new Set<number>();
  const commitsWithoutMergedMainPullRequest: string[] = [];
  const failureMessages: string[] = [];

  for (const commitSha of commits) {
    let pullRequestsResult: Result<readonly PullRequestRecord[], Error>;
    try {
      pullRequestsResult = await githubClient.listPullRequestsForCommit({commitSha});
    } catch (error: unknown) {
      failureMessages.push(
        redactSecret(is.error(error) ? error.message : 'Unknown GitHub pull request discovery failure', githubToken),
      );

      continue;
    }

    if (pullRequestsResult.isErr) {
      failureMessages.push(redactSecret(pullRequestsResult.error.message, githubToken));
      continue;
    }

    const mergedMainPullRequests = pullRequestsResult.value.filter(pullRequest => {
      return pullRequest.baseBranch === 'main' && pullRequest.mergedAt.isJust;
    });
    if (is.emptyArray(mergedMainPullRequests)) {
      commitsWithoutMergedMainPullRequest.push(commitSha);
      continue;
    }

    for (const pullRequest of mergedMainPullRequests) {
      pullRequestNumbersByNumber.add(pullRequest.number);
    }
  }

  return {
    pullRequestNumbers: [...pullRequestNumbersByNumber].toSorted((leftNumber, rightNumber) => {
      return leftNumber - rightNumber;
    }),
    commitsWithoutMergedMainPullRequest,
    failureMessages,
  };
}

function createUnavailableState(
  targetMainCommit: string,
  failureMessages: readonly string[] = [],
): PreviewNextBetaState {
  return {
    latestBetaReleaseTag: Maybe.nothing<BetaReleaseTagReference>(),
    targetMainCommit,
    mergeBase: Maybe.nothing<string>(),
    commitsInspected: [],
    pullRequestNumbers: [],
    commitsWithoutMergedMainPullRequest: [],
    failureMessages,
  };
}

async function createPreviewState(createPreviewStateOptions: CreatePreviewStateOptions): Promise<PreviewNextBetaState> {
  const {targetMainCommit, executeGitCommand, planNextBetaPreviewHistory, githubClient, githubToken} =
    createPreviewStateOptions;
  const historyPlanResult = await planNextBetaPreviewHistory({executeGitCommand, targetMainCommit});
  if (historyPlanResult.isErr) {
    return createUnavailableState(targetMainCommit, [
      redactSecret(`Git history: ${historyPlanResult.error.message}`, githubToken),
    ]);
  }

  if (historyPlanResult.value.kind === 'unavailable') {
    return createUnavailableState(historyPlanResult.value.targetMainCommit);
  }

  const {
    latestBetaReleaseTag,
    targetMainCommit: resolvedTargetMainCommit,
    mergeBase,
    commits,
  } = historyPlanResult.value;

  const discoveryResult = await discoverPullRequests({
    commits,
    githubClient,
    githubToken,
  });

  return {
    latestBetaReleaseTag: Maybe.just(latestBetaReleaseTag),
    targetMainCommit: resolvedTargetMainCommit,
    mergeBase: Maybe.just(mergeBase),
    commitsInspected: commits,
    pullRequestNumbers: discoveryResult.pullRequestNumbers,
    commitsWithoutMergedMainPullRequest: discoveryResult.commitsWithoutMergedMainPullRequest,
    failureMessages: discoveryResult.failureMessages,
  };
}

function formatCommitLines(state: PreviewNextBetaState): readonly string[] {
  if (state.mergeBase.isNothing) {
    return ['Not inspected.'];
  }

  return is.emptyArray(state.commitsWithoutMergedMainPullRequest)
    ? ['None']
    : state.commitsWithoutMergedMainPullRequest.map(commitSha => {
        return `- \`${commitSha}\``;
      });
}

function formatPullRequestLines(state: PreviewNextBetaState, githubRepository: string): readonly string[] {
  if (state.mergeBase.isNothing) {
    return ['Not inspected.'];
  }

  return is.emptyArray(state.pullRequestNumbers)
    ? ['No merged pull requests are currently waiting for the next Beta.']
    : state.pullRequestNumbers.map(pullRequestNumber => {
        return `- [#${pullRequestNumber}](https://github.com/${githubRepository}/pull/${pullRequestNumber})`;
      });
}

function formatDetailValue(value: string, markdown: boolean): string {
  return markdown ? `\`${value}\`` : value;
}

function createDetailLines(state: PreviewNextBetaState, markdown: boolean): readonly string[] {
  const linePrefix = markdown ? '- ' : '';
  const latestBetaValues = state.latestBetaReleaseTag
    .map(value => {
      return [formatDetailValue(value.tagName, markdown), formatDetailValue(value.commit, markdown)];
    })
    .unwrapOr(['unavailable', 'unavailable']);
  const targetMainCommitValue = formatDetailValue(state.targetMainCommit, markdown);
  const mergeBaseValue = state.mergeBase
    .map(value => {
      return formatDetailValue(value, markdown);
    })
    .unwrapOr('unavailable');
  const inspectionValues = state.mergeBase.isJust
    ? {
        commitsInspected: state.commitsInspected.length.toString(),
        pullRequests: state.pullRequestNumbers.length.toString(),
        commitsWithoutPullRequests: state.commitsWithoutMergedMainPullRequest.length.toString(),
      }
    : {
        commitsInspected: 'not inspected',
        pullRequests: 'not inspected',
        commitsWithoutPullRequests: 'not inspected',
      };

  return [
    `${linePrefix}Latest Beta tag: ${latestBetaValues[0]}`,
    `${linePrefix}Latest Beta commit: ${latestBetaValues[1]}`,
    `${linePrefix}Current main commit: ${targetMainCommitValue}`,
    `${linePrefix}Merge base: ${mergeBaseValue}`,
    `${linePrefix}Commits not present in Beta: ${inspectionValues.commitsInspected}`,
    `${linePrefix}Merged pull requests waiting for Beta: ${inspectionValues.pullRequests}`,
    `${linePrefix}Commits without a merged main pull request: ${inspectionValues.commitsWithoutPullRequests}`,
  ];
}

function createReport(createReportOptions: CreateReportOptions): string {
  const {state, githubRepository, markdown} = createReportOptions;
  let unavailableMessage = '';
  if (state.latestBetaReleaseTag.isNothing) {
    unavailableMessage = 'The preview is unavailable because the latest Beta history could not be evaluated.';
    if (is.emptyArray(state.failureMessages)) {
      unavailableMessage = 'The preview is unavailable because no new-format Beta tag exists yet.';
    }
  }
  const failureLines = state.failureMessages.map(failureMessage => {
    return `- ${failureMessage}`;
  });
  const markdownFailureLines = is.emptyArray(failureLines) ? ['None'] : failureLines;
  const markdownLines = [
    '### Preview next Beta changes',
    '',
    ...createDetailLines(state, true),
    ...(is.emptyString(unavailableMessage) ? [] : ['', unavailableMessage]),
    '',
    '### Pull requests waiting for Beta',
    '',
    ...formatPullRequestLines(state, githubRepository),
    '',
    '### Commits without a merged main pull request',
    '',
    ...formatCommitLines(state),
    '',
    '### Failures',
    '',
    ...markdownFailureLines,
    '',
    advisoryMessage,
  ];
  if (markdown) {
    return markdownLines.join('\n');
  }

  return [
    'Preview next Beta changes',
    ...createDetailLines(state, false),
    ...(is.emptyString(unavailableMessage) ? [] : ['', unavailableMessage]),
    ...(state.mergeBase.isJust && is.emptyArray(state.pullRequestNumbers)
      ? ['No merged pull requests are currently waiting for the next Beta.']
      : []),
    ...(is.emptyArray(failureLines) ? [] : ['Failures:', ...failureLines]),
    advisoryMessage,
  ].join('\n');
}

export async function executePreviewNextBetaCommand(
  executePreviewNextBetaCommandOptions: ExecutePreviewNextBetaCommandOptions,
): Promise<PreviewNextBetaCommandResult> {
  const {commandLineArguments, environment, dependencies} = executePreviewNextBetaCommandOptions;
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

  const targetMainCommit = parsedCommandResult.value;
  let previewState: PreviewNextBetaState;
  try {
    previewState = await createPreviewState({
      targetMainCommit,
      executeGitCommand: dependencies.executeGitCommand,
      planNextBetaPreviewHistory: dependencies.planNextBetaPreviewHistory,
      githubClient: dependencies.githubClient,
      githubToken: commandEnvironmentResult.value.githubToken,
    });
  } catch (error: unknown) {
    previewState = createUnavailableState(targetMainCommit, [
      redactSecret(
        `Preview failed: ${is.error(error) ? error.message : 'Unknown failure'}`,
        commandEnvironmentResult.value.githubToken,
      ),
    ]);
  }

  let summary = createReport({
    state: previewState,
    githubRepository: commandEnvironmentResult.value.githubRepository,
    markdown: true,
  });
  let exitCode = is.emptyArray(previewState.failureMessages) ? 0 : 1;
  const summaryFailureResult = await writeSummarySafely({
    writeFailure: dependencies.writeFailure,
    writeSummary: dependencies.writeSummary,
    summary,
    githubToken: commandEnvironmentResult.value.githubToken,
  });
  if (summaryFailureResult.isJust) {
    previewState = {
      ...previewState,
      failureMessages: [...previewState.failureMessages, summaryFailureResult.value],
    };
    summary = createReport({
      state: previewState,
      githubRepository: commandEnvironmentResult.value.githubRepository,
      markdown: true,
    });
    exitCode = 1;
  }

  const informationFailureResult = await writeInformationSafely({
    writeFailure: dependencies.writeFailure,
    writeInformation: dependencies.writeInformation,
    information: createReport({
      state: previewState,
      githubRepository: commandEnvironmentResult.value.githubRepository,
      markdown: false,
    }),
    githubToken: commandEnvironmentResult.value.githubToken,
  });
  if (informationFailureResult.isJust) {
    exitCode = 1;
  }

  return {exitCode, summary};
}

async function executeRuntimeGitCommand(commandArguments: readonly string[]): Promise<string> {
  const commandResult = await executeFile('git', commandArguments, {encoding: 'utf8'});

  return commandResult.stdout.toString();
}

async function writeRuntimeFailure(message: string): Promise<void> {
  process.stderr.write(`${message}\n`);
}

async function writeRuntimeInformation(message: string): Promise<void> {
  process.stdout.write(`${message}\n`);
}

function createRuntimeDependencies(commandEnvironment: CommandEnvironment): PreviewNextBetaCommandDependencies {
  const httpClient = createRuntimeKyHttpClient();
  const githubClient = createGitHubClient({
    httpClient,
    githubApiUrl: commandEnvironment.githubApiUrl,
    githubRepository: commandEnvironment.githubRepository,
    githubToken: commandEnvironment.githubToken,
  });

  return {
    executeGitCommand: executeRuntimeGitCommand,
    githubClient,
    planNextBetaPreviewHistory,
    writeFailure: writeRuntimeFailure,
    writeInformation: writeRuntimeInformation,
    async writeSummary(summary): Promise<void> {
      await appendFile(commandEnvironment.githubStepSummary, `${summary}\n`, 'utf8');
    },
  };
}

async function startPreviewNextBetaCommand(): Promise<void> {
  const githubToken = Maybe.of(process.env.GITHUB_TOKEN).unwrapOr('');
  try {
    const commandEnvironmentResult = readCommandEnvironment(process.env);
    if (commandEnvironmentResult.isErr) {
      await writeRuntimeFailure(redactSecret(commandEnvironmentResult.error.message, githubToken));
      process.exitCode = 1;

      return;
    }

    const commandResult = await executePreviewNextBetaCommand({
      commandLineArguments: process.argv.slice(processArgumentStartIndex),
      environment: process.env,
      dependencies: createRuntimeDependencies(commandEnvironmentResult.value),
    });
    process.exitCode = commandResult.exitCode;
  } catch (error: unknown) {
    await writeRuntimeFailure(
      redactSecret(is.error(error) ? error.message : 'Unexpected preview failure', githubToken),
    );
    process.exitCode = 1;
  }
}

function isPreviewNextBetaCommandEntrypoint(): boolean {
  return Maybe.of(process.argv[1])
    .map(entrypointPath => {
      return /(?:^|[\\/])previewNextBetaCommand\.ts$/.test(entrypointPath);
    })
    .unwrapOr(false);
}

if (isPreviewNextBetaCommandEntrypoint()) {
  void startPreviewNextBetaCommand();
}
