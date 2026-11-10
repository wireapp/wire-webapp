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

import {Maybe} from 'true-myth';

import {
  createGitHubApiRoot,
  createGitHubHeaders,
  createGitHubHttpRequest,
  createGitHubPageUrl,
  encodeGitHubRepositoryName,
  formatGitHubRequestError,
  redactGitHubSecret,
} from './githubApi.ts';

describe('GitHub release API primitives', () => {
  it('normalizes the API root to end with a slash', () => {
    expect(createGitHubApiRoot(new URL('https://api.github.com'))).toEqual(new URL('https://api.github.com/'));
    expect(createGitHubApiRoot(new URL('https://github.example/api/v3/'))).toEqual(
      new URL('https://github.example/api/v3/'),
    );
  });

  it('encodes each repository path component while preserving the separator', () => {
    expect(encodeGitHubRepositoryName('wire team/web app#client')).toBe('wire%20team/web%20app%23client');
  });

  it('creates standard API headers and adds content type only for JSON bodies', () => {
    expect(createGitHubHeaders({githubToken: 'test-token', includesJsonBody: false})).toEqual({
      Accept: 'application/vnd.github+json',
      Authorization: 'Bearer test-token',
      'X-GitHub-Api-Version': '2022-11-28',
    });
    expect(createGitHubHeaders({githubToken: 'test-token', includesJsonBody: true})['Content-Type']).toBe(
      'application/json',
    );
  });

  it('creates paginated URLs without mutating the endpoint', () => {
    const endpoint = new URL('https://api.github.com/repos/wireapp/wire-webapp/pulls?state=closed');
    const pageUrl = createGitHubPageUrl({endpoint, page: 3});

    expect(pageUrl.searchParams.get('per_page')).toBe('100');
    expect(pageUrl.searchParams.get('page')).toBe('3');
    expect(pageUrl.searchParams.get('state')).toBe('closed');
    expect(endpoint.searchParams.has('page')).toBe(false);
  });

  it('creates GET requests without bodies and preserves JSON bodies for write requests', () => {
    const headers = createGitHubHeaders({githubToken: 'test-token', includesJsonBody: false});
    const readRequest = createGitHubHttpRequest({
      method: 'get',
      url: new URL('https://api.github.com/repos/wireapp/wire-webapp/pulls'),
      headers,
      json: Maybe.nothing(),
    });
    const writeHeaders = createGitHubHeaders({githubToken: 'test-token', includesJsonBody: true});
    const writeRequest = createGitHubHttpRequest({
      method: 'post',
      url: new URL('https://api.github.com/repos/wireapp/wire-webapp/pulls'),
      headers: writeHeaders,
      json: Maybe.just({title: 'Release tooling update'}),
    });

    expect(readRequest.json.isNothing).toBe(true);
    expect(readRequest.headers['Content-Type']).toBeUndefined();
    expect(writeRequest.json.isJust).toBe(true);
    expect(writeRequest.headers['Content-Type']).toBe('application/json');
  });

  it('formats request failures and redacts the GitHub token', () => {
    const failureMessage = formatGitHubRequestError({
      error: new Error('Request failed with secret-token'),
      fallbackMessage: 'Unknown GitHub request failure',
    });

    expect(redactGitHubSecret(failureMessage, 'secret-token')).toBe('Request failed with [REDACTED]');
    expect(formatGitHubRequestError({error: undefined, fallbackMessage: 'Unknown GitHub request failure'})).toBe(
      'Unknown GitHub request failure',
    );
  });
});
