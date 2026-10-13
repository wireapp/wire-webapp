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

import {Maybe, maybe, Result, Task, Unit, task} from 'true-myth';
import {match} from 'ts-pattern';
import {z} from 'zod';

import {pullRequestReleaseImpactLabels} from './pullRequestReleaseImpact.ts';
import type {WebAppVersionSynchronizationPullRequest} from './webappVersionSynchronization.ts';

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
import type {HttpClient, HttpRequest} from '../release-github/githubApi.ts';

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
  readonly ensurePullRequestSemVerNoneLabel: (pullRequestNumber: number) => Task<Unit, Error>;
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

type GetPullRequestLabelsOptions = GetPullRequestOptions;

type EnsurePullRequestSemVerNoneLabelOptions = GetPullRequestLabelsOptions & {
  readonly writeHeaders: Readonly<Record<string, string>>;
};

type AddPullRequestLabelOptions = GetPullRequestOptions & {
  readonly pullRequestNumber: number;
};

type PullRequestReleaseImpactLabelState =
  | {readonly kind: 'missing'}
  | {readonly kind: 'correct'}
  | {readonly kind: 'conflict'; readonly conflictingLabels: readonly string[]};

const githubSearchResultLimit = 1000;
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

const githubIssueLabelsResponseSchema = z.array(
  z.object({
    name: z.string().min(1),
  }),
);

const supportedPullRequestReleaseImpactLabels: readonly string[] = Object.values(pullRequestReleaseImpactLabels);

function createSearchPageUrl(endpoint: URL, searchQuery: string, page: number): URL {
  const pageUrl = new URL(endpoint);

  pageUrl.searchParams.set('q', searchQuery);
  pageUrl.searchParams.set('sort', 'created');
  pageUrl.searchParams.set('order', 'asc');

  return createGitHubPageUrl({endpoint: pageUrl, page});
}

function createPullRequestDetailUrl(endpoint: URL, pullRequestNumber: number): URL {
  return new URL(`${pullRequestNumber}`, `${endpoint.toString()}/`);
}

function parsePullRequest(githubResponse: unknown): Result<WebAppVersionSynchronizationPullRequest, Error> {
  const validationResult = githubPullRequestResponseSchema.safeParse(githubResponse);

  if (!validationResult.success) {
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

  if (!validationResult.success) {
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
      const message = formatGitHubRequestError({error, fallbackMessage: 'Unknown failure'});

      return new Error(`${options.failureMessage}: ${redactGitHubSecret(message, options.githubToken)}`, {
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
  const request = createGitHubHttpRequest({
    method: 'get',
    url: createSearchPageUrl(options.endpoint, options.searchQuery, page),
    headers: options.headers,
    json: Maybe.nothing<NonNullable<unknown>>(),
  });
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

    if (parsedSearchPage.rawItemCount !== githubApiPageSize) {
      return Task.reject<readonly number[], Error>(
        new Error('GitHub pull request search pagination ended before all results were retrieved'),
      );
    }

    return searchPullRequestNumbers(options, page + 1, pullRequestNumbers);
  });
}

function combinePullRequestNumbers(
  bodySearchPullRequestNumbers: readonly number[],
  titleSearchPullRequestNumbers: readonly number[],
): readonly number[] {
  return [...new Set([...bodySearchPullRequestNumbers, ...titleSearchPullRequestNumbers])].toSorted(
    (firstPullRequestNumber, secondPullRequestNumber) => {
      return firstPullRequestNumber - secondPullRequestNumber;
    },
  );
}

function getPullRequest(
  options: GetPullRequestOptions,
  pullRequestNumber: number,
): Task<WebAppVersionSynchronizationPullRequest, Error> {
  const request = createGitHubHttpRequest({
    method: 'get',
    url: createPullRequestDetailUrl(options.endpoint, pullRequestNumber),
    headers: options.headers,
    json: Maybe.nothing<NonNullable<unknown>>(),
  });

  return requestGitHubJson({
    httpClient: options.httpClient,
    request,
    failureMessage: `Unable to read GitHub pull request #${pullRequestNumber}`,
    githubToken: options.githubToken,
  }).andThen(parsePullRequest);
}

function createPullRequestLabelsUrl(endpoint: URL, pullRequestNumber: number): URL {
  return new URL(`${pullRequestNumber}/labels`, `${endpoint.toString()}/`);
}

function parsePullRequestLabels(githubResponse: unknown): Result<readonly string[], Error> {
  const validationResult = githubIssueLabelsResponseSchema.safeParse(githubResponse);

  if (!validationResult.success) {
    return Result.err(new Error('Malformed GitHub pull request labels response'));
  }

  return Result.ok(
    validationResult.data.map(label => {
      return label.name;
    }),
  );
}

function getPullRequestLabelsPage(
  options: GetPullRequestLabelsOptions,
  pullRequestNumber: number,
  page: number,
): Task<readonly string[], Error> {
  const labelsUrl = createGitHubPageUrl({
    endpoint: createPullRequestLabelsUrl(options.endpoint, pullRequestNumber),
    page,
  });
  const request = createGitHubHttpRequest({
    method: 'get',
    url: labelsUrl,
    headers: options.headers,
    json: Maybe.nothing<NonNullable<unknown>>(),
  });

  return requestGitHubJson({
    httpClient: options.httpClient,
    request,
    failureMessage: `Unable to read labels for GitHub pull request #${pullRequestNumber}`,
    githubToken: options.githubToken,
  }).andThen(parsePullRequestLabels);
}

function getAllPullRequestLabels(
  options: GetPullRequestLabelsOptions,
  pullRequestNumber: number,
  page: number,
  accumulatedLabels: readonly string[],
): Task<readonly string[], Error> {
  return getPullRequestLabelsPage(options, pullRequestNumber, page).andThen(pageLabels => {
    const labels = [...accumulatedLabels, ...pageLabels];

    if (pageLabels.length < githubApiPageSize) {
      return Task.resolve(labels);
    }

    return getAllPullRequestLabels(options, pullRequestNumber, page + 1, labels);
  });
}

function resolvePullRequestReleaseImpactLabelState(labels: readonly string[]): PullRequestReleaseImpactLabelState {
  const releaseImpactLabels = labels.filter(label => {
    return supportedPullRequestReleaseImpactLabels.includes(label);
  });

  return match(releaseImpactLabels)
    .with([], () => {
      return {kind: 'missing' as const};
    })
    .with([pullRequestReleaseImpactLabels.none], () => {
      return {kind: 'correct' as const};
    })
    .otherwise(conflictingLabels => {
      return {kind: 'conflict' as const, conflictingLabels};
    });
}

function addPullRequestSemVerNoneLabel(options: AddPullRequestLabelOptions): Task<Unit, Error> {
  const labelsUrl = createPullRequestLabelsUrl(options.endpoint, options.pullRequestNumber);
  const request = createGitHubHttpRequest({
    method: 'post',
    url: labelsUrl,
    headers: options.headers,
    json: Maybe.just({labels: [pullRequestReleaseImpactLabels.none]}),
  });

  return requestGitHubJson({
    httpClient: options.httpClient,
    request,
    failureMessage: `Unable to add ${pullRequestReleaseImpactLabels.none} to GitHub pull request #${options.pullRequestNumber}`,
    githubToken: options.githubToken,
  }).andThen(githubResponse => {
    const labelsResult = parsePullRequestLabels(githubResponse);

    if (labelsResult.isErr) {
      return Result.err(labelsResult.error);
    }

    return match(resolvePullRequestReleaseImpactLabelState(labelsResult.value))
      .with({kind: 'correct'}, () => {
        return Result.ok(Unit);
      })
      .with({kind: 'missing'}, () => {
        return Result.err(
          new Error(
            `GitHub did not apply ${pullRequestReleaseImpactLabels.none} to pull request #${options.pullRequestNumber}`,
          ),
        );
      })
      .with({kind: 'conflict'}, labelState => {
        return Result.err(
          new Error(
            `GitHub applied conflicting release-impact labels to pull request #${options.pullRequestNumber}: ${labelState.conflictingLabels.join(', ')}`,
          ),
        );
      })
      .exhaustive();
  });
}

function ensurePullRequestSemVerNoneLabel(
  options: EnsurePullRequestSemVerNoneLabelOptions,
  pullRequestNumber: number,
): Task<Unit, Error> {
  return getAllPullRequestLabels(options, pullRequestNumber, 1, []).andThen(labels => {
    return match(resolvePullRequestReleaseImpactLabelState(labels))
      .with({kind: 'correct'}, () => {
        return Task.resolve(Unit);
      })
      .with({kind: 'conflict'}, labelState => {
        return Task.reject(
          new Error(
            `GitHub pull request #${pullRequestNumber} has conflicting release-impact labels: ${labelState.conflictingLabels.join(', ')}`,
          ),
        );
      })
      .with({kind: 'missing'}, () => {
        return addPullRequestSemVerNoneLabel({
          ...options,
          headers: options.writeHeaders,
          pullRequestNumber,
        });
      })
      .exhaustive();
  });
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
  const encodedRepositoryName = encodeGitHubRepositoryName(options.githubRepository);
  const readHeaders = createGitHubHeaders({githubToken: options.githubToken, includesJsonBody: false});
  const writeHeaders = createGitHubHeaders({githubToken: options.githubToken, includesJsonBody: true});
  const pullRequestsEndpoint = new URL(`repos/${encodedRepositoryName}/pulls`, githubApiRoot);
  const issuesEndpoint = new URL(`repos/${encodedRepositoryName}/issues`, githubApiRoot);
  const pullRequestSearchEndpoint = new URL('search/issues', githubApiRoot);
  const synchronizationMarkerSearchQuery = `repo:${options.githubRepository} is:pr in:body "${synchronizationMarkerSearchTerm}"`;
  const synchronizationTitleSearchQuery = `repo:${options.githubRepository} is:pr in:title "${synchronizationPullRequestTitleSearchTerm}"`;

  const synchronizationMarkerSearchOptions = {
    httpClient: options.httpClient,
    endpoint: pullRequestSearchEndpoint,
    headers: readHeaders,
    searchQuery: synchronizationMarkerSearchQuery,
    githubToken: options.githubToken,
  };

  const synchronizationTitleSearchOptions = {
    httpClient: options.httpClient,
    endpoint: pullRequestSearchEndpoint,
    headers: readHeaders,
    searchQuery: synchronizationTitleSearchQuery,
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
      return searchPullRequestNumbers(synchronizationMarkerSearchOptions, 1, []).andThen(
        synchronizationMarkerPullRequestNumbers => {
          return searchPullRequestNumbers(synchronizationTitleSearchOptions, 1, []).andThen(
            synchronizationTitlePullRequestNumbers => {
              const pullRequestNumbers = combinePullRequestNumbers(
                synchronizationMarkerPullRequestNumbers,
                synchronizationTitlePullRequestNumbers,
              );

              return getPullRequests(getPullRequestOptions, pullRequestNumbers, []);
            },
          );
        },
      );
    },

    createPullRequest(createPullRequestOptions) {
      const request = createGitHubHttpRequest({
        method: 'post',
        url: pullRequestsEndpoint,
        headers: writeHeaders,
        json: Maybe.just(createPullRequestRequestBody(createPullRequestOptions)),
      });
      return requestGitHubJson({
        httpClient: options.httpClient,
        request,
        failureMessage: 'Unable to create WebApp version synchronization pull request',
        githubToken: options.githubToken,
      }).andThen(parseCreatedPullRequest);
    },

    ensurePullRequestSemVerNoneLabel(pullRequestNumber) {
      return ensurePullRequestSemVerNoneLabel(
        {
          httpClient: options.httpClient,
          endpoint: issuesEndpoint,
          headers: readHeaders,
          writeHeaders,
          githubToken: options.githubToken,
        },
        pullRequestNumber,
      );
    },
  };
}
