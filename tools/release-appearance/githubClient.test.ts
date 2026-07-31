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
import type {HttpClient, HttpRequest} from './httpClient.ts';

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

test('maps GitHub pull requests into stripped domain records', async () => {
  const fakeHttpClient = createFakeHttpClient({
    responseForRequest() {
      return [githubPullRequestResponseFactory.build({number: 7})];
    },
  });
  const githubClient = createClient(fakeHttpClient.httpClient);

  const actualResult = await githubClient.listPullRequestsForCommit({commitSha: 'commit-sha'});

  assert(actualResult.isOk);
  assert.equal(actualResult.value.length, 1);
  const pullRequest = Maybe.of(actualResult.value[0]);
  assert(pullRequest.isJust);
  assert.deepStrictEqual(Object.keys(pullRequest.value), ['number', 'baseBranch', 'mergedAt']);
  assert.equal(pullRequest.value.number, 7);
  assert.equal(pullRequest.value.baseBranch, 'main');
  assert(pullRequest.value.mergedAt.isJust);
  assert.equal(pullRequest.value.mergedAt.value, '2026-07-21T00:00:00Z');
});

test('continues pull request pagination based on raw item count', async () => {
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
    [2, [githubPullRequestResponseFactory.build({number: 200})]],
  ]);
  const fakeHttpClient = createFakeHttpClient({
    responseForRequest(request) {
      return Maybe.of(responsesByPage.get(readPage(request))).unwrapOr([]);
    },
  });
  const githubClient = createClient(fakeHttpClient.httpClient);

  const actualResult = await githubClient.listPullRequestsForCommit({commitSha: 'commit-sha'});

  assert(actualResult.isOk);
  assert.deepStrictEqual(
    fakeHttpClient.requests.map(request => {
      return readPage(request);
    }),
    [1, 2],
  );
  assert.equal(
    actualResult.value.some(pullRequest => {
      return pullRequest.number === 200;
    }),
    true,
  );
});

test('paginates issue comments and strips unused properties', async () => {
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
  assert.equal(actualResult.value.length, 101);
  assert.deepStrictEqual(actualResult.value[100], {id: 101, body: 'comment 101'});
});

test('creates and updates issue comments through GitHub endpoints', async () => {
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
  assert.deepStrictEqual(createResult.value, {id: 11, body: 'created'});
  assert(updateResult.isOk);
  assert.deepStrictEqual(updateResult.value, {id: 12, body: 'updated'});
  const createRequest = Maybe.of(fakeHttpClient.requests[0]);
  const updateRequest = Maybe.of(fakeHttpClient.requests[1]);
  assert(createRequest.isJust);
  assert(updateRequest.isJust);
  assert.equal(createRequest.value.method, 'post');
  assert.equal(updateRequest.value.method, 'patch');
  assert.match(createRequest.value.url.toString(), /issues\/5\/comments$/);
  assert.match(updateRequest.value.url.toString(), /issues\/comments\/11$/);
});

test('rejects malformed GitHub responses', async () => {
  const fakeHttpClient = createFakeHttpClient({
    responseForRequest() {
      return [{number: 1, merged_at: 42, base: {ref: 'main'}}];
    },
  });
  const githubClient = createClient(fakeHttpClient.httpClient);

  const actualResult = await githubClient.listPullRequestsForCommit({commitSha: 'commit-sha'});

  assert(actualResult.isErr);
  assert.equal(actualResult.error.message, 'Malformed GitHub pull request response');
});

test('redacts the GitHub token from transport errors', async () => {
  const githubToken = 'secret-token';
  const fakeHttpClient: HttpClient = {
    async requestJson(): Promise<unknown> {
      throw new Error(`request failed with ${githubToken}`);
    },
  };
  const githubClient = createClient(fakeHttpClient, githubToken);

  const actualResult = await githubClient.listPullRequestsForCommit({commitSha: 'commit-sha'});

  assert(actualResult.isErr);
  assert.doesNotMatch(actualResult.error.message, new RegExp(githubToken));
  assert.match(actualResult.error.message, /\[REDACTED\]/);
});

test('Ky adapter disables automatic retries', async () => {
  let fetchCallCount = 0;
  const kyInstance = ky.create({
    fetch: async () => {
      fetchCallCount += 1;
      return new Response('service unavailable', {status: 503});
    },
  });
  const httpClient = createKyHttpClient({kyInstance});

  await assert.rejects(async () => {
    await httpClient.requestJson({
      method: 'get',
      url: new URL('https://api.github.example/retry-check'),
      headers: {},
      json: Maybe.nothing<NonNullable<unknown>>(),
    });
  });
  assert.equal(fetchCallCount, 1);
});
