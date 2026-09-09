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

import type {WebAppVersionSynchronizationPullRequest} from './webappVersionSynchronization.ts';

import {formatHttpRequestFailure, isHttpRequestFailure} from '../release-appearance/httpClient.ts';
import type {HttpClient, HttpMethod, HttpRequest} from '../release-appearance/httpClient.ts';

export type CreateWebAppVersionSynchronizationPullRequestOptions = {
  readonly title: string;
  readonly body: string;
  readonly headBranch: string;
};

export type WebAppVersionSynchronizationGitHubClient = {
  readonly listPullRequests: () => Promise<Result<readonly WebAppVersionSynchronizationPullRequest[], Error>>;
  readonly createPullRequest: (
    options: CreateWebAppVersionSynchronizationPullRequestOptions,
  ) => Promise<Result<WebAppVersionSynchronizationPullRequest, Error>>;
};

export type CreateWebAppVersionSynchronizationGitHubClientOptions = {
  readonly httpClient: HttpClient;
  readonly githubApiUrl: URL;
  readonly githubRepository: string;
  readonly githubToken: string;
};

type ParsedPullRequestPage = {
  readonly rawItemCount: number;
  readonly pullRequests: readonly WebAppVersionSynchronizationPullRequest[];
};

type GitHubPullRequestRequestBody = {
  readonly title: string;
  readonly head: string;
  readonly base: 'main';
  readonly body: string;
};

type RequestGitHubJsonOptions = {
  readonly httpClient: HttpClient;
  readonly request: HttpRequest;
  readonly failureMessage: string;
  readonly githubToken: string;
};

type ListPullRequestsPageOptions = {
  readonly httpClient: HttpClient;
  readonly endpoint: URL;
  readonly headers: Readonly<Record<string, string>>;
  readonly githubToken: string;
};

const githubPageSize = 100;
const githubApiVersion = '2022-11-28';

const githubPullRequestResponseSchema = z.object({
  number: z.number().int().positive(),
  html_url: z.string().url(),
  title: z.string().min(1),
  body: z.string().nullable(),
  state: z.enum(['open', 'closed']),
  merged_at: z.string().nullable(),
  base: z.object({
    ref: z.string().min(1),
  }),
  head: z.object({
    ref: z.string().min(1),
  }),
});

const githubPullRequestPageResponseSchema = z.array(githubPullRequestResponseSchema);

function errorMessage(error: unknown): string {
  if (isHttpRequestFailure(error)) {
    return formatHttpRequestFailure(error);
  }

  if (isError(error)) {
    return error.message;
  }

  return 'Unknown failure';
}

function redactSecret(message: string, secret: string): string {
  if (secret.length === 0) {
    return message;
  }

  return message.replaceAll(secret, '[REDACTED]');
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

function createGitHubHeaders(githubToken: string, includesBody: boolean): Readonly<Record<string, string>> {
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

function createPageUrl(endpoint: URL, page: number): URL {
  const pageUrl = new URL(endpoint);

  pageUrl.searchParams.set('state', 'all');
  pageUrl.searchParams.set('sort', 'created');
  pageUrl.searchParams.set('direction', 'asc');
  pageUrl.searchParams.set('per_page', githubPageSize.toString());
  pageUrl.searchParams.set('page', page.toString());

  return pageUrl;
}

function createHttpRequest(
  method: HttpMethod,
  url: URL,
  headers: Readonly<Record<string, string>>,
  json: Maybe<NonNullable<unknown>>,
): HttpRequest {
  return {method, url, headers, json};
}

function parsePullRequestPage(githubResponse: unknown): Result<ParsedPullRequestPage, Error> {
  const validationResult = githubPullRequestPageResponseSchema.safeParse(githubResponse);

  if (validationResult.success === false) {
    return Result.err(new Error('Malformed GitHub pull request response'));
  }

  return Result.ok({
    rawItemCount: validationResult.data.length,
    pullRequests: validationResult.data.map(pullRequest => {
      return {
        number: pullRequest.number,
        url: pullRequest.html_url,
        title: pullRequest.title,
        body: pullRequest.body ?? '',
        state: pullRequest.state,
        mergedAt: pullRequest.merged_at,
        baseBranch: pullRequest.base.ref,
        headBranch: pullRequest.head.ref,
      };
    }),
  });
}

async function requestGitHubJson(options: RequestGitHubJsonOptions): Promise<Result<unknown, Error>> {
  try {
    return Result.ok(await options.httpClient.requestJson(options.request));
  } catch (error: unknown) {
    return Result.err(
      new Error(`${options.failureMessage}: ${redactSecret(errorMessage(error), options.githubToken)}`, {
        cause: error,
      }),
    );
  }
}

function createPullRequestRequestBody(
  options: CreateWebAppVersionSynchronizationPullRequestOptions,
): GitHubPullRequestRequestBody {
  return {
    title: options.title,
    head: options.headBranch,
    base: 'main',
    body: options.body,
  };
}

function parseCreatedPullRequest(githubResponse: unknown): Result<WebAppVersionSynchronizationPullRequest, Error> {
  const pullRequestResult = parsePullRequestPage([githubResponse]);

  if (pullRequestResult.isErr) {
    return Result.err(new Error('Malformed GitHub created pull request response'));
  }

  const createdPullRequest = pullRequestResult.value.pullRequests.at(0);

  if (createdPullRequest === undefined) {
    return Result.err(new Error('Malformed GitHub created pull request response'));
  }

  return Result.ok(createdPullRequest);
}

async function listPullRequestsPage(
  options: ListPullRequestsPageOptions,
  page: number,
  accumulatedPullRequests: readonly WebAppVersionSynchronizationPullRequest[],
): Promise<Result<readonly WebAppVersionSynchronizationPullRequest[], Error>> {
  const request = createHttpRequest(
    'get',
    createPageUrl(options.endpoint, page),
    options.headers,
    Maybe.nothing<NonNullable<unknown>>(),
  );
  const githubResponseResult = await requestGitHubJson({
    httpClient: options.httpClient,
    request,
    failureMessage: 'Unable to list GitHub pull requests',
    githubToken: options.githubToken,
  });

  if (githubResponseResult.isErr) {
    return Result.err(githubResponseResult.error);
  }

  const pageResult = parsePullRequestPage(githubResponseResult.value);

  if (pageResult.isErr) {
    return Result.err(pageResult.error);
  }

  const pullRequests = [...accumulatedPullRequests, ...pageResult.value.pullRequests];

  if (pageResult.value.rawItemCount !== githubPageSize) {
    return Result.ok(pullRequests);
  }

  return listPullRequestsPage(options, page + 1, pullRequests);
}

export function createWebAppVersionSynchronizationGitHubClient(
  options: CreateWebAppVersionSynchronizationGitHubClientOptions,
): WebAppVersionSynchronizationGitHubClient {
  const githubApiRoot = createGitHubApiRoot(options.githubApiUrl);
  const encodedRepositoryName = encodeRepositoryName(options.githubRepository);
  const readHeaders = createGitHubHeaders(options.githubToken, false);
  const writeHeaders = createGitHubHeaders(options.githubToken, true);
  const pullRequestsEndpoint = new URL(`repos/${encodedRepositoryName}/pulls`, githubApiRoot);

  const listPullRequestsOptions = {
    httpClient: options.httpClient,
    endpoint: pullRequestsEndpoint,
    headers: readHeaders,
    githubToken: options.githubToken,
  };

  return {
    async listPullRequests() {
      return listPullRequestsPage(listPullRequestsOptions, 1, []);
    },

    async createPullRequest(createPullRequestOptions: CreateWebAppVersionSynchronizationPullRequestOptions) {
      const request = createHttpRequest(
        'post',
        pullRequestsEndpoint,
        writeHeaders,
        Maybe.just(createPullRequestRequestBody(createPullRequestOptions)),
      );
      const githubResponseResult = await requestGitHubJson({
        httpClient: options.httpClient,
        request,
        failureMessage: 'Unable to create WebApp version synchronization pull request',
        githubToken: options.githubToken,
      });

      if (githubResponseResult.isErr) {
        return Result.err(githubResponseResult.error);
      }

      return parseCreatedPullRequest(githubResponseResult.value);
    },
  };
}
