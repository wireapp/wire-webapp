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

import {Maybe, Result} from 'true-myth';
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
  ) => Promise<Result<readonly PullRequestRecord[], Error>>;
  readonly listIssueComments: (
    options: ListIssueCommentsOptions,
  ) => Promise<Result<readonly IssueCommentRecord[], Error>>;
  readonly createIssueComment: (options: CreateIssueCommentOptions) => Promise<Result<IssueCommentRecord, Error>>;
  readonly updateIssueComment: (options: UpdateIssueCommentOptions) => Promise<Result<IssueCommentRecord, Error>>;
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

export function createGitHubClient(createGitHubClientOptions: CreateGitHubClientOptions): GitHubClient {
  const {httpClient, githubApiUrl, githubRepository, githubToken} = createGitHubClientOptions;
  const githubApiRoot = createGitHubApiRoot(githubApiUrl);
  const encodedRepositoryName = encodeGitHubRepositoryName(githubRepository);
  const readHeaders = createGitHubHeaders({githubToken, includesJsonBody: false});
  const writeHeaders = createGitHubHeaders({githubToken, includesJsonBody: true});

  return {
    async listPullRequestsForCommit(options): Promise<Result<readonly PullRequestRecord[], Error>> {
      const pullRequests: PullRequestRecord[] = [];
      const endpoint = new URL(
        `repos/${encodedRepositoryName}/commits/${encodeURIComponent(options.commitSha)}/pulls`,
        githubApiRoot,
      );

      for (let page = 1; ; page += 1) {
        let githubResponse: unknown;
        try {
          githubResponse = await httpClient.requestJson(
            createGitHubHttpRequest({
              method: 'get',
              url: createGitHubPageUrl({endpoint, page}),
              headers: readHeaders,
              json: Maybe.nothing<NonNullable<unknown>>(),
            }),
          );
        } catch (error: unknown) {
          return createFailure(
            `Unable to list pull requests for commit ${options.commitSha}: ${redactGitHubSecret(
              formatGitHubRequestError({error, fallbackMessage: 'Unknown failure'}),
              githubToken,
            )}`,
          );
        }

        const pageResult = parsePullRequestPage(githubResponse);
        if (pageResult.isErr) {
          return createFailure(pageResult.error.message);
        }

        pullRequests.push(...pageResult.value.supportedMergedPullRequests);
        if (pageResult.value.rawItemCount !== githubApiPageSize) {
          break;
        }
      }

      return createSuccess(pullRequests);
    },

    async listIssueComments(options): Promise<Result<readonly IssueCommentRecord[], Error>> {
      const comments: IssueCommentRecord[] = [];
      const endpoint = new URL(
        `repos/${encodedRepositoryName}/issues/${options.pullRequestNumber}/comments`,
        githubApiRoot,
      );

      for (let page = 1; ; page += 1) {
        let githubResponse: unknown;
        try {
          githubResponse = await httpClient.requestJson(
            createGitHubHttpRequest({
              method: 'get',
              url: createGitHubPageUrl({endpoint, page}),
              headers: readHeaders,
              json: Maybe.nothing<NonNullable<unknown>>(),
            }),
          );
        } catch (error: unknown) {
          return createFailure(
            `Unable to list issue comments for pull request #${options.pullRequestNumber}: ${redactGitHubSecret(
              formatGitHubRequestError({error, fallbackMessage: 'Unknown failure'}),
              githubToken,
            )}`,
          );
        }

        const pageResult = parseIssueCommentPage(githubResponse);
        if (pageResult.isErr) {
          return pageResult;
        }

        comments.push(...pageResult.value);
        if (pageResult.value.length !== githubApiPageSize) {
          break;
        }
      }

      return createSuccess(comments);
    },

    async createIssueComment(options): Promise<Result<IssueCommentRecord, Error>> {
      const endpoint = new URL(
        `repos/${encodedRepositoryName}/issues/${options.pullRequestNumber}/comments`,
        githubApiRoot,
      );

      try {
        const githubResponse = await httpClient.requestJson(
          createGitHubHttpRequest({
            method: 'post',
            url: endpoint,
            headers: writeHeaders,
            json: Maybe.just({body: options.commentBody}),
          }),
        );
        return parseIssueCommentMutation(githubResponse);
      } catch (error: unknown) {
        return createFailure(
          `Unable to create release-appearance comment for pull request #${options.pullRequestNumber}: ${redactGitHubSecret(
            formatGitHubRequestError({error, fallbackMessage: 'Unknown failure'}),
            githubToken,
          )}`,
        );
      }
    },

    async updateIssueComment(options): Promise<Result<IssueCommentRecord, Error>> {
      const endpoint = new URL(`repos/${encodedRepositoryName}/issues/comments/${options.commentId}`, githubApiRoot);

      try {
        const githubResponse = await httpClient.requestJson(
          createGitHubHttpRequest({
            method: 'patch',
            url: endpoint,
            headers: writeHeaders,
            json: Maybe.just({body: options.commentBody}),
          }),
        );
        return parseIssueCommentMutation(githubResponse);
      } catch (error: unknown) {
        return createFailure(
          `Unable to update release-appearance comment #${options.commentId}: ${redactGitHubSecret(
            formatGitHubRequestError({error, fallbackMessage: 'Unknown failure'}),
            githubToken,
          )}`,
        );
      }
    },
  };
}
