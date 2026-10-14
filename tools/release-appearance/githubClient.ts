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

import {Maybe, Result, Task, task} from 'true-myth';
import {z} from 'zod';

import {
  createGitHubApiRoot,
  createGitHubHeaders,
  createGitHubHttpRequest,
  createGitHubPageUrl,
  encodeGitHubRepositoryName,
  formatGitHubRequestError,
  githubApiPageSize,
  redactGitHubSecret,
} from '../release-github/githubApi.ts';
import type {HttpClient} from '../release-github/githubApi.ts';

export type PullRequestRecord = {
  readonly number: number;
  readonly title: string;
  readonly baseBranch: string;
  readonly mergedAt: Maybe<string>;
};

export type IssueCommentRecord = {
  readonly id: number;
  readonly body: string;
};

export type ListPullRequestsForCommitOptions = {
  readonly commitSha: string;
};

export type ListIssueCommentsOptions = {
  readonly pullRequestNumber: number;
};

export type CreateIssueCommentOptions = {
  readonly pullRequestNumber: number;
  readonly commentBody: string;
};

export type UpdateIssueCommentOptions = {
  readonly commentId: number;
  readonly commentBody: string;
};

export type GitHubClient = {
  readonly listPullRequestsForCommit: (
    options: ListPullRequestsForCommitOptions,
  ) => Task<readonly PullRequestRecord[], Error>;
  readonly listIssueComments: (options: ListIssueCommentsOptions) => Task<readonly IssueCommentRecord[], Error>;
  readonly createIssueComment: (options: CreateIssueCommentOptions) => Task<IssueCommentRecord, Error>;
  readonly updateIssueComment: (options: UpdateIssueCommentOptions) => Task<IssueCommentRecord, Error>;
};

export type CreateGitHubClientOptions = {
  readonly httpClient: HttpClient;
  readonly githubApiUrl: URL;
  readonly githubRepository: string;
  readonly githubToken: string;
};

type ParsedPullRequestPage = {
  readonly rawItemCount: number;
  readonly supportedMergedPullRequests: readonly PullRequestRecord[];
};

type RequestGitHubJsonOptions = {
  readonly httpClient: HttpClient;
  readonly request: ReturnType<typeof createGitHubHttpRequest>;
  readonly failureMessage: string;
  readonly githubToken: string;
};

const githubPullRequestResponseSchema = z.object({
  number: z.number().int().positive(),
  title: z.string().min(1),
  merged_at: z.string().nullable(),
  base: z.object({
    ref: z.string(),
  }),
});

const githubPullRequestPageResponseSchema = z.array(githubPullRequestResponseSchema);

const githubIssueCommentResponseSchema = z.object({
  id: z.number().int().positive(),
  body: z.string(),
});

const githubIssueCommentPageResponseSchema = z.array(githubIssueCommentResponseSchema);

function createSuccess<valueType>(value: valueType): Result<valueType, Error> {
  return Result.ok<valueType, Error>(value);
}

function createFailure<valueType>(message: string): Result<valueType, Error> {
  return Result.err<valueType, Error>(new Error(message));
}

function parsePullRequestPage(githubResponse: unknown): Result<ParsedPullRequestPage, Error> {
  const validationResult = githubPullRequestPageResponseSchema.safeParse(githubResponse);
  if (!validationResult.success) {
    return createFailure('Malformed GitHub pull request response');
  }

  const pullRequests = validationResult.data.map(pullRequest => {
    return {
      number: pullRequest.number,
      title: pullRequest.title,
      baseBranch: pullRequest.base.ref,
      mergedAt: Maybe.of(pullRequest.merged_at),
    };
  });
  const supportedMergedPullRequests = pullRequests.filter(pullRequest => {
    const targetsSupportedBranch = pullRequest.baseBranch === 'main' || pullRequest.baseBranch.startsWith('release/');
    return pullRequest.mergedAt.isJust && targetsSupportedBranch;
  });

  return createSuccess({
    rawItemCount: validationResult.data.length,
    supportedMergedPullRequests,
  });
}

function parseIssueCommentPage(githubResponse: unknown): Result<readonly IssueCommentRecord[], Error> {
  const validationResult = githubIssueCommentPageResponseSchema.safeParse(githubResponse);
  if (!validationResult.success) {
    return createFailure('Malformed GitHub issue comment response');
  }

  return createSuccess(
    validationResult.data.map(comment => {
      return {id: comment.id, body: comment.body};
    }),
  );
}

function parseIssueCommentMutation(githubResponse: unknown): Result<IssueCommentRecord, Error> {
  const validationResult = githubIssueCommentResponseSchema.safeParse(githubResponse);
  if (!validationResult.success) {
    return createFailure('Malformed GitHub comment mutation response');
  }

  return createSuccess({id: validationResult.data.id, body: validationResult.data.body});
}

function requestGitHubJson(options: RequestGitHubJsonOptions): Task<unknown, Error> {
  return task.tryOrElse(
    (error: unknown): Error => {
      return new Error(
        `${options.failureMessage}: ${redactGitHubSecret(
          formatGitHubRequestError({error, fallbackMessage: 'Unknown failure'}),
          options.githubToken,
        )}`,
        {cause: error},
      );
    },
    (): Promise<unknown> => {
      return options.httpClient.requestJson(options.request);
    },
  );
}

function resultToTask<valueType>(result: Result<valueType, Error>): Task<valueType, Error> {
  if (result.isErr) {
    return Task.reject(result.error);
  }

  return Task.resolve(result.value);
}

export function createGitHubClient(createGitHubClientOptions: CreateGitHubClientOptions): GitHubClient {
  const {httpClient, githubApiUrl, githubRepository, githubToken} = createGitHubClientOptions;
  const githubApiRoot = createGitHubApiRoot(githubApiUrl);
  const encodedRepositoryName = encodeGitHubRepositoryName(githubRepository);
  const readHeaders = createGitHubHeaders({githubToken, includesJsonBody: false});
  const writeHeaders = createGitHubHeaders({githubToken, includesJsonBody: true});

  return {
    listPullRequestsForCommit(options): Task<readonly PullRequestRecord[], Error> {
      const endpoint = new URL(
        `repos/${encodedRepositoryName}/commits/${encodeURIComponent(options.commitSha)}/pulls`,
        githubApiRoot,
      );

      function listPullRequestsPage(
        page: number,
        accumulatedPullRequests: readonly PullRequestRecord[],
      ): Task<readonly PullRequestRecord[], Error> {
        const request = createGitHubHttpRequest({
          method: 'get',
          url: createGitHubPageUrl({endpoint, page}),
          headers: readHeaders,
          json: Maybe.nothing<NonNullable<unknown>>(),
        });

        return requestGitHubJson({
          httpClient,
          request,
          failureMessage: `Unable to list pull requests for commit ${options.commitSha}`,
          githubToken,
        }).andThen(githubResponse => {
          const pageResult = parsePullRequestPage(githubResponse);
          if (pageResult.isErr) {
            return Task.reject(pageResult.error);
          }

          const pullRequests = [...accumulatedPullRequests, ...pageResult.value.supportedMergedPullRequests];
          if (pageResult.value.rawItemCount !== githubApiPageSize) {
            return Task.resolve(pullRequests);
          }

          return listPullRequestsPage(page + 1, pullRequests);
        });
      }

      return listPullRequestsPage(1, []);
    },

    listIssueComments(options): Task<readonly IssueCommentRecord[], Error> {
      const endpoint = new URL(
        `repos/${encodedRepositoryName}/issues/${options.pullRequestNumber}/comments`,
        githubApiRoot,
      );

      function listIssueCommentsPage(
        page: number,
        accumulatedComments: readonly IssueCommentRecord[],
      ): Task<readonly IssueCommentRecord[], Error> {
        const request = createGitHubHttpRequest({
          method: 'get',
          url: createGitHubPageUrl({endpoint, page}),
          headers: readHeaders,
          json: Maybe.nothing<NonNullable<unknown>>(),
        });

        return requestGitHubJson({
          httpClient,
          request,
          failureMessage: `Unable to list issue comments for pull request #${options.pullRequestNumber}`,
          githubToken,
        }).andThen(githubResponse => {
          const pageResult = parseIssueCommentPage(githubResponse);
          if (pageResult.isErr) {
            return Task.reject(pageResult.error);
          }

          const comments = [...accumulatedComments, ...pageResult.value];
          if (pageResult.value.length !== githubApiPageSize) {
            return Task.resolve(comments);
          }

          return listIssueCommentsPage(page + 1, comments);
        });
      }

      return listIssueCommentsPage(1, []);
    },

    createIssueComment(options): Task<IssueCommentRecord, Error> {
      const endpoint = new URL(
        `repos/${encodedRepositoryName}/issues/${options.pullRequestNumber}/comments`,
        githubApiRoot,
      );

      const request = createGitHubHttpRequest({
        method: 'post',
        url: endpoint,
        headers: writeHeaders,
        json: Maybe.just({body: options.commentBody}),
      });

      return requestGitHubJson({
        httpClient,
        request,
        failureMessage: `Unable to create release-appearance comment for pull request #${options.pullRequestNumber}`,
        githubToken,
      }).andThen(githubResponse => {
        return resultToTask(parseIssueCommentMutation(githubResponse));
      });
    },

    updateIssueComment(options): Task<IssueCommentRecord, Error> {
      const endpoint = new URL(`repos/${encodedRepositoryName}/issues/comments/${options.commentId}`, githubApiRoot);
      const request = createGitHubHttpRequest({
        method: 'patch',
        url: endpoint,
        headers: writeHeaders,
        json: Maybe.just({body: options.commentBody}),
      });

      return requestGitHubJson({
        httpClient,
        request,
        failureMessage: `Unable to update release-appearance comment #${options.commentId}`,
        githubToken,
      }).andThen(githubResponse => {
        return resultToTask(parseIssueCommentMutation(githubResponse));
      });
    },
  };
}
