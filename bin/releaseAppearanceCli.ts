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
import ky, {isHTTPError} from 'ky';
import type {KyInstance, Options as KyOptions} from 'ky';
import {P, match} from 'ts-pattern';
import {Maybe, Result} from 'true-myth';
import type {Unit} from 'true-myth';

import {
  getReleaseAppearanceCommentMarker,
  isProductionReleaseTagName,
  parseBetaCandidateTag,
  parseProductionReleaseTag,
  prepareReleaseAppearanceCommentWithDesiredState,
  selectCurrentReleaseBetaCandidates,
  selectPreviousProductionBaseline,
  selectBetaDiscoveryRange,
  selectProductionDiscoveryRange,
  verifyReleaseAppearanceCommentState,
} from './releaseAppearance.ts';
import type {
  BetaCandidateDiscoveryRange,
  CommitDiscoveryRange,
  CommitRangeRelationship,
  DesiredReleaseAppearanceCommentState,
  PreparedReleaseAppearanceComment,
  ReleaseAppearanceComment,
  ReleaseAppearanceCommentMode,
  ReleaseAppearanceEnvironment,
  ReleaseTagMetadata,
} from './releaseAppearance.ts';

const nodeExecutableAndScriptPathArgumentCount = 2;
const maximumGitHubRetryCount = 2;
const maximumAmbiguousCommentCreateAttempts = 2;
const initialGitHubRetryDelayMilliseconds = 1000;
const fullCommitHashPattern = /^[0-9a-f]{40}$/iu;
const retryableGitHubHttpStatusCodes = [408, 429, 500, 502, 503, 504] as const;
const retryableGitHubRequestMethods = ['get', 'patch'] as const;

export type GitCommand = (commandArguments: readonly string[]) => Promise<string>;

export type GitHubPage<Item> = {
  readonly hasNextPage: boolean;
  readonly items: readonly Item[];
};

export type AssociatedPullRequest = {
  readonly pullRequestNumber: number;
  readonly targetBranchName: string;
};

export type GitHubPullRequest = {
  readonly isLocked: boolean;
  readonly isMerged: boolean;
  readonly pullRequestNumber: number;
  readonly targetBranchName: string;
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
  readonly getPullRequest: (pullRequestNumber: number) => Promise<GitHubPullRequest>;
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
  readonly baselineTagName: Maybe<string>;
  readonly commentMode: Maybe<ReleaseAppearanceCommentMode>;
  readonly currentBetaTagName: Maybe<string>;
  readonly currentCommitHash: string;
  readonly dryRun: Maybe<boolean>;
  readonly environment: ReleaseAppearanceEnvironment;
  readonly pullRequestNumber: Maybe<number>;
  readonly releaseTagName: string;
  readonly workflowRunUrl: string;
};

export type ResolvedAppearanceRange = {
  readonly baselineRelationshipFailures: readonly string[];
  readonly range: CommitDiscoveryRange;
};

export type ReleaseAppearanceRangeResolution =
  | {
      readonly kind: 'bootstrap';
    }
  | {
      readonly kind: 'range';
      readonly resolvedRange: ResolvedAppearanceRange;
    };

export type BetaCandidateHistory = {
  readonly baselineRelationshipFailures: readonly string[];
  readonly candidateRanges: readonly BetaCandidateDiscoveryRange[];
  readonly discovery: PullRequestDiscoveryResult;
  readonly earliestCandidateTagByPullRequest: ReadonlyMap<number, string>;
};

export type BetaCandidateHistoryResolution =
  | {
      readonly kind: 'bootstrap';
    }
  | {
      readonly kind: 'history';
      readonly history: BetaCandidateHistory;
    };

export type ReleaseAppearanceDiscoveryResolution =
  ReleaseAppearanceRangeResolution | BetaCandidateHistoryResolution | {readonly kind: 'test'};

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

type ResolveCommitRangeRelationshipParameters = {
  readonly currentCommitHash: string;
  readonly executeGitCommand: GitCommand;
  readonly tagName: string;
};

type ResolveTagRelationshipsParameters = {
  readonly currentCommitHash: string;
  readonly executeGitCommand: GitCommand;
  readonly tagNames: readonly string[];
};

type ResolveCommitRangeBetweenTagsParameters = {
  readonly earlierTagRelationship: CommitRangeRelationship;
  readonly executeGitCommand: GitCommand;
  readonly laterTagRelationship: CommitRangeRelationship;
};

type ResolveBetaCandidateRangesParameters = {
  readonly baselineTagName: Maybe<string>;
  readonly currentCommitHash: string;
  readonly executeGitCommand: GitCommand;
  readonly requireFinalCandidate: boolean;
  readonly releaseTagName: string;
};

export type DiscoverBetaCandidateHistoryParameters = {
  readonly baselineTagName: Maybe<string>;
  readonly currentCommitHash: string;
  readonly executeGitCommand: GitCommand;
  readonly githubClient: GitHubClient;
  readonly requireFinalCandidate: boolean;
  readonly releaseTagName: string;
};

type ValidateBaselineTagForEnvironmentParameters = {
  readonly baselineTagName: string;
  readonly environment: ReleaseAppearanceEnvironment;
  readonly releaseTagName: string;
};

export type ResolveReleaseAppearanceRangeParameters = {
  readonly baselineTagName: Maybe<string>;
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
  readonly commentMode: ReleaseAppearanceCommentMode;
  readonly desiredState: DesiredReleaseAppearanceCommentState;
  readonly githubClient: GitHubClient;
  readonly preparedComment: PreparedReleaseAppearanceComment;
  readonly pullRequestNumber: number;
};

export type ProcessPullRequestsSequentiallyParameters = {
  readonly commentMode?: ReleaseAppearanceCommentMode;
  readonly currentReleaseTagName: string;
  readonly dryRun?: boolean;
  readonly environment: ReleaseAppearanceEnvironment;
  readonly firstAppearanceTagNames: Maybe<ReadonlyMap<number, string>>;
  readonly githubClient: GitHubClient;
  readonly pullRequestNumbers: readonly number[];
  readonly workflowRunUrl: string;
  readonly writeError: (message: string) => void;
  readonly writeOutput: (message: string) => void;
};

export type ReleaseAppearanceSummaryParameters = {
  readonly commentMode?: ReleaseAppearanceCommentMode;
  readonly commentProcessing: CommentProcessingResult;
  readonly discovery: PullRequestDiscoveryResult;
  readonly dryRun?: boolean;
  readonly environment: ReleaseAppearanceEnvironment;
  readonly resolution: ReleaseAppearanceDiscoveryResolution;
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

type GitHubRequestMethod = GitHubRequestParameters['method'];

type GitHubRequestFailure = Error & {
  readonly kind: 'github-request-failure';
  readonly method: GitHubRequestMethod;
  readonly retryAfterMilliseconds: Maybe<number>;
  readonly statusCode: Maybe<number>;
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

export type CommentProcessingPlan = {
  readonly action: PreparedReleaseAppearanceComment['action'];
  readonly body: string;
  readonly commentId: Maybe<number>;
  readonly pullRequestNumber: number;
};

export type CommentProcessingResult = {
  readonly plans: readonly CommentProcessingPlan[];
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

function isSupportedPullRequestTargetBranch(targetBranchName: string): boolean {
  return targetBranchName === 'main' || /^release\/[^\s/]+$/u.test(targetBranchName);
}

function parseGitHubRepository(repositoryName: string): Result<GitHubRepository, Error> {
  const repositoryParts = repositoryName.split('/');
  const ownerName = Maybe.of(repositoryParts[0]);
  const repositoryNamePart = Maybe.of(repositoryParts[1]);

  if (
    repositoryParts.length !== 2 ||
    ownerName.isNothing ||
    repositoryNamePart.isNothing ||
    !is.nonEmptyString(ownerName.value) ||
    !is.nonEmptyString(repositoryNamePart.value)
  ) {
    return Result.err(new Error(`Invalid GitHub repository name: ${repositoryName}`));
  }

  return Result.ok({name: repositoryNamePart.value, owner: ownerName.value});
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

function parseRetryAfterHeader(retryAfterHeader: string, currentTimeMilliseconds: number): Maybe<number> {
  const retryAfterSeconds = Number(retryAfterHeader);

  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds >= 0) {
    return Maybe.just(retryAfterSeconds * 1000);
  }

  const retryAfterTimestampMilliseconds = Date.parse(retryAfterHeader);

  if (is.nan(retryAfterTimestampMilliseconds)) {
    return Maybe.nothing();
  }

  return Maybe.just(Math.max(0, retryAfterTimestampMilliseconds - currentTimeMilliseconds));
}

function readRetryAfterMilliseconds(response: Response): Maybe<number> {
  return Maybe.of(response.headers.get('retry-after')).andThen(retryAfterHeader => {
    if (!is.nonEmptyString(retryAfterHeader)) {
      return Maybe.nothing();
    }

    return parseRetryAfterHeader(retryAfterHeader, Date.now());
  });
}

function createGitHubRequestError(
  error: unknown,
  parameters: Pick<GitHubRequestParameters, 'method' | 'token'>,
): GitHubRequestFailure {
  const safeErrorDescription = describeUnknownError(error).replaceAll(parameters.token, '[REDACTED]');

  return match(error)
    .when(isHTTPError, httpError => {
      return Object.assign(new Error(`GitHub request returned HTTP ${httpError.response.status}.`, {cause: error}), {
        kind: 'github-request-failure' as const,
        method: parameters.method,
        retryAfterMilliseconds: readRetryAfterMilliseconds(httpError.response),
        statusCode: Maybe.just(httpError.response.status),
      });
    })
    .otherwise((): GitHubRequestFailure => {
      return Object.assign(
        new Error(`GitHub request failed before receiving a response: ${safeErrorDescription}`, {cause: error}),
        {
          kind: 'github-request-failure' as const,
          method: parameters.method,
          retryAfterMilliseconds: Maybe.nothing<number>(),
          statusCode: Maybe.nothing<number>(),
        },
      );
    });
}

function isAmbiguousTemporaryGitHubFailure(error: unknown): error is GitHubRequestFailure {
  if (!is.error(error)) {
    return false;
  }

  const requestFailure = error as Partial<GitHubRequestFailure>;

  if (requestFailure.kind !== 'github-request-failure' || requestFailure.method !== 'POST') {
    return false;
  }

  const statusCode = Maybe.of(requestFailure.statusCode).andThen(status => {
    return status;
  });

  return (
    statusCode.isNothing ||
    retryableGitHubHttpStatusCodes.some(retryableStatusCode => {
      return retryableStatusCode === statusCode.value;
    })
  );
}

export function createGitCommand(): GitCommand {
  return async (commandArguments: readonly string[]): Promise<string> => {
    return new Promise<string>((resolve, reject) => {
      execFile('git', [...commandArguments], {encoding: 'utf8'}, (error, standardOutput) => {
        const commandError = Maybe.of(error);

        if (commandError.isJust) {
          reject(commandError.value);
          return;
        }

        resolve(standardOutput);
      });
    });
  };
}

async function resolveCommitRangeRelationship(
  parameters: ResolveCommitRangeRelationshipParameters,
): Promise<Result<CommitRangeRelationship, Error>> {
  try {
    const tagObjectTypeResult = parseGitOutput(
      await parameters.executeGitCommand(['cat-file', '-t', `refs/tags/${parameters.tagName}`]),
      `Object type for tag ${parameters.tagName}`,
    );

    if (tagObjectTypeResult.isErr) {
      return Result.err(tagObjectTypeResult.error);
    }

    if (tagObjectTypeResult.value !== 'tag') {
      return Result.err(
        new Error(
          `Release tag ${parameters.tagName} must be an annotated tag; Git reported a ${tagObjectTypeResult.value} object.`,
        ),
      );
    }

    const tagCommitHashResult = parseFullCommitHash(
      await parameters.executeGitCommand(['rev-parse', '--verify', `refs/tags/${parameters.tagName}^{commit}`]),
      `Commit for tag ${parameters.tagName}`,
    );

    if (tagCommitHashResult.isErr) {
      return Result.err(tagCommitHashResult.error);
    }

    const mergeBaseCommitHashResult = parseFullCommitHash(
      await parameters.executeGitCommand(['merge-base', tagCommitHashResult.value, parameters.currentCommitHash]),
      `Merge base for tag ${parameters.tagName}`,
    );

    if (mergeBaseCommitHashResult.isErr) {
      return Result.err(mergeBaseCommitHashResult.error);
    }

    const commitDistanceResult = parseGitInteger(
      await parameters.executeGitCommand([
        'rev-list',
        '--count',
        `${mergeBaseCommitHashResult.value}..${parameters.currentCommitHash}`,
      ]),
      `Commit distance for tag ${parameters.tagName}`,
    );

    if (commitDistanceResult.isErr) {
      return Result.err(commitDistanceResult.error);
    }

    const tagCreatedAtResult = parseGitInteger(
      await parameters.executeGitCommand([
        'for-each-ref',
        '--format=%(taggerdate:unix)',
        `refs/tags/${parameters.tagName}`,
      ]),
      `Creation time for tag ${parameters.tagName}`,
    );

    if (tagCreatedAtResult.isErr) {
      return Result.err(tagCreatedAtResult.error);
    }

    return Result.ok({
      commitDistanceFromMergeBase: commitDistanceResult.value,
      mergeBaseCommitHash: mergeBaseCommitHashResult.value,
      tagCommitHash: tagCommitHashResult.value,
      tagCreatedAtSeconds: tagCreatedAtResult.value,
      tagName: parameters.tagName,
    });
  } catch (error: unknown) {
    return Result.err(new Error(`Unable to inspect tag ${parameters.tagName}: ${describeUnknownError(error)}`));
  }
}

async function resolveTagRelationships(
  parameters: ResolveTagRelationshipsParameters,
): Promise<TagRelationshipResolution> {
  let relationships: readonly CommitRangeRelationship[] = [];
  let failures: readonly string[] = [];

  for (const tagName of parameters.tagNames) {
    const relationshipResult = await resolveCommitRangeRelationship({
      currentCommitHash: parameters.currentCommitHash,
      executeGitCommand: parameters.executeGitCommand,
      tagName,
    });

    if (relationshipResult.isErr) {
      failures = [...failures, relationshipResult.error.message];
    } else {
      relationships = [...relationships, relationshipResult.value];
    }
  }

  return {failures, relationships};
}

async function resolveCommitRangeBetweenTags(
  parameters: ResolveCommitRangeBetweenTagsParameters,
): Promise<Result<CommitDiscoveryRange, Error>> {
  try {
    const mergeBaseCommitHashResult = parseFullCommitHash(
      await parameters.executeGitCommand([
        'merge-base',
        parameters.earlierTagRelationship.tagCommitHash,
        parameters.laterTagRelationship.tagCommitHash,
      ]),
      `Merge base for ${parameters.earlierTagRelationship.tagName} and ${parameters.laterTagRelationship.tagName}`,
    );

    if (mergeBaseCommitHashResult.isErr) {
      return Result.err(mergeBaseCommitHashResult.error);
    }

    const earlierTagIsAncestor = mergeBaseCommitHashResult.value === parameters.earlierTagRelationship.tagCommitHash;
    const mergeBaseCommitHash = earlierTagIsAncestor
      ? parameters.earlierTagRelationship.tagCommitHash
      : mergeBaseCommitHashResult.value;

    return Result.ok({
      baselineCommitHash: parameters.earlierTagRelationship.tagCommitHash,
      baselineTagName: parameters.earlierTagRelationship.tagName,
      mergeBaseCommitHash,
      revisionRange: `${mergeBaseCommitHash}..${parameters.laterTagRelationship.tagCommitHash}`,
    });
  } catch (error: unknown) {
    return Result.err(
      new Error(
        `Unable to resolve the range from ${parameters.earlierTagRelationship.tagName} to ${parameters.laterTagRelationship.tagName}: ${describeUnknownError(error)}`,
      ),
    );
  }
}

function validateReleaseTagEnvironment(
  environment: ReleaseAppearanceEnvironment,
  releaseTagName: string,
): Result<Unit, Error> {
  const isValidTag = match(environment)
    .with('beta', () => {
      return parseBetaCandidateTag(releaseTagName).isOk;
    })
    .with('production', () => {
      return isProductionReleaseTagName(releaseTagName);
    })
    .exhaustive();

  if (!isValidTag) {
    return Result.err(new Error(`Release tag ${releaseTagName} does not match the ${environment} stage.`));
  }

  return Result.ok();
}

function validateBaselineTagForEnvironment(
  parameters: ValidateBaselineTagForEnvironmentParameters,
): Result<Unit, Error> {
  if (parameters.baselineTagName === parameters.releaseTagName) {
    return Result.err(new Error('Baseline tag must not equal the deployment tag.'));
  }

  const baselineBetaCandidateTagResult = parseBetaCandidateTag(parameters.baselineTagName);
  const releaseBetaCandidateTagResult = parseBetaCandidateTag(parameters.releaseTagName);
  const isBetaBaselineForSameRelease =
    parameters.environment === 'beta' &&
    baselineBetaCandidateTagResult.isOk &&
    releaseBetaCandidateTagResult.isOk &&
    baselineBetaCandidateTagResult.value.releaseIdentifier === releaseBetaCandidateTagResult.value.releaseIdentifier;
  const isProductionBaseline = isProductionReleaseTagName(parameters.baselineTagName);

  return match({
    environment: parameters.environment,
    isBetaBaselineForSameRelease,
    isProductionBaseline,
  })
    .with({environment: 'production', isProductionBaseline: false}, () => {
      return Result.err(new Error(`Production baseline tag is invalid: ${parameters.baselineTagName}`));
    })
    .with({environment: 'beta', isBetaBaselineForSameRelease: false, isProductionBaseline: false}, () => {
      return Result.err(
        new Error(
          `Beta baseline tag must be a same-release Beta tag or a Production tag: ${parameters.baselineTagName}`,
        ),
      );
    })
    .otherwise(() => {
      return Result.ok();
    });
}

async function readReleaseTagNames(executeGitCommand: GitCommand): Promise<readonly string[]> {
  return parseGitTagNames(await executeGitCommand(['tag', '--list']));
}

async function validateCurrentReleaseTag(
  parameters: ValidateCurrentReleaseTagParameters,
): Promise<Result<ReleaseTagMetadata, Error>> {
  if (!isFullCommitHash(parameters.currentCommitHash)) {
    return Result.err(new Error(`Invalid current release commit SHA: ${parameters.currentCommitHash}`));
  }

  try {
    const tagObjectTypeResult = parseGitOutput(
      await parameters.executeGitCommand(['cat-file', '-t', `refs/tags/${parameters.releaseTagName}`]),
      `Object type for release tag ${parameters.releaseTagName}`,
    );

    if (tagObjectTypeResult.isErr) {
      return Result.err(tagObjectTypeResult.error);
    }

    if (tagObjectTypeResult.value !== 'tag') {
      return Result.err(
        new Error(
          `Release tag ${parameters.releaseTagName} must be an annotated tag; Git reported a ${tagObjectTypeResult.value} object.`,
        ),
      );
    }

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

    const releaseTagResult = parseBetaCandidateTag(parameters.releaseTagName);
    const productionTagResult = parseProductionReleaseTag(parameters.releaseTagName);
    const releaseIdentifierResult = releaseTagResult.isOk
      ? Result.ok(releaseTagResult.value.releaseIdentifier)
      : productionTagResult.isOk
        ? Result.ok(productionTagResult.value.releaseIdentifier)
        : Result.err(new Error(`Invalid release tag name: ${parameters.releaseTagName}`));

    if (releaseIdentifierResult.isErr) {
      return Result.err(releaseIdentifierResult.error);
    }

    const tagCreatedAtResult = parseGitInteger(
      await parameters.executeGitCommand([
        'for-each-ref',
        '--format=%(taggerdate:unix)',
        `refs/tags/${parameters.releaseTagName}`,
      ]),
      `Creation time for release tag ${parameters.releaseTagName}`,
    );

    if (tagCreatedAtResult.isErr) {
      return Result.err(tagCreatedAtResult.error);
    }

    return Result.ok({
      releaseIdentifier: releaseIdentifierResult.value,
      tagCommitHash: currentTagCommitHashResult.value,
      tagCreatedAtSeconds: tagCreatedAtResult.value,
      tagName: parameters.releaseTagName,
    });
  } catch (error: unknown) {
    return Result.err(new Error(`Unable to validate release tag: ${describeUnknownError(error)}`));
  }
}

async function resolveBetaCandidateRanges(
  parameters: ResolveBetaCandidateRangesParameters,
): Promise<Result<BetaCandidateHistoryResolution, Error>> {
  const currentReleaseTagValidationResult = await validateCurrentReleaseTag({
    currentCommitHash: parameters.currentCommitHash,
    executeGitCommand: parameters.executeGitCommand,
    releaseTagName: parameters.releaseTagName,
  });

  if (currentReleaseTagValidationResult.isErr) {
    return Result.err(currentReleaseTagValidationResult.error);
  }

  const currentBetaCandidateTagResult = parseBetaCandidateTag(parameters.releaseTagName);

  if (currentBetaCandidateTagResult.isErr) {
    return Result.err(currentBetaCandidateTagResult.error);
  }

  const allTagNames = await readReleaseTagNames(parameters.executeGitCommand);
  const currentReleaseBetaCandidatesResult = selectCurrentReleaseBetaCandidates(parameters.releaseTagName, allTagNames);

  if (currentReleaseBetaCandidatesResult.isErr) {
    return Result.err(currentReleaseBetaCandidatesResult.error);
  }

  if (parameters.requireFinalCandidate) {
    const currentReleaseCandidateTags = allTagNames.flatMap(tagName => {
      const betaCandidateTagResult = parseBetaCandidateTag(tagName);

      if (
        betaCandidateTagResult.isErr ||
        betaCandidateTagResult.value.releaseIdentifier !== currentBetaCandidateTagResult.value.releaseIdentifier
      ) {
        return [];
      }

      return [betaCandidateTagResult.value];
    });
    const finalCandidateTag = Maybe.of(
      currentReleaseCandidateTags.toSorted((leftCandidateTag, rightCandidateTag) => {
        return rightCandidateTag.candidateNumber - leftCandidateTag.candidateNumber;
      })[0],
    );

    if (finalCandidateTag.isJust && finalCandidateTag.value.tagName !== parameters.releaseTagName) {
      return Result.err(
        new Error(
          `Production promotion must use the final Beta candidate ${finalCandidateTag.value.tagName}, not ${parameters.releaseTagName}.`,
        ),
      );
    }
  }

  const productionTagNames = allTagNames.filter(isProductionReleaseTagName);
  const baselineTagNames = parameters.baselineTagName.isJust ? [parameters.baselineTagName.value] : productionTagNames;
  const baselineRelationshipResolution = await resolveTagRelationships({
    currentCommitHash: parameters.currentCommitHash,
    executeGitCommand: parameters.executeGitCommand,
    tagNames: baselineTagNames,
  });
  let candidateTags = currentReleaseBetaCandidatesResult.value;
  let previousProductionBaselineRelationship: Maybe<CommitRangeRelationship> = Maybe.nothing();

  if (parameters.baselineTagName.isJust) {
    const baselineTagName = parameters.baselineTagName.value;
    const baselineValidationResult = validateBaselineTagForEnvironment({
      baselineTagName,
      environment: 'beta',
      releaseTagName: parameters.releaseTagName,
    });

    if (baselineValidationResult.isErr) {
      return Result.err(baselineValidationResult.error);
    }

    if (!allTagNames.includes(baselineTagName)) {
      return Result.err(new Error(`Baseline tag does not exist: ${baselineTagName}`));
    }

    const baselineBetaCandidateTagResult = parseBetaCandidateTag(baselineTagName);

    if (
      baselineBetaCandidateTagResult.isOk &&
      baselineBetaCandidateTagResult.value.candidateNumber >= currentBetaCandidateTagResult.value.candidateNumber
    ) {
      return Result.err(new Error(`Beta baseline must precede the deployment tag: ${baselineTagName}`));
    }

    if (baselineBetaCandidateTagResult.isOk) {
      candidateTags = currentReleaseBetaCandidatesResult.value.filter(candidateTag => {
        return candidateTag.candidateNumber > baselineBetaCandidateTagResult.value.candidateNumber;
      });
    }

    const baselineRelationship = baselineRelationshipResolution.relationships.find(relationship => {
      return relationship.tagName === baselineTagName;
    });
    previousProductionBaselineRelationship = Maybe.of(baselineRelationship);

    if (previousProductionBaselineRelationship.isNothing) {
      return Result.err(new Error(`Unable to inspect tag ${baselineTagName}`));
    }
  } else {
    const previousProductionBaselineResult = selectPreviousProductionBaseline({
      currentReleaseIdentifier: currentBetaCandidateTagResult.value.releaseIdentifier,
      currentTagCreatedAtSeconds: currentReleaseTagValidationResult.value.tagCreatedAtSeconds,
      currentTagName: parameters.releaseTagName,
      productionTagRelationships: baselineRelationshipResolution.relationships,
    });

    if (previousProductionBaselineResult.isErr) {
      return Result.err(previousProductionBaselineResult.error);
    }

    if (previousProductionBaselineResult.value.kind === 'bootstrap') {
      if (
        baselineRelationshipResolution.relationships.length === 0 &&
        baselineRelationshipResolution.failures.length > 0
      ) {
        return Result.err(
          new Error(Maybe.of(baselineRelationshipResolution.failures[0]).unwrapOr('Unknown tag failure.')),
        );
      }

      return Result.ok({kind: 'bootstrap'});
    }

    previousProductionBaselineRelationship = Maybe.just(previousProductionBaselineResult.value.relationship);
  }

  const betaTagRelationships = await resolveTagRelationships({
    currentCommitHash: parameters.currentCommitHash,
    executeGitCommand: parameters.executeGitCommand,
    tagNames: candidateTags.map(candidateTag => {
      return candidateTag.tagName;
    }),
  });

  if (betaTagRelationships.failures.length > 0) {
    return Result.err(new Error(Maybe.of(betaTagRelationships.failures[0]).unwrapOr('Unknown Beta tag failure.')));
  }

  if (previousProductionBaselineRelationship.isNothing) {
    return Result.err(new Error('Unable to select the preceding Production baseline.'));
  }

  let earlierTagRelationship = previousProductionBaselineRelationship.value;
  let candidateRanges: readonly BetaCandidateDiscoveryRange[] = [];

  for (const candidateTag of candidateTags) {
    const candidateTagRelationship = Maybe.of(
      betaTagRelationships.relationships.find(relationship => {
        return relationship.tagName === candidateTag.tagName;
      }),
    );

    if (candidateTagRelationship.isNothing) {
      return Result.err(new Error(`Missing commit relationship for Beta candidate tag: ${candidateTag.tagName}`));
    }

    const candidateRangeResult = await resolveCommitRangeBetweenTags({
      earlierTagRelationship,
      executeGitCommand: parameters.executeGitCommand,
      laterTagRelationship: candidateTagRelationship.value,
    });

    if (candidateRangeResult.isErr) {
      return Result.err(candidateRangeResult.error);
    }

    candidateRanges = [
      ...candidateRanges,
      {
        candidateTag,
        candidateCommitHash: candidateTagRelationship.value.tagCommitHash,
        range: candidateRangeResult.value,
      },
    ];
    earlierTagRelationship = candidateTagRelationship.value;
  }

  return Result.ok({
    kind: 'history',
    history: {
      baselineRelationshipFailures: baselineRelationshipResolution.failures,
      candidateRanges,
      discovery: {
        commitFailures: [],
        commitsInspected: [],
        commitsWithoutPullRequests: [],
        pullRequestNumbers: [],
      },
      earliestCandidateTagByPullRequest: new Map<number, string>(),
    },
  });
}

export async function resolveReleaseAppearanceRange(
  parameters: ResolveReleaseAppearanceRangeParameters,
): Promise<Result<ReleaseAppearanceRangeResolution, Error>> {
  const releaseTagEnvironmentValidationResult = validateReleaseTagEnvironment(
    parameters.environment,
    parameters.releaseTagName,
  );

  if (releaseTagEnvironmentValidationResult.isErr) {
    return Result.err(releaseTagEnvironmentValidationResult.error);
  }

  const currentReleaseTagValidationResult = await validateCurrentReleaseTag(parameters);

  if (currentReleaseTagValidationResult.isErr) {
    return Result.err(currentReleaseTagValidationResult.error);
  }

  const currentReleaseTagMetadata = currentReleaseTagValidationResult.value;

  const allTagNames = await readReleaseTagNames(parameters.executeGitCommand);
  const productionTagNames = allTagNames.filter(isProductionReleaseTagName);

  if (parameters.baselineTagName.isJust) {
    const baselineTagName = parameters.baselineTagName.value;
    const baselineValidationResult = validateBaselineTagForEnvironment({
      baselineTagName,
      environment: parameters.environment,
      releaseTagName: parameters.releaseTagName,
    });

    if (baselineValidationResult.isErr) {
      return Result.err(baselineValidationResult.error);
    }

    if (!allTagNames.includes(baselineTagName)) {
      return Result.err(new Error(`Baseline tag does not exist: ${baselineTagName}`));
    }

    const baselineRelationshipResolution = await resolveTagRelationships({
      currentCommitHash: parameters.currentCommitHash,
      executeGitCommand: parameters.executeGitCommand,
      tagNames: [baselineTagName],
    });

    const baselineRelationship = Maybe.of(baselineRelationshipResolution.relationships[0]);

    if (baselineRelationship.isNothing) {
      return Result.err(
        new Error(
          Maybe.of(baselineRelationshipResolution.failures[0]).unwrapOr(
            `Unable to validate baseline tag: ${baselineTagName}`,
          ),
        ),
      );
    }

    if (baselineRelationship.value.tagCommitHash === parameters.currentCommitHash) {
      return Result.err(new Error('Baseline tag must not point to the deployment commit.'));
    }

    return Result.ok({
      kind: 'range',
      resolvedRange: {
        baselineRelationshipFailures: baselineRelationshipResolution.failures,
        range: {
          baselineCommitHash: baselineRelationship.value.tagCommitHash,
          baselineTagName: baselineRelationship.value.tagName,
          mergeBaseCommitHash: baselineRelationship.value.mergeBaseCommitHash,
          revisionRange: `${baselineRelationship.value.mergeBaseCommitHash}..${parameters.currentCommitHash}`,
        },
      },
    });
  }

  if (parameters.environment === 'production') {
    const productionRelationshipResolution = await resolveTagRelationships({
      currentCommitHash: parameters.currentCommitHash,
      executeGitCommand: parameters.executeGitCommand,
      tagNames: productionTagNames,
    });
    const rangeResult = selectProductionDiscoveryRange({
      currentCommitHash: parameters.currentCommitHash,
      currentProductionTagCreatedAtSeconds: currentReleaseTagMetadata.tagCreatedAtSeconds,
      currentProductionTagName: parameters.releaseTagName,
      productionTagRelationships: productionRelationshipResolution.relationships,
    });

    if (rangeResult.isErr) {
      return Result.err(rangeResult.error);
    }

    if (rangeResult.value.kind === 'bootstrap') {
      return Result.ok({kind: 'bootstrap'});
    }

    return Result.ok({
      kind: 'range',
      resolvedRange: {
        baselineRelationshipFailures: productionRelationshipResolution.failures,
        range: rangeResult.value.range,
      },
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
      ? await resolveTagRelationships({
          currentCommitHash: parameters.currentCommitHash,
          executeGitCommand: parameters.executeGitCommand,
          tagNames: betaTagNames,
        })
      : {failures: [], relationships: []};
  const productionRelationshipResolution =
    currentBetaCandidateTagResult.value.candidateNumber === 1
      ? await resolveTagRelationships({
          currentCommitHash: parameters.currentCommitHash,
          executeGitCommand: parameters.executeGitCommand,
          tagNames: productionTagNames,
        })
      : {failures: [], relationships: []};
  const rangeResult = selectBetaDiscoveryRange({
    betaTagRelationships: betaRelationshipResolution.relationships,
    currentBetaTagName: parameters.releaseTagName,
    currentBetaTagCreatedAtSeconds: currentReleaseTagMetadata.tagCreatedAtSeconds,
    currentCommitHash: parameters.currentCommitHash,
    existingBetaTagNames: betaTagNames,
    productionTagRelationships: productionRelationshipResolution.relationships,
  });

  if (rangeResult.isErr) {
    return Result.err(rangeResult.error);
  }

  if (rangeResult.value.kind === 'bootstrap') {
    return Result.ok({kind: 'bootstrap'});
  }

  return Result.ok({
    kind: 'range',
    resolvedRange: {
      baselineRelationshipFailures: [
        ...betaRelationshipResolution.failures,
        ...productionRelationshipResolution.failures,
      ],
      range: rangeResult.value.range,
    },
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

        const supportedPullRequests = pullRequestPage.items.filter(associatedPullRequest => {
          return isSupportedPullRequestTargetBranch(associatedPullRequest.targetBranchName);
        });
        associatedPullRequestCount += supportedPullRequests.length;

        for (const associatedPullRequest of supportedPullRequests) {
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

  return {
    commitFailures,
    commitsInspected,
    commitsWithoutPullRequests,
    pullRequestNumbers: pullRequestNumbers.toSorted((leftPullRequestNumber, rightPullRequestNumber) => {
      return leftPullRequestNumber - rightPullRequestNumber;
    }),
  };
}

export async function discoverBetaCandidateHistory(
  parameters: DiscoverBetaCandidateHistoryParameters,
): Promise<Result<BetaCandidateHistoryResolution, Error>> {
  const candidateRangesResult = await resolveBetaCandidateRanges({
    baselineTagName: parameters.baselineTagName,
    currentCommitHash: parameters.currentCommitHash,
    executeGitCommand: parameters.executeGitCommand,
    requireFinalCandidate: parameters.requireFinalCandidate,
    releaseTagName: parameters.releaseTagName,
  });

  if (candidateRangesResult.isErr) {
    return Result.err(candidateRangesResult.error);
  }

  if (candidateRangesResult.value.kind === 'bootstrap') {
    return Result.ok({kind: 'bootstrap'});
  }

  let discovery: PullRequestDiscoveryResult = {
    commitFailures: [],
    commitsInspected: [],
    commitsWithoutPullRequests: [],
    pullRequestNumbers: [],
  };
  let earliestCandidateTagByPullRequest = new Map<number, string>();

  for (const candidateRange of candidateRangesResult.value.history.candidateRanges) {
    const candidateDiscovery = await discoverPullRequestsInRange({
      executeGitCommand: parameters.executeGitCommand,
      githubClient: parameters.githubClient,
      range: candidateRange.range,
    });

    discovery = {
      commitFailures: [...discovery.commitFailures, ...candidateDiscovery.commitFailures],
      commitsInspected: [...discovery.commitsInspected, ...candidateDiscovery.commitsInspected],
      commitsWithoutPullRequests: [
        ...discovery.commitsWithoutPullRequests,
        ...candidateDiscovery.commitsWithoutPullRequests,
      ],
      pullRequestNumbers: [
        ...new Set([...discovery.pullRequestNumbers, ...candidateDiscovery.pullRequestNumbers]),
      ].toSorted((leftPullRequestNumber, rightPullRequestNumber) => {
        return leftPullRequestNumber - rightPullRequestNumber;
      }),
    };

    for (const pullRequestNumber of candidateDiscovery.pullRequestNumbers) {
      if (!earliestCandidateTagByPullRequest.has(pullRequestNumber)) {
        earliestCandidateTagByPullRequest = new Map(earliestCandidateTagByPullRequest).set(
          pullRequestNumber,
          candidateRange.candidateTag.tagName,
        );
      }
    }
  }

  return Result.ok({
    kind: 'history',
    history: {
      baselineRelationshipFailures: candidateRangesResult.value.history.baselineRelationshipFailures,
      candidateRanges: candidateRangesResult.value.history.candidateRanges,
      discovery,
      earliestCandidateTagByPullRequest,
    },
  });
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

async function waitForAmbiguousCommentCreateRetry(delayMilliseconds: number): Promise<void> {
  await new Promise<void>(resolve => {
    setTimeout((): void => {
      resolve();
    }, delayMilliseconds);
  });
}

async function createCommentWithReconciliation(parameters: ApplyPreparedCommentParameters): Promise<void> {
  for (let attemptNumber = 1; attemptNumber <= maximumAmbiguousCommentCreateAttempts; attemptNumber += 1) {
    try {
      await parameters.githubClient.createIssueComment(parameters.pullRequestNumber, parameters.preparedComment.body);
      return;
    } catch (error: unknown) {
      if (!isAmbiguousTemporaryGitHubFailure(error)) {
        throw error;
      }

      const comments = await readAllIssueComments({
        githubClient: parameters.githubClient,
        pullRequestNumber: parameters.pullRequestNumber,
      });
      const verificationResult = verifyReleaseAppearanceCommentState({
        comments,
        commentMode: parameters.commentMode,
        desiredState: parameters.desiredState,
      });

      if (verificationResult.isErr) {
        throw verificationResult.error;
      }

      if (verificationResult.value.kind === 'matches') {
        return;
      }

      if (verificationResult.value.kind === 'mismatch') {
        throw new Error('Ambiguous comment creation found a marker comment with unexpected state.');
      }

      if (attemptNumber === maximumAmbiguousCommentCreateAttempts) {
        throw new Error('Ambiguous comment creation did not produce a marker comment after bounded retries.');
      }

      await waitForAmbiguousCommentCreateRetry(
        error.retryAfterMilliseconds.unwrapOr(initialGitHubRetryDelayMilliseconds),
      );
    }
  }
}

async function applyPreparedComment(parameters: ApplyPreparedCommentParameters): Promise<void> {
  const preparedComment = parameters.preparedComment;

  return match(preparedComment)
    .with({action: 'create'}, async (): Promise<void> => {
      await createCommentWithReconciliation(parameters);
    })
    .with({action: 'update'}, async ({body, commentId}): Promise<void> => {
      await parameters.githubClient.updateIssueComment(commentId, body);
    })
    .with({action: 'unchanged'}, (): Promise<void> => {
      return Promise.resolve();
    })
    .exhaustive();
}

function createCommentProcessingPlan(
  pullRequestNumber: number,
  preparedComment: PreparedReleaseAppearanceComment,
): CommentProcessingPlan {
  return match(preparedComment)
    .with({action: 'create'}, ({action, body}) => {
      return {action, body, commentId: Maybe.nothing<number>(), pullRequestNumber};
    })
    .with({action: P.union('update', 'unchanged')}, ({action, body, commentId}) => {
      return {action, body, commentId: Maybe.just(commentId), pullRequestNumber};
    })
    .exhaustive();
}

async function validateSinglePullRequest(pullRequestNumber: number, githubClient: GitHubClient): Promise<void> {
  if (!is.integer(pullRequestNumber) || pullRequestNumber < 1) {
    throw new Error(`Pull request number must be a positive integer: ${pullRequestNumber}`);
  }

  const pullRequest = await githubClient.getPullRequest(pullRequestNumber);

  if (pullRequest.pullRequestNumber !== pullRequestNumber) {
    throw new Error(
      `GitHub returned pull request #${pullRequest.pullRequestNumber} for requested #${pullRequestNumber}.`,
    );
  }

  if (pullRequest.isLocked) {
    throw new Error(`Pull request #${pullRequestNumber} is locked and cannot receive a test comment.`);
  }

  if (!pullRequest.isMerged) {
    throw new Error(`Pull request #${pullRequestNumber} is not merged and cannot receive a test comment.`);
  }

  if (!isSupportedPullRequestTargetBranch(pullRequest.targetBranchName)) {
    throw new Error(`Pull request #${pullRequestNumber} targets unsupported branch ${pullRequest.targetBranchName}.`);
  }
}

export async function processPullRequestsSequentially(
  parameters: ProcessPullRequestsSequentiallyParameters,
): Promise<CommentProcessingResult> {
  const commentMode = Maybe.of(parameters.commentMode).unwrapOr('production');
  const dryRun = Maybe.of(parameters.dryRun).unwrapOr(false);
  const firstAppearanceTagNames = Maybe.of(parameters.firstAppearanceTagNames).andThen(tagNames => {
    return tagNames;
  });
  let createdPullRequestNumbers: readonly number[] = [];
  let unchangedPullRequestNumbers: readonly number[] = [];
  let updatedPullRequestNumbers: readonly number[] = [];
  let failedPullRequests: readonly string[] = [];
  let plans: readonly CommentProcessingPlan[] = [];

  for (const pullRequestNumber of parameters.pullRequestNumbers) {
    try {
      const comments = await readAllIssueComments({
        githubClient: parameters.githubClient,
        pullRequestNumber,
      });
      const betaAppearanceTagName = firstAppearanceTagNames.andThen(tagNames => {
        return Maybe.of(tagNames.get(pullRequestNumber));
      });
      const desiredBetaTagName =
        parameters.environment === 'beta'
          ? Maybe.just(betaAppearanceTagName.unwrapOr(parameters.currentReleaseTagName))
          : betaAppearanceTagName;

      if (parameters.environment === 'production' && commentMode !== 'test' && desiredBetaTagName.isNothing) {
        throw new Error(`Pull request #${pullRequestNumber} has no provable Beta appearance in the promoted artifact.`);
      }

      const desiredState: DesiredReleaseAppearanceCommentState = {
        beta: desiredBetaTagName.map(tagName => {
          return {tagName, workflowRunUrl: parameters.workflowRunUrl};
        }),
        production:
          parameters.environment === 'production'
            ? Maybe.just({tagName: parameters.currentReleaseTagName, workflowRunUrl: parameters.workflowRunUrl})
            : Maybe.nothing(),
      };
      const preparedCommentResult = prepareReleaseAppearanceCommentWithDesiredState({
        comments,
        commentMode,
        desiredState,
      });

      if (preparedCommentResult.isErr) {
        throw preparedCommentResult.error;
      }

      const preparedComment = preparedCommentResult.value;
      if (!dryRun) {
        await applyPreparedComment({
          commentMode,
          desiredState,
          githubClient: parameters.githubClient,
          preparedComment,
          pullRequestNumber,
        });
      }

      plans = [...plans, createCommentProcessingPlan(pullRequestNumber, preparedComment)];

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
    plans,
    unchangedPullRequestNumbers,
    updatedPullRequestNumbers,
  };
}

export function renderReleaseAppearanceSummary(parameters: ReleaseAppearanceSummaryParameters): string {
  const betaCandidateHistory =
    parameters.resolution.kind === 'history'
      ? Maybe.just(parameters.resolution.history)
      : Maybe.nothing<BetaCandidateHistory>();
  const resolvedRange =
    parameters.resolution.kind === 'range'
      ? Maybe.just(parameters.resolution.resolvedRange)
      : betaCandidateHistory.andThen(history => {
          return Maybe.of(history.candidateRanges[0]).map(candidateRange => {
            return {
              baselineRelationshipFailures: history.baselineRelationshipFailures,
              range: candidateRange.range,
            };
          });
        });
  const selectedBaselineTagName = resolvedRange
    .map(resolvedAppearanceRange => {
      return resolvedAppearanceRange.range.baselineTagName;
    })
    .unwrapOr('Not selected');
  const selectedMergeBaseCommitHash = resolvedRange
    .map(resolvedAppearanceRange => {
      return resolvedAppearanceRange.range.mergeBaseCommitHash;
    })
    .unwrapOr('Not selected');
  const selectedRevisionRange = resolvedRange
    .map(resolvedAppearanceRange => {
      return resolvedAppearanceRange.range.revisionRange;
    })
    .unwrapOr('Not selected');
  const baselineRelationshipFailures =
    parameters.resolution.kind === 'history'
      ? parameters.resolution.history.baselineRelationshipFailures
      : resolvedRange
          .map(resolvedAppearanceRange => {
            return resolvedAppearanceRange.baselineRelationshipFailures;
          })
          .unwrapOr([]);
  const lines = [
    '### First appeared in comment processing',
    '',
    ...(parameters.resolution.kind === 'bootstrap'
      ? [
          '- Bootstrap release: no preceding ADR 0002 Production baseline exists; no pull request discovery or writes were performed.',
        ]
      : []),
    `- Mode: ${parameters.dryRun === true ? 'dry-run' : 'write'}`,
    `- Comment marker: \`${getReleaseAppearanceCommentMarker(Maybe.of(parameters.commentMode).unwrapOr('production'))}\``,
    `- Environment: ${parameters.environment === 'beta' ? 'Beta' : 'Production'}`,
    `- Release tag: \`${parameters.releaseTagName}\``,
    `- Baseline tag: \`${selectedBaselineTagName}\``,
    `- Merge base: \`${selectedMergeBaseCommitHash}\``,
    `- Revision range: \`${selectedRevisionRange}\``,
    ...(parameters.resolution.kind === 'history'
      ? [`- Beta candidate ranges reconstructed: ${parameters.resolution.history.candidateRanges.length}`]
      : []),
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

  if (baselineRelationshipFailures.length > 0) {
    lines.push('', 'Baseline candidates that could not be inspected:');
    for (const baselineRelationshipFailure of baselineRelationshipFailures) {
      lines.push(`- ${baselineRelationshipFailure}`);
    }
  }

  lines.push('', 'Proposed comment states:');

  if (parameters.commentProcessing.plans.length === 0) {
    lines.push('- None');
  } else {
    for (const plan of parameters.commentProcessing.plans) {
      lines.push(
        '',
        `<details><summary>Pull request #${plan.pullRequestNumber}: ${plan.action}</summary>`,
        '',
        '```markdown',
      );
      lines.push(plan.body);
      lines.push('```', '', '</details>');
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

type ReleaseAppearanceDiscovery = {
  readonly discovery: PullRequestDiscoveryResult;
  readonly firstAppearanceTagNames: Maybe<ReadonlyMap<number, string>>;
  readonly resolution: ReleaseAppearanceDiscoveryResolution;
};

type ResolveReleaseAppearanceDiscoveryParameters = {
  readonly commentMode: ReleaseAppearanceCommentMode;
  readonly releaseAppearanceDependencies: Pick<ReleaseAppearanceDependencies, 'executeGitCommand' | 'githubClient'>;
  readonly releaseAppearanceParameters: ReleaseAppearanceRunParameters;
};

async function resolveReleaseAppearanceDiscovery(
  parameters: ResolveReleaseAppearanceDiscoveryParameters,
): Promise<ReleaseAppearanceDiscovery> {
  return match(parameters.commentMode)
    .with('test', async () => {
      const selectedPullRequestNumber = parameters.releaseAppearanceParameters.pullRequestNumber;

      if (selectedPullRequestNumber.isNothing) {
        throw new Error('Test comment mode requires a pull request number.');
      }

      const pullRequestNumber = selectedPullRequestNumber.value;

      const releaseTagValidationResult = validateReleaseTagEnvironment(
        parameters.releaseAppearanceParameters.environment,
        parameters.releaseAppearanceParameters.releaseTagName,
      );

      if (releaseTagValidationResult.isErr) {
        throw releaseTagValidationResult.error;
      }

      const currentReleaseTagValidationResult = await validateCurrentReleaseTag({
        currentCommitHash: parameters.releaseAppearanceParameters.currentCommitHash,
        executeGitCommand: parameters.releaseAppearanceDependencies.executeGitCommand,
        releaseTagName: parameters.releaseAppearanceParameters.releaseTagName,
      });

      if (currentReleaseTagValidationResult.isErr) {
        throw currentReleaseTagValidationResult.error;
      }

      await validateSinglePullRequest(pullRequestNumber, parameters.releaseAppearanceDependencies.githubClient);

      return {
        discovery: {
          commitFailures: [],
          commitsInspected: [],
          commitsWithoutPullRequests: [],
          pullRequestNumbers: [pullRequestNumber],
        },
        firstAppearanceTagNames: Maybe.nothing<ReadonlyMap<number, string>>(),
        resolution: {kind: 'test' as const},
      };
    })
    .with('production', async () => {
      const releaseAppearanceParameters = parameters.releaseAppearanceParameters;

      if (releaseAppearanceParameters.environment === 'beta' && releaseAppearanceParameters.baselineTagName.isNothing) {
        const betaCandidateHistoryResult = await discoverBetaCandidateHistory({
          baselineTagName: Maybe.nothing<string>(),
          currentCommitHash: releaseAppearanceParameters.currentCommitHash,
          executeGitCommand: parameters.releaseAppearanceDependencies.executeGitCommand,
          githubClient: parameters.releaseAppearanceDependencies.githubClient,
          requireFinalCandidate: false,
          releaseTagName: releaseAppearanceParameters.releaseTagName,
        });

        if (betaCandidateHistoryResult.isErr) {
          throw betaCandidateHistoryResult.error;
        }

        if (betaCandidateHistoryResult.value.kind === 'bootstrap') {
          return {
            discovery: {
              commitFailures: [],
              commitsInspected: [],
              commitsWithoutPullRequests: [],
              pullRequestNumbers: [],
            },
            firstAppearanceTagNames: Maybe.nothing<ReadonlyMap<number, string>>(),
            resolution: {kind: 'bootstrap' as const},
          };
        }

        return {
          discovery: betaCandidateHistoryResult.value.history.discovery,
          firstAppearanceTagNames: Maybe.just(
            betaCandidateHistoryResult.value.history.earliestCandidateTagByPullRequest,
          ),
          resolution: betaCandidateHistoryResult.value,
        };
      }

      const rangeResult = await resolveReleaseAppearanceRange({
        baselineTagName: releaseAppearanceParameters.baselineTagName,
        currentCommitHash: releaseAppearanceParameters.currentCommitHash,
        environment: releaseAppearanceParameters.environment,
        executeGitCommand: parameters.releaseAppearanceDependencies.executeGitCommand,
        releaseTagName: releaseAppearanceParameters.releaseTagName,
      });

      if (rangeResult.isErr) {
        throw rangeResult.error;
      }

      if (rangeResult.value.kind === 'bootstrap') {
        return {
          discovery: {
            commitFailures: [],
            commitsInspected: [],
            commitsWithoutPullRequests: [],
            pullRequestNumbers: [],
          },
          firstAppearanceTagNames: Maybe.nothing<ReadonlyMap<number, string>>(),
          resolution: {kind: 'bootstrap' as const},
        };
      }

      if (releaseAppearanceParameters.environment === 'production') {
        if (releaseAppearanceParameters.currentBetaTagName.isNothing) {
          throw new Error('Production comment processing requires the promoted Beta tag.');
        }

        const betaCandidateHistoryResult = await discoverBetaCandidateHistory({
          baselineTagName: releaseAppearanceParameters.baselineTagName,
          currentCommitHash: releaseAppearanceParameters.currentCommitHash,
          executeGitCommand: parameters.releaseAppearanceDependencies.executeGitCommand,
          githubClient: parameters.releaseAppearanceDependencies.githubClient,
          requireFinalCandidate: true,
          releaseTagName: releaseAppearanceParameters.currentBetaTagName.value,
        });

        if (betaCandidateHistoryResult.isErr) {
          throw betaCandidateHistoryResult.error;
        }

        if (betaCandidateHistoryResult.value.kind === 'bootstrap') {
          throw new Error('Production promotion requires a preceding Beta candidate history.');
        }

        return {
          discovery: betaCandidateHistoryResult.value.history.discovery,
          firstAppearanceTagNames: Maybe.just(
            betaCandidateHistoryResult.value.history.earliestCandidateTagByPullRequest,
          ),
          resolution: betaCandidateHistoryResult.value,
        };
      }

      const discovery = await discoverPullRequestsInRange({
        executeGitCommand: parameters.releaseAppearanceDependencies.executeGitCommand,
        githubClient: parameters.releaseAppearanceDependencies.githubClient,
        range: rangeResult.value.resolvedRange.range,
      });
      const firstAppearanceTagNames =
        releaseAppearanceParameters.environment === 'beta'
          ? Maybe.just(
              new Map(
                discovery.pullRequestNumbers.map(pullRequestNumber => {
                  return [pullRequestNumber, releaseAppearanceParameters.releaseTagName] as const;
                }),
              ),
            )
          : Maybe.nothing<ReadonlyMap<number, string>>();

      return {
        discovery,
        firstAppearanceTagNames,
        resolution: {
          kind: 'range' as const,
          resolvedRange: rangeResult.value.resolvedRange,
        },
      };
    })
    .exhaustive();
}

export async function runReleaseAppearance(
  parameters: ReleaseAppearanceRunParameters,
  dependencies: ReleaseAppearanceDependencies,
): Promise<number> {
  try {
    const commentMode = parameters.commentMode.unwrapOr('production');
    const dryRun = parameters.dryRun.unwrapOr(false);

    if (commentMode === 'test' && parameters.pullRequestNumber.isNothing) {
      throw new Error('Test comment mode requires a pull request number.');
    }

    if (commentMode === 'production' && parameters.pullRequestNumber.isJust) {
      throw new Error('Production comment mode cannot force a single pull request.');
    }

    if (commentMode === 'test' && parameters.baselineTagName.isJust) {
      throw new Error('Test comment mode cannot select a release baseline.');
    }

    const {discovery, firstAppearanceTagNames, resolution} = await resolveReleaseAppearanceDiscovery({
      commentMode,
      releaseAppearanceDependencies: dependencies,
      releaseAppearanceParameters: parameters,
    });

    const commentProcessing = await processPullRequestsSequentially({
      commentMode,
      currentReleaseTagName: parameters.releaseTagName,
      dryRun,
      environment: parameters.environment,
      firstAppearanceTagNames,
      githubClient: dependencies.githubClient,
      pullRequestNumbers: discovery.pullRequestNumbers,
      workflowRunUrl: parameters.workflowRunUrl,
      writeError: dependencies.writeError,
      writeOutput: dependencies.writeOutput,
    });
    const summary = renderReleaseAppearanceSummary({
      commentMode,
      commentProcessing,
      discovery,
      dryRun,
      environment: parameters.environment,
      resolution,
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
    throw createGitHubRequestError(error, parameters);
  }

  let responseBody: unknown;

  try {
    responseBody = JSON.parse(await response.text()) as unknown;
  } catch (error: unknown) {
    throw new Error(`GitHub response was not valid JSON: ${describeUnknownError(error)}`, {cause: error});
  }

  const hasNextPage = Maybe.of(response.headers.get('link'))
    .map(linkHeader => {
      return is.nonEmptyString(linkHeader) && /<[^>]+>;\s*rel="next"/u.test(linkHeader);
    })
    .unwrapOr(false);

  return {hasNextPage, responseBody};
}

function parseAssociatedPullRequest(value: unknown, itemIndex: number): Result<Maybe<AssociatedPullRequest>, Error> {
  if (
    !is.plainObject(value) ||
    !is.integer(value.number) ||
    value.number < 1 ||
    !is.plainObject(value.base) ||
    !is.nonEmptyString(value.base.ref)
  ) {
    return Result.err(new Error(`Associated pull request at index ${itemIndex} has an invalid number.`));
  }

  const mergedAt = Maybe.of(value.merged_at);

  if (mergedAt.isJust && !is.nonEmptyString(mergedAt.value)) {
    return Result.err(new Error(`Associated pull request at index ${itemIndex} has invalid merge metadata.`));
  }

  return Result.ok(
    mergedAt.isJust ? Maybe.just({pullRequestNumber: value.number, targetBranchName: value.base.ref}) : Maybe.nothing(),
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

function parseGitHubPullRequest(responseBody: unknown): Result<GitHubPullRequest, Error> {
  if (
    !is.plainObject(responseBody) ||
    !is.integer(responseBody.number) ||
    responseBody.number < 1 ||
    !is.boolean(responseBody.locked) ||
    !is.plainObject(responseBody.base) ||
    !is.nonEmptyString(responseBody.base.ref)
  ) {
    return Result.err(new Error('GitHub pull request response had invalid fields.'));
  }

  const mergedAt = Maybe.of(responseBody.merged_at);

  if (mergedAt.isJust && !is.nonEmptyString(mergedAt.value)) {
    return Result.err(new Error('GitHub pull request response had invalid merge metadata.'));
  }

  return Result.ok({
    isLocked: responseBody.locked,
    isMerged: mergedAt.isJust,
    pullRequestNumber: responseBody.number,
    targetBranchName: responseBody.base.ref,
  });
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
  const retryDelay = Maybe.of(parameters.retryDelay).unwrapOr((retryAttemptNumber: number): number => {
    return initialGitHubRetryDelayMilliseconds * 2 ** (retryAttemptNumber - 1);
  });
  const githubRequest = ky.create({
    fetch: parameters.fetchFunction,
    retry: {
      afterStatusCodes: [429, 503],
      delay: retryDelay,
      limit: maximumGitHubRetryCount,
      methods: [...retryableGitHubRequestMethods],
      statusCodes: [...retryableGitHubHttpStatusCodes],
    },
  });

  return Result.ok({
    async createIssueComment(pullRequestNumber: number, body: string): Promise<void> {
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
    async listIssueComments(
      pullRequestNumber: number,
      pageNumber: number,
    ): Promise<GitHubPage<ReleaseAppearanceComment>> {
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
    async listPullRequestsAssociatedWithCommit(
      commitHash: string,
      pageNumber: number,
    ): Promise<GitHubPage<AssociatedPullRequest>> {
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
    async getPullRequest(pullRequestNumber: number): Promise<GitHubPullRequest> {
      const response = await requestGitHubJson({
        apiUrl: parameters.apiUrl,
        githubRequest,
        method: 'GET',
        requestPath: `${repositoryPath}/pulls/${pullRequestNumber}`,
        token: parameters.token,
      });
      const pullRequestResult = parseGitHubPullRequest(response.responseBody);

      if (pullRequestResult.isErr) {
        throw new Error(`GitHub pull request response was invalid: ${pullRequestResult.error.message}`);
      }

      return pullRequestResult.value;
    },
    async updateIssueComment(commentId: number, body: string): Promise<void> {
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

const releaseAppearanceUsageText = [
  'Usage: releaseAppearanceCli.ts <beta|production> <release-tag-name> <release-commit-sha> <workflow-run-url> [options]',
  'Options:',
  '  --dry-run',
  '  --baseline-tag <existing-baseline-tag>',
  '  --beta-tag <promoted-beta-tag>',
  '  --pull-request-number <positive-integer>',
  '  --comment-mode <production|test>',
].join('\n');

export function parseReleaseAppearanceArguments(
  commandLineArguments: readonly string[],
): Result<ReleaseAppearanceRunParameters, Error> {
  const [environmentName, releaseTagName, currentCommitHash, workflowRunUrl, ...optionArguments] = commandLineArguments;

  if (
    (environmentName !== 'beta' && environmentName !== 'production') ||
    !is.nonEmptyString(releaseTagName) ||
    !is.nonEmptyString(currentCommitHash) ||
    !is.nonEmptyString(workflowRunUrl)
  ) {
    return Result.err(new Error(releaseAppearanceUsageText));
  }

  let baselineTagName: Maybe<string> = Maybe.nothing();
  let currentBetaTagName: Maybe<string> = Maybe.nothing();
  let commentMode: ReleaseAppearanceCommentMode = 'production';
  let commentModeOptionProvided = false;
  let dryRun = false;
  let pullRequestNumber: Maybe<number> = Maybe.nothing();

  for (let optionIndex = 0; optionIndex < optionArguments.length; optionIndex += 1) {
    const optionName = Maybe.of(optionArguments[optionIndex]);

    if (optionName.isNothing) {
      return Result.err(new Error(`Missing option name at index ${optionIndex}.`));
    }

    const optionNameValue = optionName.value;

    if (optionNameValue === '--dry-run') {
      if (dryRun) {
        return Result.err(new Error('The --dry-run option must not be repeated.'));
      }

      dryRun = true;
      continue;
    }

    if (
      optionNameValue === '--baseline-tag' ||
      optionNameValue === '--beta-tag' ||
      optionNameValue === '--pull-request-number' ||
      optionNameValue === '--comment-mode'
    ) {
      const optionValueResult = Maybe.of(optionArguments[optionIndex + 1]);

      if (
        optionValueResult.isNothing ||
        optionValueResult.value.startsWith('--') ||
        optionValueResult.value.length === 0
      ) {
        return Result.err(new Error(`Option ${optionNameValue} requires a non-empty value.`));
      }

      optionIndex += 1;
      const optionValue = optionValueResult.value;

      if (optionNameValue === '--baseline-tag') {
        if (baselineTagName.isJust) {
          return Result.err(new Error('The --baseline-tag option must not be repeated.'));
        }

        baselineTagName = Maybe.just(optionValue);
        continue;
      }

      if (optionNameValue === '--beta-tag') {
        if (currentBetaTagName.isJust) {
          return Result.err(new Error('The --beta-tag option must not be repeated.'));
        }

        currentBetaTagName = Maybe.just(optionValue);
        continue;
      }

      if (optionNameValue === '--pull-request-number') {
        if (pullRequestNumber.isJust || !/^\d+$/u.test(optionValue)) {
          return Result.err(new Error(`Invalid pull request number: ${optionValue}`));
        }

        const parsedPullRequestNumber = Number(optionValue);

        if (!is.integer(parsedPullRequestNumber) || parsedPullRequestNumber < 1) {
          return Result.err(new Error(`Invalid pull request number: ${optionValue}`));
        }

        pullRequestNumber = Maybe.just(parsedPullRequestNumber);
        continue;
      }

      if (optionValue !== 'production' && optionValue !== 'test') {
        return Result.err(new Error(`Invalid comment mode: ${optionValue}`));
      }

      if (commentModeOptionProvided) {
        return Result.err(new Error('The --comment-mode option must not be repeated.'));
      }

      commentModeOptionProvided = true;
      commentMode = optionValue;
      continue;
    }

    return Result.err(
      new Error(`Unknown release appearance option: ${optionNameValue}\n${releaseAppearanceUsageText}`),
    );
  }

  if (commentMode === 'test' && pullRequestNumber.isNothing) {
    return Result.err(new Error('Test comment mode requires --pull-request-number.'));
  }

  if (commentMode === 'production' && pullRequestNumber.isJust) {
    return Result.err(new Error('Production comment mode cannot use --pull-request-number.'));
  }

  if (commentMode === 'test' && baselineTagName.isJust) {
    return Result.err(new Error('Test comment mode cannot use --baseline-tag.'));
  }

  if (environmentName === 'beta' && currentBetaTagName.isJust) {
    return Result.err(new Error('Beta comment processing cannot use --beta-tag.'));
  }

  return Result.ok({
    baselineTagName,
    commentMode: Maybe.just(commentMode),
    currentBetaTagName,
    currentCommitHash,
    dryRun: Maybe.just(dryRun),
    environment: environmentName,
    pullRequestNumber,
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

if (process.argv[1]?.endsWith('releaseAppearanceCli.ts')) {
  void main();
}
