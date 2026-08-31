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

type FakeHttpClient = {
  readonly requestJson: (request: HttpRequest) => Promise<unknown>;
};

type FakeHttpClientFixture = {
  readonly httpClient: FakeHttpClient;
  readonly requests: HttpRequest[];
};

type GitHubReleaseResponse = {
  readonly tag_name: string;
  readonly html_url: string;
  readonly draft: boolean;
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

function createReleaseResponse(tagName: string, isDraft: boolean): GitHubReleaseResponse {
  return {
    tag_name: tagName,
    html_url: `https://github.com/wireapp/wire-webapp/releases/tag/${tagName}`,
    draft: isDraft,
  };
}

function createClient(
  fakeHttpClient: FakeHttpClientFixture['httpClient'] = createFakeHttpClient({
    responseForRequest() {
      return [];
    },
  }).httpClient,
): ReturnType<typeof createGitHubReleaseClient> {
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

  it('finds an existing draft GitHub Release in the releases collection', async () => {
    const productionTagName = '2026-08-28.1-production';
    const existingRelease = createReleaseResponse(productionTagName, true);
    const fakeHttpClient = createFakeHttpClient({
      responseForRequest() {
        return [existingRelease];
      },
    });
    const githubReleaseClient = createClient(fakeHttpClient.httpClient);

    const existingReleaseResult = await githubReleaseClient.findReleaseByTag({tagName: productionTagName});

    assert(existingReleaseResult.isOk);
    expect(existingReleaseResult.value).toEqual(
      Maybe.just({
        tagName: productionTagName,
        htmlUrl: existingRelease.html_url,
        isDraft: true,
      }),
    );
    expect(fakeHttpClient.requests[0]?.url.toString()).toBe(
      'https://api.github.example/repos/wireapp/wire-webapp/releases?per_page=100&page=1',
    );
  });

  it('finds an existing published GitHub Release in the releases collection', async () => {
    const productionTagName = '2026-08-28.1-production';
    const existingRelease = createReleaseResponse(productionTagName, false);
    const fakeHttpClient = createFakeHttpClient({
      responseForRequest() {
        return [existingRelease];
      },
    });
    const githubReleaseClient = createClient(fakeHttpClient.httpClient);

    const existingReleaseResult = await githubReleaseClient.findReleaseByTag({tagName: productionTagName});

    assert(existingReleaseResult.isOk);
    expect(existingReleaseResult.value).toEqual(
      Maybe.just({
        tagName: productionTagName,
        htmlUrl: existingRelease.html_url,
        isDraft: false,
      }),
    );
  });

  it('finds a matching release on a later page and stops fetching after the match', async () => {
    const productionTagName = '2026-08-28.1-production';
    const firstPage = Array.from({length: 100}, (_, releaseIndex) => {
      return createReleaseResponse(`release-${releaseIndex + 1}`, false);
    });
    const secondPage = [
      createReleaseResponse(productionTagName, true),
      ...Array.from({length: 99}, (_, releaseIndex) => {
        return createReleaseResponse(`later-release-${releaseIndex + 1}`, false);
      }),
    ];
    const fakeHttpClient = createFakeHttpClient({
      responseForRequest(request) {
        const page = request.url.searchParams.get('page');

        if (page === '1') {
          return firstPage;
        }

        if (page === '2') {
          return secondPage;
        }

        throw new Error('The releases collection was fetched after the matching release was found.');
      },
    });
    const githubReleaseClient = createClient(fakeHttpClient.httpClient);

    const actualResult = await githubReleaseClient.findReleaseByTag({tagName: productionTagName});

    assert(actualResult.isOk);
    expect(actualResult.value.isJust).toBe(true);
    expect(
      fakeHttpClient.requests.map(request => {
        return request.url.searchParams.get('page');
      }),
    ).toEqual(['1', '2']);
  });

  it('returns no release after the releases collection is exhausted', async () => {
    const firstPage = Array.from({length: 100}, (_, releaseIndex) => {
      return createReleaseResponse(`release-${releaseIndex + 1}`, false);
    });
    const fakeHttpClient = createFakeHttpClient({
      responseForRequest(request) {
        return request.url.searchParams.get('page') === '1'
          ? firstPage
          : [createReleaseResponse('other-release', false)];
      },
    });
    const githubReleaseClient = createClient(fakeHttpClient.httpClient);

    const actualResult = await githubReleaseClient.findReleaseByTag({tagName: '2026-08-28.1-production'});

    assert(actualResult.isOk);
    expect(actualResult.value.isNothing).toBe(true);
    expect(fakeHttpClient.requests).toHaveLength(2);
  });

  it('requests generated GitHub Release notes with the explicit Production range', async () => {
    const generatedReleaseNotes = {
      name: 'Generated Production release',
      body: '## Changes\n\n- Generated change',
    };
    const fakeHttpClient = createFakeHttpClient({
      responseForRequest(request) {
        expect(request.method).toBe('post');
        expect(request.url.toString()).toBe(
          'https://api.github.example/repos/wireapp/wire-webapp/releases/generate-notes',
        );
        return generatedReleaseNotes;
      },
    });
    const githubReleaseClient = createClient(fakeHttpClient.httpClient);

    const actualResult = await githubReleaseClient.generateReleaseNotes({
      productionTagName: '2026-08-28.1-production',
      precedingProductionTagName: '2026-08-07.1-production',
    });

    assert(actualResult.isOk);
    expect(actualResult.value).toEqual(generatedReleaseNotes);
    const request = Maybe.of(fakeHttpClient.requests[0]);
    assert(request.isJust);
    expect(request.value.json).toEqual(
      Maybe.just({
        tag_name: '2026-08-28.1-production',
        previous_tag_name: '2026-08-07.1-production',
      }),
    );
  });

  it('passes the supplied generated body to draft release creation', async () => {
    const productionTagName = '2026-08-28.1-production';
    const generatedBody = '## Changes\n\n- Generated change';
    const fakeHttpClient = createFakeHttpClient({
      responseForRequest() {
        return createReleaseResponse(productionTagName, true);
      },
    });
    const githubReleaseClient = createClient(fakeHttpClient.httpClient);

    const actualResult = await githubReleaseClient.createDraftRelease({
      productionTagName,
      body: generatedBody,
    });

    assert(actualResult.isOk);
    const request = Maybe.of(fakeHttpClient.requests[0]);
    assert(request.isJust);
    expect(request.value.json).toEqual(
      Maybe.just({
        tag_name: productionTagName,
        name: productionTagName,
        draft: true,
        body: generatedBody,
      }),
    );
  });

  it('rejects malformed GitHub Release collection responses at the API boundary', async () => {
    const fakeHttpClient = createFakeHttpClient({
      responseForRequest() {
        return [{tag_name: '2026-08-28.1-production', draft: true}];
      },
    });
    const githubReleaseClient = createClient(fakeHttpClient.httpClient);

    const actualResult = await githubReleaseClient.findReleaseByTag({tagName: '2026-08-28.1-production'});

    assert(actualResult.isErr);
    expect(actualResult.error.message).toBe('Malformed GitHub Release collection response');
  });

  it('rejects malformed generated GitHub Release notes responses at the API boundary', async () => {
    const fakeHttpClient = createFakeHttpClient({
      responseForRequest() {
        return {name: 'Generated Production release'};
      },
    });
    const githubReleaseClient = createClient(fakeHttpClient.httpClient);

    const actualResult = await githubReleaseClient.generateReleaseNotes({
      productionTagName: '2026-08-28.1-production',
      precedingProductionTagName: '2026-08-07.1-production',
    });

    assert(actualResult.isErr);
    expect(actualResult.error.message).toBe('Malformed generated GitHub Release notes response');
  });

  it('handles GitHub API and transport failures without exposing the token', async () => {
    const apiFailureClient = createClient(
      createFakeHttpClient({
        responseForRequest() {
          throw createHttpResponseFailure(500);
        },
      }).httpClient,
    );
    const transportFailureClient = createClient(
      createFakeHttpClient({
        responseForRequest() {
          throw new Error('transport failure for github-token');
        },
      }).httpClient,
    );

    const apiFailureResult = await apiFailureClient.findReleaseByTag({tagName: '2026-08-28.1-production'});
    const transportFailureResult = await transportFailureClient.findReleaseByTag({
      tagName: '2026-08-28.1-production',
    });

    assert(apiFailureResult.isErr);
    expect(apiFailureResult.error.message).toContain('Unable to find GitHub Release');
    assert(transportFailureResult.isErr);
    expect(transportFailureResult.error.message).not.toContain('github-token');
    expect(transportFailureResult.error.message).toContain('[REDACTED]');
  });
});
