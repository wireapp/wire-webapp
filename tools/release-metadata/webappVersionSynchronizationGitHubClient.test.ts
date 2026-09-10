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

import {isUndefined} from '@sindresorhus/is';

import {createWebAppVersionSynchronizationGitHubClient} from './webappVersionSynchronizationGitHubClient.ts';

import type {HttpClient, HttpRequest} from '../release-appearance/httpClient.ts';

const githubToken = 'otto-secret-token';

type CreateGitHubPullRequestResponseOptions = {
  readonly number: number;
  readonly state?: 'open' | 'closed';
  readonly mergedAt?: string | null;
  readonly body?: string | null;
  readonly baseBranch?: string;
  readonly headBranch?: string;
};

function createGitHubPullRequestResponse(options: CreateGitHubPullRequestResponseOptions): Record<string, unknown> {
  const responseBody = isUndefined(options.body) ? '<!-- marker -->' : options.body;

  return {
    number: options.number,
    html_url: `https://github.com/wireapp/wire-webapp/pull/${options.number}`,
    title: 'Update WebApp version to 1.0.0',
    body: responseBody,
    state: options.state ?? 'open',
    merged_at: options.mergedAt ?? null,
    base: {ref: options.baseBranch ?? 'main'},
    head: {ref: options.headBranch ?? 'webapp-version-2026-09-09.1-1.0.0'},
  };
}

function createGitHubPullRequestSearchResponse(
  pullRequestNumbers: readonly number[],
  totalCount: number = pullRequestNumbers.length,
  incompleteResults: boolean = false,
): Record<string, unknown> {
  return {
    total_count: totalCount,
    incomplete_results: incompleteResults,
    items: pullRequestNumbers.map(pullRequestNumber => {
      return {
        number: pullRequestNumber,
        html_url: `https://github.com/wireapp/wire-webapp/pull/${pullRequestNumber}`,
        title: 'Update WebApp version to 1.0.0',
        body: '<!-- wire-webapp-version-sync -->',
        pull_request: {
          url: `https://api.github.example/repos/wireapp/wire-webapp/pulls/${pullRequestNumber}`,
          html_url: `https://github.com/wireapp/wire-webapp/pull/${pullRequestNumber}`,
        },
      };
    }),
  };
}

function createGitHubPullRequestSearchResponseWithoutProperty(
  response: Record<string, unknown>,
  propertyName: string,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(response).filter(([responsePropertyName]) => {
      return responsePropertyName !== propertyName;
    }),
  );
}

function createGitHubPullRequestResponseWithoutProperty(
  response: Record<string, unknown>,
  propertyName: string,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(response).filter(([responsePropertyName]) => {
      return responsePropertyName !== propertyName;
    }),
  );
}

type FakeHttpClient = {
  readonly client: HttpClient;
  readonly requests: HttpRequest[];
};

function createFakeHttpClient(responses: readonly unknown[], failure?: Error): FakeHttpClient {
  let responseIndex = 0;
  const requests: HttpRequest[] = [];

  return {
    requests,
    client: {
      async requestJson(request) {
        requests.push(request);

        if (failure !== undefined) {
          throw failure;
        }

        if (responseIndex >= responses.length) {
          throw new Error('No fake GitHub response configured');
        }

        const response = responses[responseIndex];
        responseIndex += 1;

        return response;
      },
    },
  };
}

function createGitHubClient(
  fakeHttpClient: FakeHttpClient['client'],
): ReturnType<typeof createWebAppVersionSynchronizationGitHubClient> {
  return createWebAppVersionSynchronizationGitHubClient({
    httpClient: fakeHttpClient,
    githubApiUrl: new URL('https://api.github.example/'),
    githubRepository: 'wireapp/wire-webapp',
    githubToken,
  });
}

describe('WebApp version synchronization GitHub client', () => {
  it('lists pull requests and normalizes GitHub fields', async () => {
    const fakeHttpClient = createFakeHttpClient([
      createGitHubPullRequestSearchResponse([42]),
      createGitHubPullRequestResponse({
        number: 42,
        body: null,
        mergedAt: '2026-09-09T12:00:00Z',
        state: 'closed',
      }),
    ]);
    const githubClient = createGitHubClient(fakeHttpClient.client);

    const actualResult = await githubClient.listPullRequests();

    assert(actualResult.isOk);
    expect(actualResult.value).toEqual([
      {
        number: 42,
        url: 'https://github.com/wireapp/wire-webapp/pull/42',
        title: 'Update WebApp version to 1.0.0',
        body: '',
        state: 'closed',
        mergedAt: '2026-09-09T12:00:00Z',
        baseBranch: 'main',
        headBranch: 'webapp-version-2026-09-09.1-1.0.0',
      },
    ]);
    expect(fakeHttpClient.requests[0].url.searchParams).toEqual(
      new URLSearchParams({
        q: 'repo:wireapp/wire-webapp is:pr (in:body "wire-webapp-version-sync" OR in:title "Update WebApp version to")',
        sort: 'created',
        order: 'asc',
        per_page: '100',
        page: '1',
      }),
    );
    expect(fakeHttpClient.requests[1].url.toString()).toBe(
      'https://api.github.example/repos/wireapp/wire-webapp/pulls/42',
    );
  });

  it.each([
    {description: 'open', state: 'open' as const, mergedAt: null},
    {description: 'closed without merging', state: 'closed' as const, mergedAt: null},
  ])('retrieves a $description synchronization pull request through targeted discovery', async options => {
    const fakeHttpClient = createFakeHttpClient([
      createGitHubPullRequestSearchResponse([7]),
      createGitHubPullRequestResponse({number: 7, state: options.state, mergedAt: options.mergedAt}),
    ]);
    const githubClient = createGitHubClient(fakeHttpClient.client);

    const actualResult = await githubClient.listPullRequests();

    assert(actualResult.isOk);
    expect(actualResult.value).toHaveLength(1);
    expect(actualResult.value[0].state).toBe(options.state);
    expect(actualResult.value[0].mergedAt).toBeNull();
    expect(fakeHttpClient.requests).toHaveLength(2);
  });

  it('paginates until a page is shorter than the GitHub page size', async () => {
    const firstPageNumbers = Array.from({length: 100}, (_, index) => {
      return index + 1;
    });
    const pullRequestDetails = Array.from({length: 101}, (_, index) => {
      return createGitHubPullRequestResponse({number: index + 1});
    });
    const fakeHttpClient = createFakeHttpClient([
      createGitHubPullRequestSearchResponse(firstPageNumbers, 101),
      createGitHubPullRequestSearchResponse([101], 101),
      ...pullRequestDetails,
    ]);
    const githubClient = createGitHubClient(fakeHttpClient.client);

    const actualResult = await githubClient.listPullRequests();

    assert(actualResult.isOk);
    expect(actualResult.value).toHaveLength(101);
    expect(fakeHttpClient.requests).toHaveLength(103);
    expect(fakeHttpClient.requests[1].url.searchParams.get('page')).toBe('2');
  });

  it.each([
    {
      description: 'a non-object response',
      response: 'not-an-object',
    },
    {
      description: 'a missing number',
      response: createGitHubPullRequestResponseWithoutProperty(createGitHubPullRequestResponse({number: 42}), 'number'),
    },
    {
      description: 'a non-numeric number',
      response: {...createGitHubPullRequestResponse({number: 42}), number: 'not-a-number'},
    },
    {
      description: 'a zero number',
      response: {...createGitHubPullRequestResponse({number: 42}), number: 0},
    },
    {
      description: 'a fractional number',
      response: {...createGitHubPullRequestResponse({number: 42}), number: 1.5},
    },
    {
      description: 'a missing URL',
      response: createGitHubPullRequestResponseWithoutProperty(
        createGitHubPullRequestResponse({number: 42}),
        'html_url',
      ),
    },
    {
      description: 'an invalid URL',
      response: {...createGitHubPullRequestResponse({number: 42}), html_url: 'not-a-url'},
    },
    {
      description: 'a missing title',
      response: createGitHubPullRequestResponseWithoutProperty(createGitHubPullRequestResponse({number: 42}), 'title'),
    },
    {
      description: 'an empty title',
      response: {...createGitHubPullRequestResponse({number: 42}), title: ''},
    },
    {
      description: 'a non-string title',
      response: {...createGitHubPullRequestResponse({number: 42}), title: 42},
    },
    {
      description: 'a non-string body',
      response: {...createGitHubPullRequestResponse({number: 42}), body: 42},
    },
    {
      description: 'a missing body',
      response: createGitHubPullRequestResponseWithoutProperty(createGitHubPullRequestResponse({number: 42}), 'body'),
    },
    {
      description: 'an invalid state',
      response: {...createGitHubPullRequestResponse({number: 42}), state: 'draft'},
    },
    {
      description: 'a missing state',
      response: createGitHubPullRequestResponseWithoutProperty(createGitHubPullRequestResponse({number: 42}), 'state'),
    },
    {
      description: 'a non-string merged timestamp',
      response: {...createGitHubPullRequestResponse({number: 42}), merged_at: 42},
    },
    {
      description: 'a missing merged timestamp',
      response: createGitHubPullRequestResponseWithoutProperty(
        createGitHubPullRequestResponse({number: 42}),
        'merged_at',
      ),
    },
    {
      description: 'a missing base branch',
      response: createGitHubPullRequestResponseWithoutProperty(createGitHubPullRequestResponse({number: 42}), 'base'),
    },
    {
      description: 'a null base branch',
      response: {...createGitHubPullRequestResponse({number: 42}), base: null},
    },
    {
      description: 'an empty base branch name',
      response: {...createGitHubPullRequestResponse({number: 42}), base: {ref: ''}},
    },
    {
      description: 'a missing base branch name',
      response: {...createGitHubPullRequestResponse({number: 42}), base: {}},
    },
    {
      description: 'a non-string base branch name',
      response: {...createGitHubPullRequestResponse({number: 42}), base: {ref: 42}},
    },
    {
      description: 'a missing head branch',
      response: createGitHubPullRequestResponseWithoutProperty(createGitHubPullRequestResponse({number: 42}), 'head'),
    },
    {
      description: 'a null head branch',
      response: {...createGitHubPullRequestResponse({number: 42}), head: null},
    },
    {
      description: 'an empty head branch name',
      response: {...createGitHubPullRequestResponse({number: 42}), head: {ref: ''}},
    },
    {
      description: 'a missing head branch name',
      response: {...createGitHubPullRequestResponse({number: 42}), head: {}},
    },
    {
      description: 'a non-string head branch name',
      response: {...createGitHubPullRequestResponse({number: 42}), head: {ref: 42}},
    },
  ])('rejects malformed pull request responses: $description', async ({response}) => {
    const fakeHttpClient = createFakeHttpClient([createGitHubPullRequestSearchResponse([42]), response]);
    const githubClient = createGitHubClient(fakeHttpClient.client);

    const actualResult = await githubClient.listPullRequests();

    assert(actualResult.isErr);
    expect(actualResult.error.message).toBe('Malformed GitHub pull request response');
  });

  it.each([
    {
      description: 'a non-object response',
      response: [],
    },
    {
      description: 'a missing total count',
      response: createGitHubPullRequestSearchResponseWithoutProperty(
        createGitHubPullRequestSearchResponse([]),
        'total_count',
      ),
    },
    {
      description: 'a negative total count',
      response: {...createGitHubPullRequestSearchResponse([]), total_count: -1},
    },
    {
      description: 'a missing incomplete-results flag',
      response: createGitHubPullRequestSearchResponseWithoutProperty(
        createGitHubPullRequestSearchResponse([]),
        'incomplete_results',
      ),
    },
    {
      description: 'a non-array item collection',
      response: {...createGitHubPullRequestSearchResponse([]), items: {}},
    },
    {
      description: 'a search item without pull-request metadata',
      response: {
        ...createGitHubPullRequestSearchResponse([42]),
        items: [{number: 42}],
      },
    },
  ])('rejects malformed pull request search responses: $description', async ({response}) => {
    const fakeHttpClient = createFakeHttpClient([response]);
    const githubClient = createGitHubClient(fakeHttpClient.client);

    const actualResult = await githubClient.listPullRequests();

    assert(actualResult.isErr);
    expect(actualResult.error.message).toBe('Malformed GitHub pull request search response');
  });

  it('rejects incomplete search results', async () => {
    const fakeHttpClient = createFakeHttpClient([createGitHubPullRequestSearchResponse([], 0, true)]);
    const githubClient = createGitHubClient(fakeHttpClient.client);

    const actualResult = await githubClient.listPullRequests();

    assert(actualResult.isErr);
    expect(actualResult.error.message).toBe('GitHub pull request search returned incomplete results');
  });

  it('rejects search results beyond the GitHub result limit', async () => {
    const fakeHttpClient = createFakeHttpClient([createGitHubPullRequestSearchResponse([], 1001)]);
    const githubClient = createGitHubClient(fakeHttpClient.client);

    const actualResult = await githubClient.listPullRequests();

    assert(actualResult.isErr);
    expect(actualResult.error.message).toBe('GitHub pull request search returned more than 1000 results');
  });

  it('rejects a short search page before all reported results are retrieved', async () => {
    const fakeHttpClient = createFakeHttpClient([createGitHubPullRequestSearchResponse([42], 101)]);
    const githubClient = createGitHubClient(fakeHttpClient.client);

    const actualResult = await githubClient.listPullRequests();

    assert(actualResult.isErr);
    expect(actualResult.error.message).toBe(
      'GitHub pull request search pagination ended before all results were retrieved',
    );
  });

  it('uses targeted search instead of enumerating repository pull requests', async () => {
    const fakeHttpClient = createFakeHttpClient([createGitHubPullRequestSearchResponse([])]);
    const githubClient = createGitHubClient(fakeHttpClient.client);

    const actualResult = await githubClient.listPullRequests();

    assert(actualResult.isOk);
    expect(fakeHttpClient.requests).toHaveLength(1);
    expect(fakeHttpClient.requests[0].url.pathname).toBe('/search/issues');
    expect(fakeHttpClient.requests[0].url.searchParams.get('q')).toBe(
      'repo:wireapp/wire-webapp is:pr (in:body "wire-webapp-version-sync" OR in:title "Update WebApp version to")',
    );
  });

  it('rejects a malformed created pull request response', async () => {
    const fakeHttpClient = createFakeHttpClient([{...createGitHubPullRequestResponse({number: 84}), head: {ref: 42}}]);
    const githubClient = createGitHubClient(fakeHttpClient.client);

    const actualResult = await githubClient.createPullRequest({
      title: 'Update WebApp version to 1.0.0',
      body: 'created body',
      headBranch: 'webapp-version-2026-09-09.1-1.0.0',
    });

    assert(actualResult.isErr);
    expect(actualResult.error.message).toBe('Malformed GitHub created pull request response');
  });

  it('creates a pull request against main with the supplied body and branch', async () => {
    const fakeHttpClient = createFakeHttpClient([createGitHubPullRequestResponse({number: 84, body: 'created body'})]);
    const githubClient = createGitHubClient(fakeHttpClient.client);

    const actualResult = await githubClient.createPullRequest({
      title: 'Update WebApp version to 1.0.0',
      body: 'created body',
      headBranch: 'webapp-version-2026-09-09.1-1.0.0',
    });

    assert(actualResult.isOk);
    expect(actualResult.value.number).toBe(84);
    expect(fakeHttpClient.requests).toHaveLength(1);
    expect(fakeHttpClient.requests[0].method).toBe('post');
    expect(fakeHttpClient.requests[0].url.toString()).toBe(
      'https://api.github.example/repos/wireapp/wire-webapp/pulls',
    );
    expect(fakeHttpClient.requests[0].headers.Authorization).toBe(`Bearer ${githubToken}`);
    assert(fakeHttpClient.requests[0].json.isJust);
    expect(fakeHttpClient.requests[0].json.value).toEqual({
      title: 'Update WebApp version to 1.0.0',
      head: 'webapp-version-2026-09-09.1-1.0.0',
      base: 'main',
      body: 'created body',
    });
  });

  it('redacts the GitHub token from transport failures', async () => {
    const fakeHttpClient = createFakeHttpClient([], new Error(`GitHub rejected ${githubToken}`));
    const githubClient = createGitHubClient(fakeHttpClient.client);

    const actualResult = await githubClient.listPullRequests();

    assert(actualResult.isErr);
    expect(actualResult.error.message).not.toContain(githubToken);
    expect(actualResult.error.message).toContain('[REDACTED]');
  });
});
