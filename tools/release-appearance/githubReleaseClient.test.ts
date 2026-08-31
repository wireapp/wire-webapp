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

import {createGitHubReleaseClient} from './githubReleaseClient.ts';
import type {HttpRequest, HttpRequestFailure} from './httpClient.ts';

type FakeHttpClientOptions = {
  readonly responseForRequest: (request: HttpRequest) => unknown;
};

type FakeHttpClientFixture = {
  readonly httpClient: {
    readonly requestJson: (request: HttpRequest) => Promise<unknown>;
  };
  readonly requests: HttpRequest[];
};

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

function createHttpResponseFailure(statusCode: number): HttpRequestFailure {
  return {
    kind: 'http-response-failure',
    method: 'get',
    url: new URL('https://api.github.example/'),
    response: {
      statusCode,
      githubMessage: Maybe.nothing<string>(),
      documentationUrl: Maybe.nothing<string>(),
      githubRequestId: Maybe.nothing<string>(),
      acceptedGithubPermissions: Maybe.nothing<string>(),
      retryAfter: Maybe.nothing<string>(),
      rateLimitRemaining: Maybe.nothing<string>(),
      rateLimitReset: Maybe.nothing<string>(),
    },
  };
}

function createClient(fakeHttpClient: FakeHttpClientFixture['httpClient'] = createFakeHttpClient({
  responseForRequest() {
    return [];
  },
}).httpClient): ReturnType<typeof createGitHubReleaseClient> {
  return createGitHubReleaseClient({
    httpClient: fakeHttpClient,
    githubApiUrl: new URL('https://api.github.example/'),
    githubRepository: 'wireapp/wire-webapp',
    githubToken: 'github-token',
  });
}

describe('GitHub Release client', () => {
  it('lists all GitHub tag names with pagination', async () => {
    const firstPage = Array.from({length: 100}, (_, tagIndex) => {
      return {name: `tag-${tagIndex + 1}`};
    });
    const fakeHttpClient = createFakeHttpClient({
      responseForRequest(request) {
        return request.url.searchParams.get('page') === '1' ? firstPage : [{name: 'tag-101'}];
      },
    });
    const githubReleaseClient = createClient(fakeHttpClient.httpClient);

    const actualResult = await githubReleaseClient.listTagNames();

    assert(actualResult.isOk);
    expect(actualResult.value).toHaveLength(101);
    expect(actualResult.value[100]).toBe('tag-101');
    expect(
      fakeHttpClient.requests.map(request => {
        return request.url.toString();
      }),
    ).toEqual([
      'https://api.github.example/repos/wireapp/wire-webapp/tags?per_page=100&page=1',
      'https://api.github.example/repos/wireapp/wire-webapp/tags?per_page=100&page=2',
    ]);
  });

  it('maps an existing GitHub Release and treats a missing release as absent', async () => {
    const productionTagName = '2026-08-28.1-production';
    const existingRelease = {
      tag_name: productionTagName,
      html_url: `https://github.com/wireapp/wire-webapp/releases/tag/${productionTagName}`,
      draft: true,
    };
    const fakeHttpClient = createFakeHttpClient({
      responseForRequest(request) {
        if (request.url.pathname.endsWith('/2026-08-28.1-production')) {
          return existingRelease;
        }

        throw createHttpResponseFailure(404);
      },
    });
    const githubReleaseClient = createClient(fakeHttpClient.httpClient);

    const existingReleaseResult = await githubReleaseClient.findReleaseByTag({tagName: productionTagName});
    const missingReleaseResult = await githubReleaseClient.findReleaseByTag({tagName: '2026-09-01.1-production'});

    assert(existingReleaseResult.isOk);
    expect(existingReleaseResult.value).toEqual(
      Maybe.just({
        tagName: productionTagName,
        htmlUrl: existingRelease.html_url,
        isDraft: true,
      }),
    );
    assert(missingReleaseResult.isOk);
    expect(missingReleaseResult.value.isNothing).toBe(true);
  });

  it('requests GitHub-generated notes from the preceding Production tag', async () => {
    const fakeHttpClient = createFakeHttpClient({
      responseForRequest(request) {
        return {
          tag_name: '2026-08-28.1-production',
          html_url: 'https://github.com/wireapp/wire-webapp/releases/tag/2026-08-28.1-production',
          draft: true,
        };
      },
    });
    const githubReleaseClient = createClient(fakeHttpClient.httpClient);

    const actualResult = await githubReleaseClient.createProductionDraft({
      productionTagName: '2026-08-28.1-production',
      precedingProductionTagName: Maybe.just('2026-08-07.1-production'),
    });

    assert(actualResult.isOk);
    const request = Maybe.of(fakeHttpClient.requests[0]);
    assert(request.isJust);
    expect(request.value.method).toBe('post');
    expect(request.value.url.toString()).toBe('https://api.github.example/repos/wireapp/wire-webapp/releases');
    expect(request.value.json).toEqual(
      Maybe.just({
        tag_name: '2026-08-28.1-production',
        name: '2026-08-28.1-production',
        draft: true,
        generate_release_notes: true,
        previous_tag_name: '2026-08-07.1-production',
      }),
    );
  });

  it('uses a deterministic manual placeholder when no preceding Production tag exists', async () => {
    const fakeHttpClient = createFakeHttpClient({
      responseForRequest() {
        return {
          tag_name: '2026-07-27.1-production',
          html_url: 'https://github.com/wireapp/wire-webapp/releases/tag/2026-07-27.1-production',
          draft: true,
        };
      },
    });
    const githubReleaseClient = createClient(fakeHttpClient.httpClient);

    const actualResult = await githubReleaseClient.createProductionDraft({
      productionTagName: '2026-07-27.1-production',
      precedingProductionTagName: Maybe.nothing(),
    });

    assert(actualResult.isOk);
    const request = Maybe.of(fakeHttpClient.requests[0]);
    assert(request.isJust);
    expect(request.value.json).toEqual(
      Maybe.just({
        tag_name: '2026-07-27.1-production',
        name: '2026-07-27.1-production',
        draft: true,
        body: 'No preceding ADR Production release was found. Add the customer-facing changelog manually before publication.',
      }),
    );
  });

  it('rejects malformed GitHub Release responses at the API boundary', async () => {
    const fakeHttpClient = createFakeHttpClient({
      responseForRequest() {
        return {tag_name: '2026-08-28.1-production', draft: true};
      },
    });
    const githubReleaseClient = createClient(fakeHttpClient.httpClient);

    const actualResult = await githubReleaseClient.findReleaseByTag({tagName: '2026-08-28.1-production'});

    assert(actualResult.isErr);
    expect(actualResult.error.message).toBe('Malformed GitHub Release response');
  });
});
