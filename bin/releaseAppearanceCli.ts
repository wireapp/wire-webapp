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

import {execFile} from 'node:child_process';
import {appendFile} from 'node:fs/promises';
import process from 'node:process';

import is from '@sindresorhus/is';
import ky, {isHTTPError, isNetworkError, isTimeoutError} from 'ky';
import type {KyInstance, Options as KyOptions} from 'ky';
import {match} from 'ts-pattern';
import {Maybe, Result} from 'true-myth';

import {
  parseBetaCandidateTag,
  prepareReleaseAppearanceComment,
  selectBetaDiscoveryRange,
  selectProductionDiscoveryRange,
} from './releaseAppearance';
import type {
  CommitDiscoveryRange,
  CommitRangeRelationship,
  PreparedReleaseAppearanceComment,
  ReleaseAppearanceComment,
  ReleaseAppearanceEnvironment,
} from './releaseAppearance';

const nodeExecutableAndScriptPathArgumentCount = 2;
const maximumGitHubRetryCount = 2;
const initialGitHubRetryDelayMilliseconds = 1000;
const fullCommitHashPattern = /^[0-9a-f]{40}$/iu;
const productionTagPattern = /^\d{4}-\d{2}-\d{2}\.[1-9]\d*-production$/u;
const retryableGitHubHttpStatusCodes = [408, 429, 500, 502, 503, 504] as const;
const retryableGitHubRequestMethods = ['get', 'patch'] as const;

export type GitCommand = (commandArguments: readonly string[]) => Promise<string>;

export type GitHubPage<Item> = {
  readonly hasNextPage: boolean;
  readonly items: readonly Item[];
};

export type AssociatedPullRequest = {
  readonly pullRequestNumber: number;
};

export type GitHubClient = {
  readonly createIssueComment: (pullRequestNumber: number, body: string) => Promise<void>;
  readonly listIssueComments: (
    pullRequestNumber: number,
    pageNumber: number,
  ) => Promise<GitHubPage<ReleaseAppearanceComment>>;
  readonly listPullRequestsAssociatedWithCommit: (
    commitHash: string,
    pageNumber: number,
  ) => Promise<GitHubPage<AssociatedPullRequest>>;
  readonly updateIssueComment: (commentId: number, body: string) => Promise<void>;
};

export type ReleaseAppearanceDependencies = {
  readonly executeGitCommand: GitCommand;
  readonly githubClient: GitHubClient;
  readonly writeError: (message: string) => void;
  readonly writeOutput: (message: string) => void;
  readonly writeSummary: (message: string) => Promise<void>;
};

export type ReleaseAppearanceRunParameters = {
  readonly currentCommitHash: string;
  readonly environment: ReleaseAppearanceEnvironment;
  readonly releaseTagName: string;
  readonly workflowRunUrl: string;
};

export type ResolvedAppearanceRange = {
  readonly baselineRelationshipFailures: readonly string[];
  readonly range: CommitDiscoveryRange;
};

export type ReleaseAppearanceSummaryDependencies = Pick<ReleaseAppearanceDependencies, 'writeError' | 'writeSummary'>;

type GitHubRepository = {
  readonly name: string;
  readonly owner: string;
};

type TagRelationshipResolution = {
  readonly failures: readonly string[];
  readonly relationships: readonly CommitRangeRelationship[];
};

type ValidateCurrentReleaseTagParameters = {
  readonly currentCommitHash: string;
  readonly executeGitCommand: GitCommand;
  readonly releaseTagName: string;
};

export type ResolveReleaseAppearanceRangeParameters = {
  readonly currentCommitHash: string;
  readonly environment: ReleaseAppearanceEnvironment;
  readonly executeGitCommand: GitCommand;
  readonly releaseTagName: string;
};

export type DiscoverPullRequestsInRangeParameters = {
  readonly executeGitCommand: GitCommand;
  readonly githubClient: GitHubClient;
  readonly range: CommitDiscoveryRange;
};

type ReadIssueCommentsParameters = {
  readonly pullRequestNumber: number;
  readonly githubClient: GitHubClient;
};

type ApplyPreparedCommentParameters = {
  readonly githubClient: GitHubClient;
  readonly preparedComment: PreparedReleaseAppearanceComment;
  readonly pullRequestNumber: number;
};

export type ProcessPullRequestsSequentiallyParameters = {
  readonly currentReleaseTagName: string;
  readonly environment: ReleaseAppearanceEnvironment;
  readonly githubClient: GitHubClient;
  readonly pullRequestNumbers: readonly number[];
  readonly workflowRunUrl: string;
  readonly writeError: (message: string) => void;
  readonly writeOutput: (message: string) => void;
};

export type ReleaseAppearanceSummaryParameters = {
  readonly commentProcessing: CommentProcessingResult;
  readonly discovery: PullRequestDiscoveryResult;
  readonly environment: ReleaseAppearanceEnvironment;
  readonly range: ResolvedAppearanceRange;
  readonly releaseTagName: string;
};

type GitHubRequestParameters = {
  readonly apiUrl: string;
  readonly githubRequest: KyInstance;
  readonly method: 'GET' | 'POST' | 'PATCH';
  readonly requestBody?: string;
  readonly requestPath: string;
  readonly token: string;
};

type GitHubJsonResponse = {
  readonly hasNextPage: boolean;
  readonly responseBody: unknown;
};

type RequiredEnvironmentValues = {
  readonly apiUrl: string;
  readonly repositoryName: string;
  readonly summaryFilePath: string;
  readonly token: string;
};

type GitHubFetchImplementation = NonNullable<KyOptions['fetch']>;

type CreateGitHubClientParameters = {
  readonly apiUrl: string;
  readonly fetchFunction: GitHubFetchImplementation;
  readonly repositoryName: string;
  readonly retryDelay?: GitHubRetryDelay;
  readonly token: string;
};

export type GitHubRetryDelay = (retryAttemptNumber: number) => number;

export type PullRequestDiscoveryResult = {
  readonly commitFailures: readonly string[];
  readonly commitsInspected: readonly string[];
  readonly commitsWithoutPullRequests: readonly string[];
  readonly pullRequestNumbers: readonly number[];
};

export type CommentProcessingResult = {
  readonly createdPullRequestNumbers: readonly number[];
  readonly failedPullRequests: readonly string[];
  readonly unchangedPullRequestNumbers: readonly number[];
  readonly updatedPullRequestNumbers: readonly number[];
};

function describeUnknownError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (is.plainObject(error) && is.nonEmptyString(error.message)) {
    return error.message;
  }

  return String(error);
}

function isFullCommitHash(value: string): boolean {
  return is.nonEmptyString(value) && fullCommitHashPattern.test(value);
}

function parseGitOutput(output: string, description: string): Result<string, Error> {
  const normalizedOutput = output.trim();

  if (!is.nonEmptyString(normalizedOutput)) {
    return Result.err(new Error(`${description} was empty.`));
  }

  return Result.ok(normalizedOutput);
}

function parseFullCommitHash(output: string, description: string): Result<string, Error> {
  const normalizedOutputResult = parseGitOutput(output, description);

  if (normalizedOutputResult.isErr) {
    return Result.err(normalizedOutputResult.error);
  }

  if (!isFullCommitHash(normalizedOutputResult.value)) {
    return Result.err(new Error(`${description} was not a full commit SHA.`));
  }

  return Result.ok(normalizedOutputResult.value);
}

function parseGitInteger(output: string, description: string): Result<number, Error> {
  const normalizedOutputResult = parseGitOutput(output, description);

  if (normalizedOutputResult.isErr) {
    return Result.err(normalizedOutputResult.error);
  }

  const parsedInteger = Number(normalizedOutputResult.value);

  if (!is.integer(parsedInteger) || parsedInteger < 0) {
    return Result.err(new Error(`${description} was not a non-negative integer.`));
  }

  return Result.ok(parsedInteger);
}

function parseGitTagNames(output: string): readonly string[] {
  return output
    .split('\n')
    .map(tagName => {
      return tagName.trim();
    })
    .filter(is.nonEmptyString);
}

function parseGitHubRepository(repositoryName: string): Result<GitHubRepository, Error> {
  const repositoryParts = repositoryName.split('/');

  if (
    repositoryParts.length !== 2 ||
    !is.nonEmptyString(repositoryParts[0]) ||
    !is.nonEmptyString(repositoryParts[1])
  ) {
    return Result.err(new Error(`Invalid GitHub repository name: ${repositoryName}`));
  }

  return Result.ok({name: repositoryParts[1], owner: repositoryParts[0]});
}

function isSafeGitHubApiUrl(apiUrl: string): boolean {
  if (!is.urlString(apiUrl)) {
    return false;
  }

  try {
    const parsedApiUrl = new URL(apiUrl);
    return parsedApiUrl.protocol === 'https:' || parsedApiUrl.protocol === 'http:';
  } catch {
    return false;
  }
}

function shouldRetryGitHubRequest(error: unknown): boolean {
  return match(error)
    .when(isHTTPError, httpError => {
      return retryableGitHubHttpStatusCodes.some((retryableHttpStatusCode: number): boolean => {
        return retryableHttpStatusCode === httpError.response.status;
      });
    })
    .when(isNetworkError, (): boolean => {
      return true;
    })
    .when(isTimeoutError, (): boolean => {
      return true;
    })
    .otherwise((): boolean => {
      return false;
    });
}

function createGitHubRequestError(error: unknown): Error {
  return match(error)
    .when(isHTTPError, httpError => {
      return new Error(`GitHub request returned HTTP ${httpError.response.status}.`, {cause: error});
    })
    .otherwise(() => {
      return new Error(`GitHub request failed before receiving a response: ${describeUnknownError(error)}`, {
        cause: error,
      });
    });
}

export function createGitCommand(): GitCommand {
  return async (commandArguments: readonly string[]): Promise<string> => {
    return new Promise<string>((resolve, reject) => {
      execFile('git', [...commandArguments], {encoding: 'utf8'}, (error, standardOutput) => {
        if (error !== null) {
          reject(error);
          return;
        }

        resolve(standardOutput);
      });
    });
  };
}

async function resolveCommitRangeRelationship(
  tagName: string,
  currentCommitHash: string,
  executeGitCommand: GitCommand,
): Promise<Result<CommitRangeRelationship, Error>> {
  try {
    const tagCommitHashResult = parseFullCommitHash(
      await executeGitCommand(['rev-parse', '--verify', `refs/tags/${tagName}^{commit}`]),
      `Commit for tag ${tagName}`,
    );

    if (tagCommitHashResult.isErr) {
      return Result.err(tagCommitHashResult.error);
    }

    const mergeBaseCommitHashResult = parseFullCommitHash(
      await executeGitCommand(['merge-base', tagCommitHashResult.value, currentCommitHash]),
      `Merge base for tag ${tagName}`,
    );

    if (mergeBaseCommitHashResult.isErr) {
      return Result.err(mergeBaseCommitHashResult.error);
    }

    const commitDistanceResult = parseGitInteger(
      await executeGitCommand(['rev-list', '--count', `${mergeBaseCommitHashResult.value}..${currentCommitHash}`]),
      `Commit distance for tag ${tagName}`,
    );

    if (commitDistanceResult.isErr) {
      return Result.err(commitDistanceResult.error);
    }

    const tagTimestampResult = parseGitInteger(
      await executeGitCommand(['show', '-s', '--format=%ct', tagCommitHashResult.value]),
      `Timestamp for tag ${tagName}`,
    );

    if (tagTimestampResult.isErr) {
      return Result.err(tagTimestampResult.error);
    }

    return Result.ok({
      commitDistanceFromMergeBase: commitDistanceResult.value,
      mergeBaseCommitHash: mergeBaseCommitHashResult.value,
      tagCommitHash: tagCommitHashResult.value,
      tagName,
      tagTimestampSeconds: tagTimestampResult.value,
    });
  } catch (error: unknown) {
    return Result.err(new Error(`Unable to inspect tag ${tagName}: ${describeUnknownError(error)}`));
  }
}

async function resolveTagRelationships(
  tagNames: readonly string[],
  currentCommitHash: string,
  executeGitCommand: GitCommand,
): Promise<TagRelationshipResolution> {
  let relationships: readonly CommitRangeRelationship[] = [];
  let failures: readonly string[] = [];

  for (const tagName of tagNames) {
    const relationshipResult = await resolveCommitRangeRelationship(tagName, currentCommitHash, executeGitCommand);

    if (relationshipResult.isErr) {
      failures = [...failures, relationshipResult.error.message];
    } else {
      relationships = [...relationships, relationshipResult.value];
    }
  }

  return {failures, relationships};
}

function isProductionTagName(tagName: string): boolean {
  return productionTagPattern.test(tagName);
}

async function readReleaseTagNames(executeGitCommand: GitCommand): Promise<readonly string[]> {
  return parseGitTagNames(await executeGitCommand(['tag', '--list']));
}

async function validateCurrentReleaseTag(
  parameters: ValidateCurrentReleaseTagParameters,
): Promise<Result<void, Error>> {
  if (!isFullCommitHash(parameters.currentCommitHash)) {
    return Result.err(new Error(`Invalid current release commit SHA: ${parameters.currentCommitHash}`));
  }

  try {
    const currentTagCommitHashResult = parseFullCommitHash(
      await parameters.executeGitCommand(['rev-parse', '--verify', `refs/tags/${parameters.releaseTagName}^{commit}`]),
      `Commit for release tag ${parameters.releaseTagName}`,
    );

    if (currentTagCommitHashResult.isErr) {
      return Result.err(currentTagCommitHashResult.error);
    }

    if (currentTagCommitHashResult.value !== parameters.currentCommitHash) {
      return Result.err(
        new Error(
          `Release tag ${parameters.releaseTagName} points to ${currentTagCommitHashResult.value}, expected ${parameters.currentCommitHash}.`,
        ),
      );
    }

    return Result.ok(undefined);
  } catch (error: unknown) {
    return Result.err(new Error(`Unable to validate release tag: ${describeUnknownError(error)}`));
  }
}

export async function resolveReleaseAppearanceRange(
  parameters: ResolveReleaseAppearanceRangeParameters,
): Promise<Result<ResolvedAppearanceRange, Error>> {
  const currentReleaseTagValidationResult = await validateCurrentReleaseTag(parameters);

  if (currentReleaseTagValidationResult.isErr) {
    return Result.err(currentReleaseTagValidationResult.error);
  }

  const allTagNames = await readReleaseTagNames(parameters.executeGitCommand);
  const productionTagNames = allTagNames.filter(isProductionTagName);

  if (parameters.environment === 'production') {
    const productionRelationshipResolution = await resolveTagRelationships(
      productionTagNames,
      parameters.currentCommitHash,
      parameters.executeGitCommand,
    );
    const rangeResult = selectProductionDiscoveryRange({
      currentCommitHash: parameters.currentCommitHash,
      currentProductionTagName: parameters.releaseTagName,
      productionTagRelationships: productionRelationshipResolution.relationships,
    });

    if (rangeResult.isErr) {
      return Result.err(rangeResult.error);
    }

    return Result.ok({
      baselineRelationshipFailures: productionRelationshipResolution.failures,
      range: rangeResult.value,
    });
  }

  const currentBetaCandidateTagResult = parseBetaCandidateTag(parameters.releaseTagName);

  if (currentBetaCandidateTagResult.isErr) {
    return Result.err(currentBetaCandidateTagResult.error);
  }

  const releaseIdentifier = currentBetaCandidateTagResult.value.releaseIdentifier;
  const betaTagNames = allTagNames.filter(tagName => {
    const betaCandidateTagResult = parseBetaCandidateTag(tagName);
    return betaCandidateTagResult.isOk && betaCandidateTagResult.value.releaseIdentifier === releaseIdentifier;
  });
  const betaRelationshipResolution =
    currentBetaCandidateTagResult.value.candidateNumber > 1
      ? await resolveTagRelationships(betaTagNames, parameters.currentCommitHash, parameters.executeGitCommand)
      : {failures: [], relationships: []};
  const productionRelationshipResolution =
    currentBetaCandidateTagResult.value.candidateNumber === 1
      ? await resolveTagRelationships(productionTagNames, parameters.currentCommitHash, parameters.executeGitCommand)
      : {failures: [], relationships: []};
  const rangeResult = selectBetaDiscoveryRange({
    betaTagRelationships: betaRelationshipResolution.relationships,
    currentBetaTagName: parameters.releaseTagName,
    currentCommitHash: parameters.currentCommitHash,
    existingBetaTagNames: betaTagNames,
    productionTagRelationships: productionRelationshipResolution.relationships,
  });

  if (rangeResult.isErr) {
    return Result.err(rangeResult.error);
  }

  return Result.ok({
    baselineRelationshipFailures: [
      ...betaRelationshipResolution.failures,
      ...productionRelationshipResolution.failures,
    ],
    range: rangeResult.value,
  });
}

export async function discoverPullRequestsInRange(
  parameters: DiscoverPullRequestsInRangeParameters,
): Promise<PullRequestDiscoveryResult> {
  const commitOutput = await parameters.executeGitCommand(['rev-list', '--reverse', parameters.range.revisionRange]);
  const commitsInspected = parseGitTagNames(commitOutput);
  let pullRequestNumbers: readonly number[] = [];
  let commitsWithoutPullRequests: readonly string[] = [];
  let commitFailures: readonly string[] = [];

  for (const commitHash of commitsInspected) {
    let pageNumber = 1;
    let hasNextPage = true;
    let associatedPullRequestCount = 0;
    let commitFailed = false;

    while (hasNextPage) {
      try {
        const pullRequestPage = await parameters.githubClient.listPullRequestsAssociatedWithCommit(
          commitHash,
          pageNumber,
        );

        associatedPullRequestCount += pullRequestPage.items.length;

        for (const associatedPullRequest of pullRequestPage.items) {
          if (!pullRequestNumbers.includes(associatedPullRequest.pullRequestNumber)) {
            pullRequestNumbers = [...pullRequestNumbers, associatedPullRequest.pullRequestNumber];
          }
        }

        hasNextPage = pullRequestPage.hasNextPage;
        pageNumber += 1;
      } catch (error: unknown) {
        commitFailures = [...commitFailures, `Commit ${commitHash}: ${describeUnknownError(error)}`];
        commitFailed = true;
        hasNextPage = false;
      }
    }

    if (!commitFailed && associatedPullRequestCount === 0) {
      commitsWithoutPullRequests = [...commitsWithoutPullRequests, commitHash];
    }
  }

  return {commitFailures, commitsInspected, commitsWithoutPullRequests, pullRequestNumbers};
}

async function readAllIssueComments(
  parameters: ReadIssueCommentsParameters,
): Promise<readonly ReleaseAppearanceComment[]> {
  let pageNumber = 1;
  let hasNextPage = true;
  let comments: readonly ReleaseAppearanceComment[] = [];

  while (hasNextPage) {
    const commentPage = await parameters.githubClient.listIssueComments(parameters.pullRequestNumber, pageNumber);
    comments = [...comments, ...commentPage.items];
    hasNextPage = commentPage.hasNextPage;
    pageNumber += 1;
  }

  return comments;
}

async function applyPreparedComment(parameters: ApplyPreparedCommentParameters): Promise<void> {
  const preparedComment = parameters.preparedComment;

  return match(preparedComment)
    .with({action: 'create'}, async ({body}): Promise<void> => {
      await parameters.githubClient.createIssueComment(parameters.pullRequestNumber, body);
    })
    .with({action: 'update'}, async ({body, commentId}): Promise<void> => {
      await parameters.githubClient.updateIssueComment(commentId, body);
    })
    .with({action: 'unchanged'}, (): Promise<void> => {
      return Promise.resolve();
    })
    .exhaustive();
}

export async function processPullRequestsSequentially(
  parameters: ProcessPullRequestsSequentiallyParameters,
): Promise<CommentProcessingResult> {
  let createdPullRequestNumbers: readonly number[] = [];
  let unchangedPullRequestNumbers: readonly number[] = [];
  let updatedPullRequestNumbers: readonly number[] = [];
  let failedPullRequests: readonly string[] = [];

  for (const pullRequestNumber of parameters.pullRequestNumbers) {
    try {
      const comments = await readAllIssueComments({
        githubClient: parameters.githubClient,
        pullRequestNumber,
      });
      const preparedCommentResult = prepareReleaseAppearanceComment({
        comments,
        environment: parameters.environment,
        tagName: parameters.currentReleaseTagName,
        workflowRunUrl: parameters.workflowRunUrl,
      });

      if (preparedCommentResult.isErr) {
        throw preparedCommentResult.error;
      }

      const preparedComment = preparedCommentResult.value;
      await applyPreparedComment({
        githubClient: parameters.githubClient,
        preparedComment,
        pullRequestNumber,
      });

      match(preparedComment.action)
        .with('create', (): void => {
          createdPullRequestNumbers = [...createdPullRequestNumbers, pullRequestNumber];
        })
        .with('update', (): void => {
          updatedPullRequestNumbers = [...updatedPullRequestNumbers, pullRequestNumber];
        })
        .with('unchanged', (): void => {
          unchangedPullRequestNumbers = [...unchangedPullRequestNumbers, pullRequestNumber];
        })
        .exhaustive();

      parameters.writeOutput(`Pull request #${pullRequestNumber}: ${preparedComment.action}.`);
    } catch (error: unknown) {
      const failureMessage = `Pull request #${pullRequestNumber}: ${describeUnknownError(error)}`;
      failedPullRequests = [...failedPullRequests, failureMessage];
      parameters.writeError(failureMessage);
    }
  }

  return {
    createdPullRequestNumbers,
    failedPullRequests,
    unchangedPullRequestNumbers,
    updatedPullRequestNumbers,
  };
}

export function renderReleaseAppearanceSummary(parameters: ReleaseAppearanceSummaryParameters): string {
  const lines = [
    '### First appeared in comment processing',
    '',
    `- Environment: ${parameters.environment === 'beta' ? 'Beta' : 'Production'}`,
    `- Release tag: \`${parameters.releaseTagName}\``,
    `- Baseline tag: \`${parameters.range.range.baselineTagName}\``,
    `- Merge base: \`${parameters.range.range.mergeBaseCommitHash}\``,
    `- Revision range: \`${parameters.range.range.revisionRange}\``,
    `- Commits inspected: ${parameters.discovery.commitsInspected.length}`,
    `- Pull requests discovered: ${parameters.discovery.pullRequestNumbers.length}`,
    `- Comments created: ${parameters.commentProcessing.createdPullRequestNumbers.length}`,
    `- Comments updated: ${parameters.commentProcessing.updatedPullRequestNumbers.length}`,
    `- Comments unchanged: ${parameters.commentProcessing.unchangedPullRequestNumbers.length}`,
    `- Failed pull requests: ${parameters.commentProcessing.failedPullRequests.length}`,
    '',
    'Commits without associated merged pull requests:',
  ];

  if (parameters.discovery.commitsWithoutPullRequests.length === 0) {
    lines.push('- None');
  } else {
    for (const commitHash of parameters.discovery.commitsWithoutPullRequests) {
      lines.push(`- \`${commitHash}\``);
    }
  }

  if (parameters.discovery.commitFailures.length > 0) {
    lines.push('', 'Commit discovery failures:');
    for (const commitFailure of parameters.discovery.commitFailures) {
      lines.push(`- ${commitFailure}`);
    }
  }

  if (parameters.commentProcessing.failedPullRequests.length > 0) {
    lines.push('', 'Comment processing failures:');
    for (const failedPullRequest of parameters.commentProcessing.failedPullRequests) {
      lines.push(`- ${failedPullRequest}`);
    }
  }

  if (parameters.range.baselineRelationshipFailures.length > 0) {
    lines.push('', 'Baseline candidates that could not be inspected:');
    for (const baselineRelationshipFailure of parameters.range.baselineRelationshipFailures) {
      lines.push(`- ${baselineRelationshipFailure}`);
    }
  }

  return lines.join('\n');
}

async function writeSummarySafely(
  summary: string,
  dependencies: ReleaseAppearanceSummaryDependencies,
): Promise<boolean> {
  try {
    await dependencies.writeSummary(summary);
    return true;
  } catch (error: unknown) {
    dependencies.writeError(`Unable to write the GitHub Actions summary: ${describeUnknownError(error)}`);
    return false;
  }
}

export async function runReleaseAppearance(
  parameters: ReleaseAppearanceRunParameters,
  dependencies: ReleaseAppearanceDependencies,
): Promise<number> {
  try {
    const rangeResult = await resolveReleaseAppearanceRange({
      currentCommitHash: parameters.currentCommitHash,
      environment: parameters.environment,
      executeGitCommand: dependencies.executeGitCommand,
      releaseTagName: parameters.releaseTagName,
    });

    if (rangeResult.isErr) {
      throw rangeResult.error;
    }

    const discovery = await discoverPullRequestsInRange({
      executeGitCommand: dependencies.executeGitCommand,
      githubClient: dependencies.githubClient,
      range: rangeResult.value.range,
    });
    const commentProcessing = await processPullRequestsSequentially({
      currentReleaseTagName: parameters.releaseTagName,
      environment: parameters.environment,
      githubClient: dependencies.githubClient,
      pullRequestNumbers: discovery.pullRequestNumbers,
      workflowRunUrl: parameters.workflowRunUrl,
      writeError: dependencies.writeError,
      writeOutput: dependencies.writeOutput,
    });
    const summary = renderReleaseAppearanceSummary({
      commentProcessing,
      discovery,
      environment: parameters.environment,
      range: rangeResult.value,
      releaseTagName: parameters.releaseTagName,
    });

    const summaryWriteSucceeded = await writeSummarySafely(summary, dependencies);

    return discovery.commitFailures.length === 0 &&
      commentProcessing.failedPullRequests.length === 0 &&
      summaryWriteSucceeded
      ? 0
      : 1;
  } catch (error: unknown) {
    const failureMessage = `Release appearance processing failed: ${describeUnknownError(error)}`;
    dependencies.writeError(failureMessage);
    await writeSummarySafely(`### First appeared in comment processing\n\n- Failure: ${failureMessage}`, dependencies);
    return 1;
  }
}

async function requestGitHubJson(parameters: GitHubRequestParameters): Promise<GitHubJsonResponse> {
  let response: Response;

  try {
    response = await parameters.githubRequest(`${parameters.apiUrl.replace(/\/+$/u, '')}${parameters.requestPath}`, {
      body: parameters.requestBody,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${parameters.token}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
      method: parameters.method,
    });
  } catch (error: unknown) {
    throw createGitHubRequestError(error);
  }

  let responseBody: unknown;

  try {
    responseBody = JSON.parse(await response.text()) as unknown;
  } catch (error: unknown) {
    throw new Error(`GitHub response was not valid JSON: ${describeUnknownError(error)}`, {cause: error});
  }

  const linkHeader = response.headers.get('link');
  const hasNextPage = is.nonEmptyString(linkHeader) && /<[^>]+>;\s*rel="next"/u.test(linkHeader);

  return {hasNextPage, responseBody};
}

function parseAssociatedPullRequest(value: unknown, itemIndex: number): Result<Maybe<AssociatedPullRequest>, Error> {
  if (!is.plainObject(value) || !is.integer(value.number) || value.number < 1) {
    return Result.err(new Error(`Associated pull request at index ${itemIndex} has an invalid number.`));
  }

  if (!is.null_(value.merged_at) && !is.nonEmptyString(value.merged_at)) {
    return Result.err(new Error(`Associated pull request at index ${itemIndex} has invalid merge metadata.`));
  }

  return Result.ok(
    is.nonEmptyString(value.merged_at) ? Maybe.just({pullRequestNumber: value.number}) : Maybe.nothing(),
  );
}

function parseAssociatedPullRequestPage(responseBody: unknown): Result<readonly AssociatedPullRequest[], Error> {
  if (!is.array(responseBody)) {
    return Result.err(new Error('GitHub associated pull request response was not an array.'));
  }

  let pullRequests: readonly AssociatedPullRequest[] = [];

  for (let itemIndex = 0; itemIndex < responseBody.length; itemIndex += 1) {
    const pullRequestResult = parseAssociatedPullRequest(responseBody[itemIndex], itemIndex);

    if (pullRequestResult.isErr) {
      return Result.err(pullRequestResult.error);
    }

    if (pullRequestResult.value.isJust) {
      pullRequests = [...pullRequests, pullRequestResult.value.value];
    }
  }

  return Result.ok(pullRequests);
}

function parseIssueComment(value: unknown, itemIndex: number): Result<ReleaseAppearanceComment, Error> {
  if (!is.plainObject(value) || !is.integer(value.id) || value.id < 1 || !is.string(value.body)) {
    return Result.err(new Error(`Issue comment at index ${itemIndex} has invalid fields.`));
  }

  return Result.ok({body: value.body, commentId: value.id});
}

function parseIssueCommentPage(responseBody: unknown): Result<readonly ReleaseAppearanceComment[], Error> {
  if (!is.array(responseBody)) {
    return Result.err(new Error('GitHub issue comments response was not an array.'));
  }

  let comments: readonly ReleaseAppearanceComment[] = [];

  for (let itemIndex = 0; itemIndex < responseBody.length; itemIndex += 1) {
    const commentResult = parseIssueComment(responseBody[itemIndex], itemIndex);

    if (commentResult.isErr) {
      return Result.err(commentResult.error);
    }

    comments = [...comments, commentResult.value];
  }

  return Result.ok(comments);
}

function createIssueCommentRequestBody(body: string): string {
  return JSON.stringify({body});
}

export function createGitHubClient(parameters: CreateGitHubClientParameters): Result<GitHubClient, Error> {
  if (!isSafeGitHubApiUrl(parameters.apiUrl)) {
    return Result.err(new Error(`Invalid GitHub API URL: ${parameters.apiUrl}`));
  }

  if (!is.nonEmptyString(parameters.token)) {
    return Result.err(new Error('GitHub token must not be empty.'));
  }

  const repositoryResult = parseGitHubRepository(parameters.repositoryName);

  if (repositoryResult.isErr) {
    return Result.err(repositoryResult.error);
  }

  const repositoryPath = `/repos/${encodeURIComponent(repositoryResult.value.owner)}/${encodeURIComponent(
    repositoryResult.value.name,
  )}`;
  const retryDelay =
    parameters.retryDelay ??
    ((retryAttemptNumber: number): number => {
      return initialGitHubRetryDelayMilliseconds * 2 ** (retryAttemptNumber - 1);
    });
  const githubRequest = ky.create({
    fetch: parameters.fetchFunction,
    retry: {
      afterStatusCodes: [429, 503],
      delay: retryDelay,
      limit: maximumGitHubRetryCount,
      methods: [...retryableGitHubRequestMethods],
      shouldRetry: ({error}): boolean => {
        return shouldRetryGitHubRequest(error);
      },
      statusCodes: [...retryableGitHubHttpStatusCodes],
    },
  });

  return Result.ok({
    createIssueComment: async (pullRequestNumber: number, body: string): Promise<void> => {
      const response = await requestGitHubJson({
        apiUrl: parameters.apiUrl,
        githubRequest,
        method: 'POST',
        requestBody: createIssueCommentRequestBody(body),
        requestPath: `${repositoryPath}/issues/${pullRequestNumber}/comments`,
        token: parameters.token,
      });
      const commentResult = parseIssueComment(response.responseBody, 0);

      if (commentResult.isErr) {
        throw new Error(`GitHub created comment response was invalid: ${commentResult.error.message}`);
      }
    },
    listIssueComments: async (
      pullRequestNumber: number,
      pageNumber: number,
    ): Promise<GitHubPage<ReleaseAppearanceComment>> => {
      const response = await requestGitHubJson({
        apiUrl: parameters.apiUrl,
        githubRequest,
        method: 'GET',
        requestPath: `${repositoryPath}/issues/${pullRequestNumber}/comments?per_page=100&page=${pageNumber}`,
        token: parameters.token,
      });
      const commentsResult = parseIssueCommentPage(response.responseBody);

      if (commentsResult.isErr) {
        throw new Error(`GitHub issue comments response was invalid: ${commentsResult.error.message}`);
      }

      return {hasNextPage: response.hasNextPage, items: commentsResult.value};
    },
    listPullRequestsAssociatedWithCommit: async (
      commitHash: string,
      pageNumber: number,
    ): Promise<GitHubPage<AssociatedPullRequest>> => {
      const response = await requestGitHubJson({
        apiUrl: parameters.apiUrl,
        githubRequest,
        method: 'GET',
        requestPath: `${repositoryPath}/commits/${encodeURIComponent(
          commitHash,
        )}/pulls?per_page=100&page=${pageNumber}`,
        token: parameters.token,
      });
      const pullRequestsResult = parseAssociatedPullRequestPage(response.responseBody);

      if (pullRequestsResult.isErr) {
        throw new Error(`GitHub associated pull requests response was invalid: ${pullRequestsResult.error.message}`);
      }

      return {hasNextPage: response.hasNextPage, items: pullRequestsResult.value};
    },
    updateIssueComment: async (commentId: number, body: string): Promise<void> => {
      const response = await requestGitHubJson({
        apiUrl: parameters.apiUrl,
        githubRequest,
        method: 'PATCH',
        requestBody: createIssueCommentRequestBody(body),
        requestPath: `${repositoryPath}/issues/comments/${commentId}`,
        token: parameters.token,
      });
      const commentResult = parseIssueComment(response.responseBody, 0);

      if (commentResult.isErr) {
        throw new Error(`GitHub updated comment response was invalid: ${commentResult.error.message}`);
      }
    },
  });
}

function readRequiredEnvironmentValue(environmentVariableName: string): Result<string, Error> {
  const environmentValue = process.env[environmentVariableName];

  if (!is.nonEmptyString(environmentValue)) {
    return Result.err(new Error(`${environmentVariableName} must not be empty.`));
  }

  return Result.ok(environmentValue);
}

function readRequiredEnvironmentValues(): Result<RequiredEnvironmentValues, Error> {
  const apiUrlResult = readRequiredEnvironmentValue('GITHUB_API_URL');

  if (apiUrlResult.isErr) {
    return Result.err(apiUrlResult.error);
  }

  const repositoryNameResult = readRequiredEnvironmentValue('GITHUB_REPOSITORY');

  if (repositoryNameResult.isErr) {
    return Result.err(repositoryNameResult.error);
  }

  const summaryFilePathResult = readRequiredEnvironmentValue('GITHUB_STEP_SUMMARY');

  if (summaryFilePathResult.isErr) {
    return Result.err(summaryFilePathResult.error);
  }

  const tokenResult = readRequiredEnvironmentValue('GITHUB_TOKEN');

  if (tokenResult.isErr) {
    return Result.err(tokenResult.error);
  }

  return Result.ok({
    apiUrl: apiUrlResult.value,
    repositoryName: repositoryNameResult.value,
    summaryFilePath: summaryFilePathResult.value,
    token: tokenResult.value,
  });
}

function parseReleaseAppearanceArguments(
  commandLineArguments: readonly string[],
): Result<ReleaseAppearanceRunParameters, Error> {
  const [environmentName, releaseTagName, currentCommitHash, workflowRunUrl] = commandLineArguments;

  if (
    (environmentName !== 'beta' && environmentName !== 'production') ||
    !is.nonEmptyString(releaseTagName) ||
    !is.nonEmptyString(currentCommitHash) ||
    !is.nonEmptyString(workflowRunUrl)
  ) {
    return Result.err(
      new Error(
        'Usage: releaseAppearanceCli.ts <beta|production> <release-tag-name> <release-commit-sha> <workflow-run-url>',
      ),
    );
  }

  return Result.ok({
    currentCommitHash,
    environment: environmentName,
    releaseTagName,
    workflowRunUrl,
  });
}

function createSummaryWriter(summaryFilePath: string): (message: string) => Promise<void> {
  return async (message: string): Promise<void> => {
    await appendFile(summaryFilePath, `${message}\n`);
  };
}

async function main(): Promise<void> {
  const commandLineArgumentsResult = parseReleaseAppearanceArguments(
    process.argv.slice(nodeExecutableAndScriptPathArgumentCount),
  );

  if (commandLineArgumentsResult.isErr) {
    console.error(commandLineArgumentsResult.error.message);
    process.exitCode = 1;
    return;
  }

  const environmentValuesResult = readRequiredEnvironmentValues();

  if (environmentValuesResult.isErr) {
    console.error(environmentValuesResult.error.message);
    process.exitCode = 1;
    return;
  }

  const {apiUrl, repositoryName, summaryFilePath, token} = environmentValuesResult.value;
  const githubClientResult = createGitHubClient({
    apiUrl,
    fetchFunction: globalThis.fetch,
    repositoryName,
    token,
  });

  if (githubClientResult.isErr) {
    console.error(githubClientResult.error.message);
    process.exitCode = 1;
    return;
  }

  process.exitCode = await runReleaseAppearance(commandLineArgumentsResult.value, {
    executeGitCommand: createGitCommand(),
    githubClient: githubClientResult.value,
    writeError(message: string): void {
      console.error(message);
    },
    writeOutput(message: string): void {
      console.log(message);
    },
    writeSummary: createSummaryWriter(summaryFilePath),
  });
}

if (require.main === module) {
  void main();
}
