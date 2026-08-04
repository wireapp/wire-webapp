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

import {createFactory} from '@enormora/objectory';
import type {ShapeToGeneratorReturnValue} from '@enormora/objectory';
import ky from 'ky';
import {Maybe} from 'true-myth';

import {createGitHubClient} from './githubClient.ts';
import type {GitHubClient} from './githubClient.ts';
import {createKyHttpClient} from './httpClient.ts';
import type {HttpClient, HttpRequest, HttpRequestFailure} from './httpClient.ts';

type GitHubPullRequestResponse = {
  readonly number: number;
  readonly merged_at: string | null;
  readonly base: GitHubPullRequestBaseResponse;
  readonly title?: string;
};

type GitHubPullRequestBaseResponse = {
  readonly ref: string;
  readonly label?: string;
};

type GitHubIssueCommentResponse = {
  readonly id: number;
  readonly body: string;
  readonly authorLogin?: string;
};

type FakeHttpClientOptions = {
  readonly responseForRequest: (request: HttpRequest) => unknown;
};

type FakeHttpClientFixture = {
  readonly httpClient: HttpClient;
  readonly requests: HttpRequest[];
};

type GitHubPullRequestResponseFactoryShape = ShapeToGeneratorReturnValue<GitHubPullRequestResponse>;

const githubPullRequestBaseResponseFactory = createFactory<GitHubPullRequestBaseResponse>(
  function createGitHubPullRequestBaseResponse(): GitHubPullRequestBaseResponse {
    return {
      ref: 'main',
      label: 'wireapp:main',
    };
  },
);

const githubPullRequestResponseFactory = createFactory<GitHubPullRequestResponse>(
  function createGitHubPullRequestResponse(): GitHubPullRequestResponseFactoryShape {
    return {
      number: 1,
      merged_at: '2026-07-21T00:00:00Z',
      base: githubPullRequestBaseResponseFactory,
      title: 'Pull request',
    };
  },
);

const githubIssueCommentResponseFactory = createFactory<GitHubIssueCommentResponse>(
  function createGitHubIssueCommentResponse(): GitHubIssueCommentResponse {
    return {
      id: 1,
      body: 'comment',
      authorLogin: 'release-bot',
    };
  },
);

function createPullRequestResponseWithBaseBranch(number: number, baseBranch: string): GitHubPullRequestResponse {
  return githubPullRequestResponseFactory.build({
    number,
    base: githubPullRequestBaseResponseFactory.build({
      ref: baseBranch,
      label: `wireapp:${baseBranch}`,
    }),
  });
}

function createFakeHttpClient(fakeHttpClientOptions: FakeHttpClientOptions): FakeHttpClientFixture {
  const requests: HttpRequest[] = [];
  return {
    requests,
    httpClient: {
      async requestJson(request): Promise<unknown> {
        requests.push(request);
        return fakeHttpClientOptions.responseForRequest(request);
      },
    },
  };
}

function createClient(httpClient: HttpClient, githubToken: string = 'github-token'): GitHubClient {
  return createGitHubClient({
    httpClient,
    githubApiUrl: new URL('https://api.github.example/'),
    githubRepository: 'wireapp/wire-webapp',
    githubToken,
  });
}

function readPage(request: HttpRequest): number {
  const page = Maybe.of(request.url.searchParams.get('page'));
  if (page.isNothing) {
    assert.fail('Expected a page query parameter');
  }

  return Number(page.value);
}

describe('GitHub client', () => {
  it('maps GitHub pull requests into stripped domain records with titles', async () => {
    const fakeHttpClient = createFakeHttpClient({
      responseForRequest() {
        return [githubPullRequestResponseFactory.build({number: 7})];
      },
    });
    const githubClient = createClient(fakeHttpClient.httpClient);

    const actualResult = await githubClient.listPullRequestsForCommit({commitSha: 'commit-sha'});

    assert(actualResult.isOk);
    expect(actualResult.value).toHaveLength(1);
    const pullRequest = Maybe.of(actualResult.value[0]);
    assert(pullRequest.isJust);
    expect(Object.keys(pullRequest.value)).toEqual(['number', 'title', 'baseBranch', 'mergedAt']);
    expect(pullRequest.value.number).toBe(7);
    expect(pullRequest.value.title).toBe('Pull request');
    expect(pullRequest.value.baseBranch).toBe('main');
    assert(pullRequest.value.mergedAt.isJust);
    expect(pullRequest.value.mergedAt.value).toBe('2026-07-21T00:00:00Z');
  });

  it('continues pull request pagination based on raw item count', async () => {
    const firstPage = Array.from({length: 100}, (_, itemIndex) => {
      if (itemIndex === 0) {
        return githubPullRequestResponseFactory.build({number: 1, merged_at: null});
      }

      if (itemIndex === 1) {
        return createPullRequestResponseWithBaseBranch(2, 'feature/unsupported');
      }

      return githubPullRequestResponseFactory.build({number: itemIndex + 1});
    });
    const responsesByPage = new Map<number, unknown>([
      [1, firstPage],
      [2, [githubPullRequestResponseFactory.build({number: 200, title: 'Second page pull request'})]],
    ]);
    const fakeHttpClient = createFakeHttpClient({
      responseForRequest(request) {
        return Maybe.of(responsesByPage.get(readPage(request))).unwrapOr([]);
      },
    });
    const githubClient = createClient(fakeHttpClient.httpClient);

    const actualResult = await githubClient.listPullRequestsForCommit({commitSha: 'commit-sha'});

    assert(actualResult.isOk);
    expect(
      fakeHttpClient.requests.map(request => {
        return readPage(request);
      }),
    ).toEqual([1, 2]);
    expect(
      actualResult.value.some(pullRequest => {
        return pullRequest.number === 200;
      }),
    ).toBe(true);
    expect(
      actualResult.value.some(pullRequest => {
        return pullRequest.number === 200 && pullRequest.title === 'Second page pull request';
      }),
    ).toBe(true);
    expect(
      actualResult.value.some(pullRequest => {
        return pullRequest.number === 1 || pullRequest.number === 2;
      }),
    ).toBe(false);
  });

  it('paginates issue comments and strips unused properties', async () => {
    const firstPage = Array.from({length: 100}, (_, commentIndex) => {
      return githubIssueCommentResponseFactory.build({
        id: commentIndex + 1,
        body: `comment ${commentIndex + 1}`,
      });
    });
    const responsesByPage = new Map<number, unknown>([
      [1, firstPage],
      [2, [githubIssueCommentResponseFactory.build({id: 101, body: 'comment 101'})]],
    ]);
    const fakeHttpClient = createFakeHttpClient({
      responseForRequest(request) {
        return Maybe.of(responsesByPage.get(readPage(request))).unwrapOr([]);
      },
    });
    const githubClient = createClient(fakeHttpClient.httpClient);

    const actualResult = await githubClient.listIssueComments({pullRequestNumber: 9});

    assert(actualResult.isOk);
    expect(actualResult.value).toHaveLength(101);
    expect(actualResult.value[100]).toEqual({id: 101, body: 'comment 101'});
  });

  it('creates and updates issue comments through GitHub endpoints', async () => {
    const fakeHttpClient = createFakeHttpClient({
      responseForRequest(request) {
        return request.json
          .map(json => {
            return {id: request.method === 'post' ? 11 : 12, ...(json as {readonly body: string})};
          })
          .unwrapOr({id: 1, body: ''});
      },
    });
    const githubClient = createClient(fakeHttpClient.httpClient);

    const createResult = await githubClient.createIssueComment({
      pullRequestNumber: 5,
      commentBody: 'created',
    });
    const updateResult = await githubClient.updateIssueComment({
      commentId: 11,
      commentBody: 'updated',
    });

    assert(createResult.isOk);
    expect(createResult.value).toEqual({id: 11, body: 'created'});
    assert(updateResult.isOk);
    expect(updateResult.value).toEqual({id: 12, body: 'updated'});
    const createRequest = Maybe.of(fakeHttpClient.requests[0]);
    const updateRequest = Maybe.of(fakeHttpClient.requests[1]);
    assert(createRequest.isJust);
    assert(updateRequest.isJust);
    expect(createRequest.value.method).toBe('post');
    expect(updateRequest.value.method).toBe('patch');
    expect(createRequest.value.url.toString()).toMatch(/issues\/5\/comments$/);
    expect(updateRequest.value.url.toString()).toMatch(/issues\/comments\/11$/);
  });

  it('exposes GitHub permission diagnostics from a forbidden comment response', async () => {
    const permissionFailure: HttpRequestFailure = {
      kind: 'http-response-failure',
      method: 'post',
      url: new URL('https://api.github.example/repos/wireapp/wire-webapp/issues/5/comments'),
      response: {
        statusCode: 403,
        githubMessage: Maybe.just('Resource not accessible by integration'),
        documentationUrl: Maybe.just('https://docs.github.com/rest/issues/comments#create-an-issue-comment'),
        githubRequestId: Maybe.just('REQUEST-PERMISSION'),
        acceptedGithubPermissions: Maybe.just('issues=write, pull_requests=read'),
        retryAfter: Maybe.nothing<string>(),
        rateLimitRemaining: Maybe.nothing<string>(),
        rateLimitReset: Maybe.nothing<string>(),
      },
    };
    const fakeHttpClient: HttpClient = {
      async requestJson(): Promise<unknown> {
        throw permissionFailure;
      },
    };
    const githubClient = createClient(fakeHttpClient);

    const actualResult = await githubClient.createIssueComment({
      pullRequestNumber: 5,
      commentBody: 'release comment',
    });

    assert(actualResult.isErr);
    expect(actualResult.error.message).toContain('HTTP status: 403');
    expect(actualResult.error.message).toContain('Resource not accessible by integration');
    expect(actualResult.error.message).toContain('GitHub request ID: REQUEST-PERMISSION');
    expect(actualResult.error.message).toContain('Accepted GitHub permissions: issues=write, pull_requests=read');
    expect(actualResult.error.message).not.toContain('release comment');
  });

  it('rejects a GitHub response without a title as malformed', async () => {
    const fakeHttpClient = createFakeHttpClient({
      responseForRequest() {
        return [{number: 1, merged_at: '2026-07-21T00:00:00Z', base: {ref: 'main'}}];
      },
    });
    const githubClient = createClient(fakeHttpClient.httpClient);

    const actualResult = await githubClient.listPullRequestsForCommit({commitSha: 'commit-sha'});

    assert(actualResult.isErr);
    expect(actualResult.error.message).toBe('Malformed GitHub pull request response');
  });

  it('rejects a GitHub response with a non-string title as malformed', async () => {
    const fakeHttpClient = createFakeHttpClient({
      responseForRequest() {
        return [{number: 1, title: 42, merged_at: '2026-07-21T00:00:00Z', base: {ref: 'main'}}];
      },
    });
    const githubClient = createClient(fakeHttpClient.httpClient);

    const actualResult = await githubClient.listPullRequestsForCommit({commitSha: 'commit-sha'});

    assert(actualResult.isErr);
    expect(actualResult.error.message).toBe('Malformed GitHub pull request response');
  });

  it('rejects a GitHub response with an empty title as malformed', async () => {
    const fakeHttpClient = createFakeHttpClient({
      responseForRequest() {
        return [{number: 1, title: '', merged_at: '2026-07-21T00:00:00Z', base: {ref: 'main'}}];
      },
    });
    const githubClient = createClient(fakeHttpClient.httpClient);

    const actualResult = await githubClient.listPullRequestsForCommit({commitSha: 'commit-sha'});

    assert(actualResult.isErr);
    expect(actualResult.error.message).toBe('Malformed GitHub pull request response');
  });

  it('rejects other malformed GitHub responses', async () => {
    const fakeHttpClient = createFakeHttpClient({
      responseForRequest() {
        return [{number: 1, title: 'Pull request', merged_at: 42, base: {ref: 'main'}}];
      },
    });
    const githubClient = createClient(fakeHttpClient.httpClient);

    const actualResult = await githubClient.listPullRequestsForCommit({commitSha: 'commit-sha'});

    assert(actualResult.isErr);
    expect(actualResult.error.message).toBe('Malformed GitHub pull request response');
  });

  it('redacts the GitHub token from transport errors', async () => {
    const githubToken = 'secret-token';
    const githubResponseFailure: HttpRequestFailure = {
      kind: 'http-response-failure',
      method: 'get',
      url: new URL('https://api.github.example/repos/wireapp/wire-webapp/commits/commit-sha/pulls'),
      response: {
        statusCode: 403,
        githubMessage: Maybe.just(`request failed with ${githubToken}`),
        documentationUrl: Maybe.nothing<string>(),
        githubRequestId: Maybe.nothing<string>(),
        acceptedGithubPermissions: Maybe.nothing<string>(),
        retryAfter: Maybe.nothing<string>(),
        rateLimitRemaining: Maybe.nothing<string>(),
        rateLimitReset: Maybe.nothing<string>(),
      },
    };
    const fakeHttpClient: HttpClient = {
      async requestJson(): Promise<unknown> {
        throw githubResponseFailure;
      },
    };
    const githubClient = createClient(fakeHttpClient, githubToken);

    const actualResult = await githubClient.listPullRequestsForCommit({commitSha: 'commit-sha'});

    assert(actualResult.isErr);
    expect(actualResult.error.message).not.toMatch(new RegExp(githubToken));
    expect(actualResult.error.message).toMatch(/\[REDACTED\]/);
  });
});

describe('Ky HTTP client', () => {
  it('disables automatic retries', async () => {
    let fetchCallCount = 0;
    const kyInstance = ky.create({
      fetch: async () => {
        fetchCallCount += 1;
        return new Response('service unavailable', {status: 503});
      },
    });
    const httpClient = createKyHttpClient({kyInstance});

    await expect(
      httpClient.requestJson({
        method: 'get',
        url: new URL('https://api.github.example/retry-check'),
        headers: {},
        json: Maybe.nothing<NonNullable<unknown>>(),
      }),
    ).rejects.toMatchObject({
      kind: 'http-response-failure',
      response: {statusCode: 503},
    });
    expect(fetchCallCount).toBe(1);
  });
});
