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

import {isError} from '@sindresorhus/is';
import {Maybe, Result} from 'true-myth';
import {z} from 'zod';

import {formatHttpRequestFailure, isHttpRequestFailure} from '../release-appearance/httpClient.ts';
import type {HttpClient, HttpMethod, HttpRequest} from '../release-appearance/httpClient.ts';

export type WebAppReleasePlanningPullRequest = {
  readonly number: number;
  readonly title: string;
  readonly baseBranch: string;
  readonly mergedAt: Maybe<string>;
  readonly labels: readonly string[];
};

export type ListWebAppReleasePlanningPullRequestsForCommitOptions = {
  readonly commitSha: string;
};

export type WebAppReleasePlanningGitHubClient = {
  readonly listPullRequestsForCommit: (
    options: ListWebAppReleasePlanningPullRequestsForCommitOptions,
  ) => Promise<Result<readonly WebAppReleasePlanningPullRequest[], Error>>;
};

export type CreateWebAppReleasePlanningGitHubClientOptions = {
  readonly httpClient: HttpClient;
  readonly githubApiUrl: URL;
  readonly githubRepository: string;
  readonly githubToken: string;
};

type ParsedPullRequestPage = {
  readonly rawItemCount: number;
  readonly pullRequests: readonly WebAppReleasePlanningPullRequest[];
};

const githubPageSize = 100;
const githubApiVersion = '2022-11-28';

const githubPullRequestResponseSchema = z.object({
  number: z.number().int().positive(),
  title: z.string().min(1),
  merged_at: z.string().min(1).nullable(),
  base: z.object({
    ref: z.string().min(1),
  }),
  labels: z.array(
    z.object({
      name: z.string(),
    }),
  ),
});

const githubPullRequestPageResponseSchema = z.array(githubPullRequestResponseSchema);

function createSuccess<valueType>(value: valueType): Result<valueType, Error> {
  return Result.ok<valueType, Error>(value);
}

function createFailure<valueType>(message: string): Result<valueType, Error> {
  return Result.err<valueType, Error>(new Error(message));
}

function errorMessage(error: unknown): string {
  if (isHttpRequestFailure(error)) {
    return formatHttpRequestFailure(error);
  }

  return isError(error) ? error.message : 'Unknown GitHub request failure';
}

function redactSecret(message: string, secret: string): string {
  return secret.length === 0 ? message : message.replaceAll(secret, '[REDACTED]');
}

function createGitHubApiRoot(githubApiUrl: URL): URL {
  const githubApiUrlString = githubApiUrl.toString();

  return new URL(githubApiUrlString.endsWith('/') ? githubApiUrlString : `${githubApiUrlString}/`);
}

function encodeRepositoryName(githubRepository: string): string {
  return githubRepository
    .split('/')
    .map(repositoryPart => {
      return encodeURIComponent(repositoryPart);
    })
    .join('/');
}

function createGitHubHeaders(githubToken: string): Readonly<Record<string, string>> {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${githubToken}`,
    'X-GitHub-Api-Version': githubApiVersion,
  };
}

function createPageUrl(endpoint: URL, page: number): URL {
  const pageUrl = new URL(endpoint);
  pageUrl.searchParams.set('per_page', githubPageSize.toString());
  pageUrl.searchParams.set('page', page.toString());

  return pageUrl;
}

function createHttpRequest(url: URL, headers: Readonly<Record<string, string>>): HttpRequest {
  const method: HttpMethod = 'get';

  return {
    method,
    url,
    headers,
    json: Maybe.nothing<NonNullable<unknown>>(),
  };
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
      labels: pullRequest.labels.map(label => {
        return label.name;
      }),
    };
  });

  return createSuccess({
    rawItemCount: validationResult.data.length,
    pullRequests,
  });
}

export function createWebAppReleasePlanningGitHubClient(
  options: CreateWebAppReleasePlanningGitHubClientOptions,
): WebAppReleasePlanningGitHubClient {
  const githubApiRoot = createGitHubApiRoot(options.githubApiUrl);
  const encodedRepositoryName = encodeRepositoryName(options.githubRepository);
  const readHeaders = createGitHubHeaders(options.githubToken);

  return {
    async listPullRequestsForCommit(listOptions: ListWebAppReleasePlanningPullRequestsForCommitOptions) {
      const pullRequests: WebAppReleasePlanningPullRequest[] = [];
      const endpoint = new URL(
        `repos/${encodedRepositoryName}/commits/${encodeURIComponent(listOptions.commitSha)}/pulls`,
        githubApiRoot,
      );

      for (let page = 1; ; page += 1) {
        let githubResponse: unknown;

        try {
          githubResponse = await options.httpClient.requestJson(
            createHttpRequest(createPageUrl(endpoint, page), readHeaders),
          );
        } catch (error: unknown) {
          const failureMessage = redactSecret(errorMessage(error), options.githubToken);

          return createFailure(
            `Unable to list pull requests associated with commit ${listOptions.commitSha}: ${failureMessage}`,
          );
        }

        const pageResult = parsePullRequestPage(githubResponse);
        if (pageResult.isErr) {
          return createFailure(pageResult.error.message);
        }

        pullRequests.push(...pageResult.value.pullRequests);
        if (pageResult.value.rawItemCount !== githubPageSize) {
          break;
        }
      }

      return createSuccess(pullRequests);
    },
  };
}
