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

import {Maybe, Unit} from 'true-myth';
import {match} from 'ts-pattern';

import {
  mergeReleaseAppearanceComments,
  parsePersistentMarkerComment,
  renderPersistentComment,
} from './releaseAppearance.ts';
import type {ReleaseAppearanceState} from './releaseAppearance.ts';
import type {PullRequestAppearance} from './releaseAppearanceCommandDiscovery.ts';
import {listIssueComments, parseIssueCommentMutationResponse} from './releaseAppearanceCommandGitHub.ts';
import type {GitHubRequestBehavior, IssueCommentRecord} from './releaseAppearanceCommandGitHub.ts';
import {writeFailure} from './releaseAppearanceCommandOutput.ts';
import type {ReleaseAppearanceCommandStage} from './releaseAppearanceCommandParsing.ts';
import {
  commandFailure,
  commandFailureWithCause,
  commandSuccess,
  errorMessage,
  redactSecret,
} from './releaseAppearanceCommandResult.ts';
import type {CommandResult} from './releaseAppearanceCommandResult.ts';

export type CommentOperation =
  | {
      readonly kind: 'create';
      readonly commentBody: string;
    }
  | {
      readonly kind: 'update';
      readonly commentId: number;
      readonly commentBody: string;
    }
  | {
      readonly kind: 'unchanged';
    };

export type CommentOperationOptions = {
  readonly existingComments: readonly IssueCommentRecord[];
  readonly desiredReleaseState: ReleaseAppearanceState;
};

export type WritePullRequestCommentOptions = {
  readonly pullRequestNumber: number;
  readonly operation: Exclude<CommentOperation, {readonly kind: 'unchanged'}>;
  readonly githubRequests: GitHubRequestBehavior;
  readonly githubToken: string;
};

export type CreateDesiredReleaseStateOptions = {
  readonly stage: ReleaseAppearanceCommandStage;
  readonly releaseTag: string;
  readonly earliestBetaTag: string;
};

export type ProcessPullRequestsOptions = {
  readonly pullRequests: readonly PullRequestAppearance[];
  readonly stage: ReleaseAppearanceCommandStage;
  readonly releaseTag: string;
  readonly githubRequests: GitHubRequestBehavior;
  readonly githubToken: string;
  readonly writeOutput: (message: string) => Promise<void>;
};

export type ProcessingResult = {
  readonly commentsCreated: number;
  readonly commentsUpdated: number;
  readonly commentsUnchanged: number;
  readonly failedPullRequests: readonly number[];
};

type CreateExistingCommentOperationOptions = {
  readonly existingComments: readonly IssueCommentRecord[];
  readonly mergedComments: readonly string[];
  readonly markerCommentIndex: number;
};

type CreateCommentOperationOptions = {
  readonly existingComments: readonly IssueCommentRecord[];
  readonly desiredReleaseState: ReleaseAppearanceState;
  readonly markerCommentIndex: Maybe<number>;
  readonly mergedComments: readonly string[];
};

function findPersistentCommentIndex(existingComments: readonly IssueCommentRecord[]): CommandResult<Maybe<number>> {
  let markerCommentIndex: Maybe<number> = Maybe.nothing<number>();

  for (let commentIndex = 0; commentIndex < existingComments.length; commentIndex += 1) {
    const parsedCommentResult = parsePersistentMarkerComment(existingComments[commentIndex].body);
    if (parsedCommentResult.isErr) {
      return commandFailure(parsedCommentResult.error.message);
    }

    if (parsedCommentResult.value.isNothing) {
      continue;
    }

    if (markerCommentIndex.isJust) {
      return commandFailure('More than one release-appearance marker comment exists');
    }

    markerCommentIndex = Maybe.just(commentIndex);
  }

  return commandSuccess(markerCommentIndex);
}

function readValueAtIndex<valueType extends {}>(values: readonly valueType[], index: number): Maybe<valueType> {
  return Maybe.of(values[index]);
}

function createExistingCommentOperation(
  createExistingCommentOperationOptions: CreateExistingCommentOperationOptions,
): CommandResult<CommentOperation> {
  const {existingComments, mergedComments, markerCommentIndex} = createExistingCommentOperationOptions;
  const existingCommentResult = readValueAtIndex(existingComments, markerCommentIndex);
  if (existingCommentResult.isNothing) {
    return commandFailure('Release-appearance marker comment was not found');
  }

  const mergedCommentBodyResult = readValueAtIndex(mergedComments, markerCommentIndex);
  if (mergedCommentBodyResult.isNothing) {
    return commandFailure('Release-appearance marker comment merge returned no comment body');
  }

  const existingComment = existingCommentResult.value;
  const mergedCommentBody = mergedCommentBodyResult.value;
  return mergedCommentBody === existingComment.body
    ? commandSuccess({kind: 'unchanged'})
    : commandSuccess({kind: 'update', commentId: existingComment.id, commentBody: mergedCommentBody});
}

function createCommentOperation(
  createCommentOperationOptions: CreateCommentOperationOptions,
): CommandResult<CommentOperation> {
  const {existingComments, desiredReleaseState, markerCommentIndex, mergedComments} = createCommentOperationOptions;

  return markerCommentIndex.match({
    Nothing() {
      return commandSuccess({kind: 'create', commentBody: renderPersistentComment(desiredReleaseState)});
    },
    Just(markerCommentIndexValue) {
      return createExistingCommentOperation({
        existingComments,
        mergedComments,
        markerCommentIndex: markerCommentIndexValue,
      });
    },
  });
}

export function prepareCommentOperation(
  commentOperationOptions: CommentOperationOptions,
): CommandResult<CommentOperation> {
  const {existingComments, desiredReleaseState} = commentOperationOptions;
  const markerCommentIndexResult = findPersistentCommentIndex(existingComments);
  if (markerCommentIndexResult.isErr) {
    return commandFailure<CommentOperation>(markerCommentIndexResult.error.message);
  }

  const mergedCommentsResult = mergeReleaseAppearanceComments(
    existingComments.map(existingComment => {
      return existingComment.body;
    }),
    desiredReleaseState,
  );
  if (mergedCommentsResult.isErr) {
    return commandFailure<CommentOperation>(mergedCommentsResult.error.message);
  }

  return createCommentOperation({
    existingComments,
    desiredReleaseState,
    markerCommentIndex: markerCommentIndexResult.value,
    mergedComments: mergedCommentsResult.value,
  });
}

async function writePullRequestComment(
  writePullRequestCommentOptions: WritePullRequestCommentOptions,
): Promise<CommandResult<Unit>> {
  const {pullRequestNumber, operation, githubRequests, githubToken} = writePullRequestCommentOptions;

  try {
    const response = await match(operation)
      .with({kind: 'create'}, async createOperation => {
        return githubRequests.createIssueComment({
          pullRequestNumber,
          commentBody: createOperation.commentBody,
        });
      })
      .with({kind: 'update'}, async updateOperation => {
        return githubRequests.updateIssueComment({
          commentId: updateOperation.commentId,
          commentBody: updateOperation.commentBody,
        });
      })
      .exhaustive();
    const responseResult = parseIssueCommentMutationResponse(response);
    return responseResult.map(() => {
      return Unit;
    });
  } catch (error: unknown) {
    return commandFailureWithCause(
      `Unable to ${operation.kind} release-appearance comment for pull request #${pullRequestNumber}: ${redactSecret(errorMessage(error), githubToken)}`,
      error,
    );
  }
}

function createDesiredReleaseState(
  createDesiredReleaseStateOptions: CreateDesiredReleaseStateOptions,
): ReleaseAppearanceState {
  const {stage, releaseTag, earliestBetaTag} = createDesiredReleaseStateOptions;

  return match(stage)
    .with('beta', () => {
      return {beta: releaseTag};
    })
    .with('production', () => {
      return {beta: earliestBetaTag, production: releaseTag};
    })
    .exhaustive();
}

export async function processPullRequests(
  processPullRequestsOptions: ProcessPullRequestsOptions,
): Promise<ProcessingResult> {
  const {pullRequests, stage, releaseTag, githubRequests, githubToken, writeOutput} = processPullRequestsOptions;
  let commentsCreated = 0;
  let commentsUpdated = 0;
  let commentsUnchanged = 0;
  const failedPullRequests = new Set<number>();

  for (const pullRequest of pullRequests) {
    const commentsResult = await listIssueComments({
      pullRequestNumber: pullRequest.number,
      githubRequests,
      githubToken,
    });
    if (commentsResult.isErr) {
      failedPullRequests.add(pullRequest.number);
      await writeFailure({writeOutput, message: commentsResult.error.message});
      continue;
    }

    const desiredReleaseState = createDesiredReleaseState({
      stage,
      releaseTag,
      earliestBetaTag: pullRequest.earliestBetaTag,
    });
    const operationResult = prepareCommentOperation({
      existingComments: commentsResult.value,
      desiredReleaseState,
    });
    if (operationResult.isErr) {
      failedPullRequests.add(pullRequest.number);
      await writeFailure({
        writeOutput,
        message: `Pull request #${pullRequest.number}: ${operationResult.error.message}`,
      });
      continue;
    }

    if (operationResult.value.kind === 'unchanged') {
      commentsUnchanged += 1;
      continue;
    }

    const writeResult = await writePullRequestComment({
      pullRequestNumber: pullRequest.number,
      operation: operationResult.value,
      githubRequests,
      githubToken,
    });
    if (writeResult.isErr) {
      failedPullRequests.add(pullRequest.number);
      await writeFailure({writeOutput, message: writeResult.error.message});
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
