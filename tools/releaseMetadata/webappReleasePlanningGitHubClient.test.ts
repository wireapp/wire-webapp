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

import assert from 'node:assert';

import {Maybe} from 'true-myth';

import type {HttpClient, HttpRequest} from '../releaseGithub/githubApi.ts';
import {
  createWebAppReleasePlanningGitHubClient,
  type WebAppReleasePlanningGitHubClient,
} from './webappReleasePlanningGitHubClient.ts';

type PullRequestResponseOptions = {
  readonly number: number;
  readonly title: string;
  readonly baseBranch: string;
  readonly mergedAt: string | null;
  readonly labels: readonly unknown[];
};

type FakeHttpClientOptions = {
  readonly responseForRequest: (request: HttpRequest) => unknown | Promise<unknown>;
};

type FakeHttpClient = {
  readonly httpClient: HttpClient;
  readonly requests: HttpRequest[];
};

function createPullRequestResponse(options: PullRequestResponseOptions): Readonly<Record<string, unknown>> {
  return {
    number: options.number,
    title: options.title,
    base: {ref: options.baseBranch},
    merged_at: options.mergedAt,
    labels: options.labels,
  };
}

function createValidPullRequestResponse(
  options: Partial<PullRequestResponseOptions> = {},
): Readonly<Record<string, unknown>> {
  return createPullRequestResponse({
    number: options.number ?? 42,
    title: options.title ?? 'Add a release planning feature',
    baseBranch: options.baseBranch ?? 'main',
    mergedAt: options.mergedAt ?? '2026-10-12T08:00:00Z',
    labels: options.labels ?? [{name: 'semver:minor'}],
  });
}

function createFakeHttpClient(options: FakeHttpClientOptions): FakeHttpClient {
  const requests: HttpRequest[] = [];

  return {
    requests,
    httpClient: {
      async requestJson(request) {
        requests.push(request);

        return options.responseForRequest(request);
      },
    },
  };
}

function createClient(httpClient: HttpClient, githubToken = 'github-token'): WebAppReleasePlanningGitHubClient {
  return createWebAppReleasePlanningGitHubClient({
    httpClient,
    githubApiUrl: new URL('https://api.github.example/'),
    githubRepository: 'wireapp/wire-webapp',
    githubToken,
  });
}

describe('WebApp release planning GitHub client', () => {
  it('maps a valid merged pull request and its labels into domain data', async () => {
    const fakeHttpClient = createFakeHttpClient({
      responseForRequest() {
        return [createValidPullRequestResponse({labels: [{name: 'semver:minor'}, {name: 'product'}]})];
      },
    });
    const githubClient = createClient(fakeHttpClient.httpClient);

    const actualPullRequestsResult = await githubClient.listPullRequestsForCommit({commitSha: 'a'.repeat(40)});

    assert(actualPullRequestsResult.isOk);
    expect(actualPullRequestsResult.value).toEqual([
      {
        number: 42,
        title: 'Add a release planning feature',
        baseBranch: 'main',
        mergedAt: Maybe.just('2026-10-12T08:00:00Z'),
        labels: ['semver:minor', 'product'],
      },
    ]);
    const actualRequest = fakeHttpClient.requests.at(0);
    assert(actualRequest !== undefined);
    expect(actualRequest.method).toBe('get');
    expect(actualRequest.url.pathname).toBe(
      '/repos/wireapp/wire-webapp/commits/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/pulls',
    );
    expect(actualRequest.headers.Authorization).toBe('Bearer github-token');
  });

  it('supports pagination based on the raw response item count', async () => {
    const firstPage = Array.from({length: 100}, (_, itemIndex) => {
      return createValidPullRequestResponse({number: itemIndex + 1, mergedAt: null, labels: []});
    });
    const fakeHttpClient = createFakeHttpClient({
      responseForRequest(request): unknown {
        return request.url.searchParams.get('page') === '1' ? firstPage : [createValidPullRequestResponse()];
      },
    });
    const githubClient = createClient(fakeHttpClient.httpClient);

    const actualPullRequestsResult = await githubClient.listPullRequestsForCommit({commitSha: 'b'.repeat(40)});

    assert(actualPullRequestsResult.isOk);
    expect(actualPullRequestsResult.value).toHaveLength(101);
    expect(
      fakeHttpClient.requests.map(request => {
        return request.url.searchParams.get('page');
      }),
    ).toEqual(['1', '2']);
  });

  it('rejects a malformed pull request response', async () => {
    const fakeHttpClient = createFakeHttpClient({
      responseForRequest() {
        return {pull_requests: []};
      },
    });
    const githubClient = createClient(fakeHttpClient.httpClient);

    const actualPullRequestsResult = await githubClient.listPullRequestsForCommit({commitSha: 'c'.repeat(40)});

    assert(actualPullRequestsResult.isErr);
    expect(actualPullRequestsResult.error.message).toBe('Malformed GitHub pull request response');
  });

  it('rejects pull requests with malformed labels', async () => {
    const fakeHttpClient = createFakeHttpClient({
      responseForRequest() {
        return [createValidPullRequestResponse({labels: [{name: 123}]})];
      },
    });
    const githubClient = createClient(fakeHttpClient.httpClient);

    const actualPullRequestsResult = await githubClient.listPullRequestsForCommit({commitSha: 'd'.repeat(40)});

    assert(actualPullRequestsResult.isErr);
    expect(actualPullRequestsResult.error.message).toBe('Malformed GitHub pull request response');
  });

  it('redacts the GitHub token from HTTP failures', async () => {
    const githubToken = 'secret-github-token';
    const fakeHttpClient = createFakeHttpClient({
      responseForRequest() {
        throw new Error(`Request failed with ${githubToken}`);
      },
    });
    const githubClient = createClient(fakeHttpClient.httpClient, githubToken);

    const actualPullRequestsResult = await githubClient.listPullRequestsForCommit({commitSha: 'e'.repeat(40)});

    assert(actualPullRequestsResult.isErr);
    expect(actualPullRequestsResult.error.message).not.toContain(githubToken);
    expect(actualPullRequestsResult.error.message).toContain('[REDACTED]');
  });
});
