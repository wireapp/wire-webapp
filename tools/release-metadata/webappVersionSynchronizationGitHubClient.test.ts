/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import assert from 'node:assert';

import {Maybe, Unit} from 'true-myth';

import {createWebAppVersionSynchronizationGitHubClient} from './webappVersionSynchronizationGitHubClient.ts';

import type {HttpClient, HttpRequest} from '../release-github/githubApi.ts';

type FakeHttpClient = {
  readonly client: HttpClient;
  readonly requests: HttpRequest[];
};

function createFakeHttpClient(responses: readonly unknown[]): FakeHttpClient {
  let responseIndex = 0;
  const requests: HttpRequest[] = [];

  return {
    requests,
    client: {
      async requestJson(request) {
        requests.push(request);

        const response = responses[responseIndex];
        responseIndex += 1;
        if (response === undefined) {
          throw new Error('No fake GitHub response configured');
        }

        return response;
      },
    },
  };
}

function createGitHubPullRequest(number: number, body: string): Record<string, unknown> {
  return {
    number,
    html_url: `https://github.com/wireapp/wire-webapp/pull/${number}`,
    title: 'Update WebApp version to 1.1.0',
    body,
    state: 'open',
    merged_at: null,
    base: {ref: 'main'},
    head: {ref: 'webapp-version-1.1.0'},
  };
}

function createGitHubClient(httpClient: HttpClient): ReturnType<typeof createWebAppVersionSynchronizationGitHubClient> {
  return createWebAppVersionSynchronizationGitHubClient({
    httpClient,
    githubApiUrl: new URL('https://api.github.example/'),
    githubRepository: 'wireapp/wire-webapp',
    githubToken: 'otto-secret-token',
  });
}

function createSearchResponse(pullRequestNumbers: readonly number[]): Record<string, unknown> {
  return {
    total_count: pullRequestNumbers.length,
    incomplete_results: false,
    items: pullRequestNumbers.map(number => {
      return {
        number,
        html_url: `https://github.com/wireapp/wire-webapp/pull/${number}`,
        title: 'Update WebApp version to 1.1.0',
        body: '<!-- wire-webapp-version-sync:semver production-tag=v1.1.0 version=1.1.0 -->',
        pull_request: {
          url: `https://api.github.example/repos/wireapp/wire-webapp/pulls/${number}`,
          html_url: `https://github.com/wireapp/wire-webapp/pull/${number}`,
        },
      };
    }),
  };
}

describe('WebApp version synchronization GitHub client', () => {
  it('searches only for the durable SemVer synchronization marker', async () => {
    const pullRequestBody = '<!-- wire-webapp-version-sync:semver production-tag=v1.1.0 version=1.1.0 -->';
    const fakeHttpClient = createFakeHttpClient([
      createSearchResponse([42]),
      createGitHubPullRequest(42, pullRequestBody),
    ]);
    const githubClient = createGitHubClient(fakeHttpClient.client);

    const actualResult = await githubClient.listPullRequests().toPromise();

    assert(actualResult.isOk);
    expect(actualResult.value).toHaveLength(1);
    expect(actualResult.value[0]).toMatchObject({
      number: 42,
      state: 'open',
      baseBranch: 'main',
      headBranch: 'webapp-version-1.1.0',
    });
    expect(fakeHttpClient.requests).toHaveLength(2);
    expect(fakeHttpClient.requests[0]?.url.searchParams.get('q')).toBe(
      'repo:wireapp/wire-webapp is:pr in:body "wire-webapp-version-sync:semver"',
    );
  });

  it('does not discover historical synchronization requests by title', async () => {
    const fakeHttpClient = createFakeHttpClient([
      {
        total_count: 0,
        incomplete_results: false,
        items: [],
      },
    ]);
    const githubClient = createGitHubClient(fakeHttpClient.client);

    const actualResult = await githubClient.listPullRequests().toPromise();

    assert(actualResult.isOk);
    expect(actualResult.value).toEqual([]);
    expect(fakeHttpClient.requests).toHaveLength(1);
  });

  it('adds semver:none when a synchronization pull request has no release-impact label', async () => {
    const fakeHttpClient = createFakeHttpClient([[{name: 'triage'}], [{name: 'triage'}, {name: 'semver:none'}]]);
    const githubClient = createGitHubClient(fakeHttpClient.client);

    const actualResult = await githubClient.ensurePullRequestSemVerNoneLabel(42).toPromise();

    assert(actualResult.isOk);
    expect(actualResult.value).toBe(Unit);
    expect(
      fakeHttpClient.requests.map(request => {
        return request.method;
      }),
    ).toEqual(['get', 'post']);
    expect(fakeHttpClient.requests[1]?.json).toEqual(Maybe.just({labels: ['semver:none']}));
  });

  it('does not rewrite an already correct semver:none label', async () => {
    const fakeHttpClient = createFakeHttpClient([[{name: 'semver:none'}, {name: 'triage'}]]);
    const githubClient = createGitHubClient(fakeHttpClient.client);

    const actualResult = await githubClient.ensurePullRequestSemVerNoneLabel(43).toPromise();

    assert(actualResult.isOk);
    expect(fakeHttpClient.requests).toHaveLength(1);
    expect(fakeHttpClient.requests[0]?.method).toBe('get');
  });

  it('fails when a synchronization pull request has conflicting release-impact labels', async () => {
    const fakeHttpClient = createFakeHttpClient([[{name: 'semver:none'}, {name: 'semver:patch'}]]);
    const githubClient = createGitHubClient(fakeHttpClient.client);

    const actualResult = await githubClient.ensurePullRequestSemVerNoneLabel(44).toPromise();

    assert(actualResult.isErr);
    expect(actualResult.error.message).toContain('conflicting release-impact labels');
    expect(fakeHttpClient.requests).toHaveLength(1);
  });
});
