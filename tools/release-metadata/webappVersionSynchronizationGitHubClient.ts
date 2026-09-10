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
import {Maybe, maybe, Result, Task, task} from 'true-myth';
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
  readonly listPullRequests: () => Task<readonly WebAppVersionSynchronizationPullRequest[], Error>;
  readonly createPullRequest: (
    options: CreateWebAppVersionSynchronizationPullRequestOptions,
  ) => Task<WebAppVersionSynchronizationPullRequest, Error>;
};

export type CreateWebAppVersionSynchronizationGitHubClientOptions = {
  readonly httpClient: HttpClient;
  readonly githubApiUrl: URL;
  readonly githubRepository: string;
  readonly githubToken: string;
};

type ParsedPullRequestSearchPage = {
  readonly totalCount: number;
  readonly incompleteResults: boolean;
  readonly rawItemCount: number;
  readonly pullRequestNumbers: readonly number[];
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

type SearchPullRequestsPageOptions = {
  readonly httpClient: HttpClient;
  readonly endpoint: URL;
  readonly headers: Readonly<Record<string, string>>;
  readonly searchQuery: string;
  readonly githubToken: string;
};

type GetPullRequestOptions = {
  readonly httpClient: HttpClient;
  readonly endpoint: URL;
  readonly headers: Readonly<Record<string, string>>;
  readonly githubToken: string;
};

const githubPageSize = 100;
const githubSearchResultLimit = 1000;
const githubApiVersion = '2022-11-28';
const synchronizationMarkerSearchTerm = 'wire-webapp-version-sync';
const synchronizationPullRequestTitleSearchTerm = 'Update WebApp version to';

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

const githubPullRequestSearchItemResponseSchema = z.object({
  number: z.number().int().positive(),
  html_url: z.string().url(),
  title: z.string().min(1),
  body: z.string().nullable(),
  pull_request: z.object({
    url: z.string().url(),
    html_url: z.string().url(),
  }),
});

const githubPullRequestSearchResponseSchema = z.object({
  total_count: z.number().int().nonnegative(),
  incomplete_results: z.boolean(),
  items: z.array(githubPullRequestSearchItemResponseSchema),
});

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

function createSearchPageUrl(endpoint: URL, searchQuery: string, page: number): URL {
  const pageUrl = new URL(endpoint);

  pageUrl.searchParams.set('q', searchQuery);
  pageUrl.searchParams.set('sort', 'created');
  pageUrl.searchParams.set('order', 'asc');
  pageUrl.searchParams.set('per_page', githubPageSize.toString());
  pageUrl.searchParams.set('page', page.toString());

  return pageUrl;
}

function createPullRequestDetailUrl(endpoint: URL, pullRequestNumber: number): URL {
  return new URL(`${pullRequestNumber}`, `${endpoint.toString()}/`);
}

function createHttpRequest(
  method: HttpMethod,
  url: URL,
  headers: Readonly<Record<string, string>>,
  json: Maybe<NonNullable<unknown>>,
): HttpRequest {
  return {method, url, headers, json};
}

function parsePullRequest(githubResponse: unknown): Result<WebAppVersionSynchronizationPullRequest, Error> {
  const validationResult = githubPullRequestResponseSchema.safeParse(githubResponse);

  if (validationResult.success === false) {
    return Result.err(new Error('Malformed GitHub pull request response'));
  }

  const {data: pullRequest} = validationResult;

  return Result.ok({
    number: pullRequest.number,
    url: pullRequest.html_url,
    title: pullRequest.title,
    body: pullRequest.body ?? '',
    state: pullRequest.state,
    mergedAt: pullRequest.merged_at,
    baseBranch: pullRequest.base.ref,
    headBranch: pullRequest.head.ref,
  });
}

function parsePullRequestSearchPage(githubResponse: unknown): Result<ParsedPullRequestSearchPage, Error> {
  const validationResult = githubPullRequestSearchResponseSchema.safeParse(githubResponse);

  if (validationResult.success === false) {
    return Result.err(new Error('Malformed GitHub pull request search response'));
  }

  const {data: searchResponse} = validationResult;

  return Result.ok({
    totalCount: searchResponse.total_count,
    incompleteResults: searchResponse.incomplete_results,
    rawItemCount: searchResponse.items.length,
    pullRequestNumbers: searchResponse.items.map(searchItem => {
      return searchItem.number;
    }),
  });
}

function requestGitHubJson(options: RequestGitHubJsonOptions): Task<unknown, Error> {
  return task.tryOrElse(
    (error: unknown): Error => {
      return new Error(`${options.failureMessage}: ${redactSecret(errorMessage(error), options.githubToken)}`, {
        cause: error,
      });
    },
    async (): Promise<unknown> => {
      return options.httpClient.requestJson(options.request);
    },
  );
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
  const pullRequestResult = parsePullRequest(githubResponse);

  if (pullRequestResult.isErr) {
    return Result.err(new Error('Malformed GitHub created pull request response'));
  }

  return pullRequestResult;
}

function searchPullRequestsPage(
  options: SearchPullRequestsPageOptions,
  page: number,
): Task<ParsedPullRequestSearchPage, Error> {
  const request = createHttpRequest(
    'get',
    createSearchPageUrl(options.endpoint, options.searchQuery, page),
    options.headers,
    Maybe.nothing<NonNullable<unknown>>(),
  );
  return requestGitHubJson({
    httpClient: options.httpClient,
    request,
    failureMessage: 'Unable to list GitHub pull requests',
    githubToken: options.githubToken,
  }).andThen(parsePullRequestSearchPage);
}

function searchPullRequestNumbers(
  options: SearchPullRequestsPageOptions,
  page: number,
  accumulatedPullRequestNumbers: readonly number[],
): Task<readonly number[], Error> {
  return searchPullRequestsPage(options, page).andThen(parsedSearchPage => {
    if (parsedSearchPage.incompleteResults) {
      return Task.reject<readonly number[], Error>(new Error('GitHub pull request search returned incomplete results'));
    }

    if (parsedSearchPage.totalCount > githubSearchResultLimit) {
      return Task.reject<readonly number[], Error>(
        new Error(`GitHub pull request search returned more than ${githubSearchResultLimit} results`),
      );
    }

    const pullRequestNumbers = [...accumulatedPullRequestNumbers, ...parsedSearchPage.pullRequestNumbers];

    if (pullRequestNumbers.length >= parsedSearchPage.totalCount) {
      return Task.resolve<readonly number[], Error>(pullRequestNumbers);
    }

    if (parsedSearchPage.rawItemCount !== githubPageSize) {
      return Task.reject<readonly number[], Error>(
        new Error('GitHub pull request search pagination ended before all results were retrieved'),
      );
    }

    return searchPullRequestNumbers(options, page + 1, pullRequestNumbers);
  });
}

function getPullRequest(
  options: GetPullRequestOptions,
  pullRequestNumber: number,
): Task<WebAppVersionSynchronizationPullRequest, Error> {
  const request = createHttpRequest(
    'get',
    createPullRequestDetailUrl(options.endpoint, pullRequestNumber),
    options.headers,
    Maybe.nothing<NonNullable<unknown>>(),
  );

  return requestGitHubJson({
    httpClient: options.httpClient,
    request,
    failureMessage: `Unable to read GitHub pull request #${pullRequestNumber}`,
    githubToken: options.githubToken,
  }).andThen(parsePullRequest);
}

function getPullRequests(
  options: GetPullRequestOptions,
  pullRequestNumbers: readonly number[],
  accumulatedPullRequests: readonly WebAppVersionSynchronizationPullRequest[],
): Task<readonly WebAppVersionSynchronizationPullRequest[], Error> {
  const pullRequestNumberMaybe = maybe.first(pullRequestNumbers).andThen(maybePullRequestNumber => {
    return maybePullRequestNumber;
  });

  if (pullRequestNumberMaybe.isNothing) {
    return Task.resolve(accumulatedPullRequests);
  }

  const {value: pullRequestNumber} = pullRequestNumberMaybe;

  return getPullRequest(options, pullRequestNumber).andThen(pullRequest => {
    return getPullRequests(options, pullRequestNumbers.slice(1), [...accumulatedPullRequests, pullRequest]);
  });
}

export function createWebAppVersionSynchronizationGitHubClient(
  options: CreateWebAppVersionSynchronizationGitHubClientOptions,
): WebAppVersionSynchronizationGitHubClient {
  const githubApiRoot = createGitHubApiRoot(options.githubApiUrl);
  const encodedRepositoryName = encodeRepositoryName(options.githubRepository);
  const readHeaders = createGitHubHeaders(options.githubToken, false);
  const writeHeaders = createGitHubHeaders(options.githubToken, true);
  const pullRequestsEndpoint = new URL(`repos/${encodedRepositoryName}/pulls`, githubApiRoot);
  const pullRequestSearchEndpoint = new URL('search/issues', githubApiRoot);
  const synchronizationSearchQuery = `repo:${options.githubRepository} is:pr (in:body "${synchronizationMarkerSearchTerm}" OR in:title "${synchronizationPullRequestTitleSearchTerm}")`;

  const searchPullRequestsPageOptions = {
    httpClient: options.httpClient,
    endpoint: pullRequestSearchEndpoint,
    headers: readHeaders,
    searchQuery: synchronizationSearchQuery,
    githubToken: options.githubToken,
  };

  const getPullRequestOptions = {
    httpClient: options.httpClient,
    endpoint: pullRequestsEndpoint,
    headers: readHeaders,
    githubToken: options.githubToken,
  };

  return {
    listPullRequests() {
      return searchPullRequestNumbers(searchPullRequestsPageOptions, 1, []).andThen(pullRequestNumbers => {
        return getPullRequests(getPullRequestOptions, pullRequestNumbers, []);
      });
    },

    createPullRequest(createPullRequestOptions) {
      const request = createHttpRequest(
        'post',
        pullRequestsEndpoint,
        writeHeaders,
        Maybe.just(createPullRequestRequestBody(createPullRequestOptions)),
      );
      return requestGitHubJson({
        httpClient: options.httpClient,
        request,
        failureMessage: 'Unable to create WebApp version synchronization pull request',
        githubToken: options.githubToken,
      }).andThen(parseCreatedPullRequest);
    },
  };
}
