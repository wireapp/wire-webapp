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

import ky from 'ky';

import {
  githubIssueCommentPageResponseSchema,
  githubIssueCommentResponseSchema,
  githubPullRequestPageResponseSchema,
} from './releaseAppearanceCommandGitHubSchema.ts';
import type {CommandEnvironment} from './releaseAppearanceCommandParsing.ts';
import {
  commandFailure,
  commandFailureWithCause,
  commandSuccess,
  errorMessage,
  redactSecret,
} from './releaseAppearanceCommandResult.ts';
import type {CommandResult} from './releaseAppearanceCommandResult.ts';

export type ListPullRequestsForCommitOptions = {
  readonly commitSha: string;
  readonly page: number;
};

export type ListIssueCommentsOptions = {
  readonly pullRequestNumber: number;
  readonly page: number;
};

export type CreateIssueCommentOptions = {
  readonly pullRequestNumber: number;
  readonly commentBody: string;
};

export type UpdateIssueCommentOptions = {
  readonly commentId: number;
  readonly commentBody: string;
};

export type GitHubRequestBehavior = {
  readonly listPullRequestsForCommit: (options: ListPullRequestsForCommitOptions) => Promise<unknown>;
  readonly listIssueComments: (options: ListIssueCommentsOptions) => Promise<unknown>;
  readonly createIssueComment: (options: CreateIssueCommentOptions) => Promise<unknown>;
  readonly updateIssueComment: (options: UpdateIssueCommentOptions) => Promise<unknown>;
};

export type PullRequestRecord = {
  readonly number: number;
};

export type IssueCommentRecord = {
  readonly id: number;
  readonly body: string;
};

export type ListMergedSupportedPullRequestsOptions = {
  readonly commitSha: string;
  readonly githubRequests: GitHubRequestBehavior;
  readonly githubToken: string;
};

export type ListIssueCommentsRequestOptions = {
  readonly pullRequestNumber: number;
  readonly githubRequests: GitHubRequestBehavior;
  readonly githubToken: string;
};

const githubPageSize = 100;
const githubApiVersion = '2022-11-28';

function createGitHubHeaders(githubToken: string, includesBody: boolean): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${githubToken}`,
    'X-GitHub-Api-Version': githubApiVersion,
  };

  if (includesBody) {
    headers['Content-Type'] = 'application/json';
  }

  return headers;
}

export function createGitHubRequestBehavior(commandEnvironment: CommandEnvironment): GitHubRequestBehavior {
  const {githubApiUrl, githubRepository, githubToken} = commandEnvironment;
  const encodedRepository = githubRepository
    .split('/')
    .map(repositoryPart => {
      return encodeURIComponent(repositoryPart);
    })
    .join('/');
  const apiRoot = githubApiUrl.endsWith('/') ? githubApiUrl : `${githubApiUrl}/`;
  const githubRequestOptions = {
    headers: createGitHubHeaders(githubToken, false),
    retry: {limit: 0},
  };

  return {
    async listPullRequestsForCommit(listPullRequestsForCommitOptions): Promise<unknown> {
      const {commitSha, page} = listPullRequestsForCommitOptions;
      const endpoint = new URL(
        `repos/${encodedRepository}/commits/${encodeURIComponent(commitSha)}/pulls?per_page=${githubPageSize}&page=${page}`,
        apiRoot,
      ).toString();

      return ky.get(endpoint, githubRequestOptions).json<unknown>();
    },
    async listIssueComments(listIssueCommentsOptions): Promise<unknown> {
      const {pullRequestNumber, page} = listIssueCommentsOptions;
      const endpoint = new URL(
        `repos/${encodedRepository}/issues/${pullRequestNumber}/comments?per_page=${githubPageSize}&page=${page}`,
        apiRoot,
      ).toString();

      return ky.get(endpoint, githubRequestOptions).json<unknown>();
    },
    async createIssueComment(createIssueCommentOptions): Promise<unknown> {
      const {pullRequestNumber, commentBody} = createIssueCommentOptions;
      const endpoint = new URL(`repos/${encodedRepository}/issues/${pullRequestNumber}/comments`, apiRoot).toString();

      return ky
        .post(endpoint, {
          ...githubRequestOptions,
          headers: createGitHubHeaders(githubToken, true),
          json: {body: commentBody},
        })
        .json<unknown>();
    },
    async updateIssueComment(updateIssueCommentOptions): Promise<unknown> {
      const {commentId, commentBody} = updateIssueCommentOptions;
      const endpoint = new URL(`repos/${encodedRepository}/issues/comments/${commentId}`, apiRoot).toString();

      return ky
        .patch(endpoint, {
          ...githubRequestOptions,
          headers: createGitHubHeaders(githubToken, true),
          json: {body: commentBody},
        })
        .json<unknown>();
    },
  };
}

export function parsePullRequestPage(response: unknown): CommandResult<readonly PullRequestRecord[]> {
  const validationResult = githubPullRequestPageResponseSchema.safeParse(response);
  if (!validationResult.success) {
    return commandFailure('Malformed GitHub pull request response');
  }

  const pullRequests = validationResult.data
    .filter(pullRequest => {
      return pullRequest.merged_at !== null;
    })
    .filter(pullRequest => {
      return pullRequest.base.ref === 'main' || pullRequest.base.ref.startsWith('release/');
    })
    .map(pullRequest => {
      return {number: pullRequest.number};
    });

  return commandSuccess(pullRequests);
}

export function parseIssueCommentPage(response: unknown): CommandResult<readonly IssueCommentRecord[]> {
  const validationResult = githubIssueCommentPageResponseSchema.safeParse(response);
  if (!validationResult.success) {
    return commandFailure('Malformed GitHub issue comment response');
  }

  const comments = validationResult.data.map(comment => {
    return {id: comment.id, body: comment.body};
  });

  return commandSuccess(comments);
}

export function parseIssueCommentMutationResponse(response: unknown): CommandResult<IssueCommentRecord> {
  const validationResult = githubIssueCommentResponseSchema.safeParse(response);
  if (!validationResult.success) {
    return commandFailure('Malformed GitHub comment mutation response');
  }

  return commandSuccess({id: validationResult.data.id, body: validationResult.data.body});
}

export async function listMergedSupportedPullRequests(
  listMergedSupportedPullRequestsOptions: ListMergedSupportedPullRequestsOptions,
): Promise<CommandResult<readonly PullRequestRecord[]>> {
  const {commitSha, githubRequests, githubToken} = listMergedSupportedPullRequestsOptions;
  const pullRequests: PullRequestRecord[] = [];

  for (let page = 1; ; page += 1) {
    let response: unknown;
    try {
      response = await githubRequests.listPullRequestsForCommit({commitSha, page});
    } catch (error: unknown) {
      return commandFailureWithCause(
        `Unable to list pull requests for commit ${commitSha}: ${redactSecret(errorMessage(error), githubToken)}`,
        error,
      );
    }

    const pageResult = parsePullRequestPage(response);
    if (pageResult.isErr) {
      return pageResult;
    }

    pullRequests.push(...pageResult.value);
    if (pageResult.value.length < githubPageSize) {
      break;
    }
  }

  return commandSuccess(pullRequests);
}

export async function listIssueComments(
  listIssueCommentsOptions: ListIssueCommentsRequestOptions,
): Promise<CommandResult<readonly IssueCommentRecord[]>> {
  const {pullRequestNumber, githubRequests, githubToken} = listIssueCommentsOptions;
  const comments: IssueCommentRecord[] = [];

  for (let page = 1; ; page += 1) {
    let response: unknown;
    try {
      response = await githubRequests.listIssueComments({pullRequestNumber, page});
    } catch (error: unknown) {
      return commandFailureWithCause(
        `Unable to list issue comments for pull request #${pullRequestNumber}: ${redactSecret(errorMessage(error), githubToken)}`,
        error,
      );
    }

    const pageResult = parseIssueCommentPage(response);
    if (pageResult.isErr) {
      return pageResult;
    }

    comments.push(...pageResult.value);
    if (pageResult.value.length < githubPageSize) {
      break;
    }
  }

  return commandSuccess(comments);
}
