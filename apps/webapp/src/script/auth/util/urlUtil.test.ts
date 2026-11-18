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

import {createAuthRedirectPath} from './urlUtil';

import {
  forTestsOnlyFeatureToggleName,
  minimizeSelfViewFeatureToggleName,
} from '../../featureToggles/startupFeatureToggleNames';
import {initializeStartupFeatureToggleUrl} from '../../featureToggles/initializeStartupFeatureToggleUrl';
import {startupFeatureToggleQueryParameterName} from '../../featureToggles/startupFeatureToggles';
import {FORWARDED_QUERY_KEYS, QUERY_KEY} from '../route';

type AuthRedirectTestCase = {
  readonly authPath: string;
  readonly expectedMainAppPath: string;
};

function createAuthRedirectTest(options: AuthRedirectTestCase): () => void {
  const {authPath, expectedMainAppPath} = options;

  return () => {
    const authUrl = new URL(authPath, 'https://example.com');
    const mainAppPath = createAuthRedirectPath({
      path: '../',
      locationSearch: authUrl.search,
      additionalQueryParameters: {},
      allowedQueryParameterNames: FORWARDED_QUERY_KEYS,
    });

    expect(mainAppPath).toBe(expectedMainAppPath);
  };
}

describe('createAuthRedirectPath', () => {
  it('omits the question mark when no query parameters are forwarded', () => {
    const actualPath = createAuthRedirectPath({
      path: '../',
      locationSearch: '?unrelated=value',
      additionalQueryParameters: {},
      allowedQueryParameterNames: FORWARDED_QUERY_KEYS,
    });

    expect(actualPath).toBe('../');
  });

  it('keeps a path unchanged when the query string is empty', () => {
    const actualPath = createAuthRedirectPath({
      path: '../',
      locationSearch: '',
      additionalQueryParameters: {},
      allowedQueryParameterNames: FORWARDED_QUERY_KEYS,
    });

    expect(actualPath).toBe('../');
  });

  it('preserves repeated forwarded parameters and their original encoding', () => {
    const actualPath = createAuthRedirectPath({
      path: '../',
      locationSearch: '?hl=en&tracking=a%20b&tracking=a+b&&enabled-features=',
      additionalQueryParameters: {},
      allowedQueryParameterNames: FORWARDED_QUERY_KEYS,
    });

    expect(actualPath).toBe('../?hl=en&tracking=a%20b&tracking=a+b&enabled-features=');
  });

  it('honors a custom allowlist and appends additional parameters without encoding them again', () => {
    const actualPath = createAuthRedirectPath({
      path: '/auth/',
      locationSearch: '?return=conversation%2F123&hl=en',
      allowedQueryParameterNames: ['return'],
      additionalQueryParameters: {destination_url: 'https%3A%2F%2Fexample.com', hl: 'de'},
    });

    expect(actualPath).toBe('/auth/?return=conversation%2F123&destination_url=https%3A%2F%2Fexample.com&hl=de');
  });

  it('forwards initialized defaults into authentication and back to the application', () => {
    let applicationUrl = new URL('https://example.com/?hl=en');

    initializeStartupFeatureToggleUrl({
      url: applicationUrl,
      defaultEnabledFeatureToggleNames: [forTestsOnlyFeatureToggleName],
      replaceUrl(url) {
        applicationUrl = new URL(url);
      },
    });
    const authPath = createAuthRedirectPath({
      path: '/auth/',
      locationSearch: applicationUrl.search,
      additionalQueryParameters: {},
      allowedQueryParameterNames: FORWARDED_QUERY_KEYS,
    });
    const authUrl = new URL(`${authPath}#/login`, applicationUrl);
    const mainAppPath = createAuthRedirectPath({
      path: '../',
      locationSearch: authUrl.search,
      additionalQueryParameters: {},
      allowedQueryParameterNames: FORWARDED_QUERY_KEYS,
    });

    expect(authPath).toBe('/auth/?hl=en&enabled-features=for-tests-only');
    expect(mainAppPath).toBe('../?hl=en&enabled-features=for-tests-only');
  });

  const startupFeatureToggleQueryString = new URLSearchParams({
    [startupFeatureToggleQueryParameterName]: minimizeSelfViewFeatureToggleName,
  }).toString();

  it(
    'forwards startup feature toggles from the auth document into the main app',
    createAuthRedirectTest({
      authPath: `/auth/?${startupFeatureToggleQueryString}#/login`,
      expectedMainAppPath: `../?${startupFeatureToggleQueryString}`,
    }),
  );

  it(
    'forwards an explicit empty selection so preview defaults cannot be restored after login',
    createAuthRedirectTest({
      authPath: '/auth/?enabled-features=#/login',
      expectedMainAppPath: '../?enabled-features=',
    }),
  );

  it(
    'preserves unknown feature selections during authentication',
    createAuthRedirectTest({
      authPath: '/auth/?enabled-features=unknown-feature#/login',
      expectedMainAppPath: '../?enabled-features=unknown-feature',
    }),
  );

  const forwardedQueryString = new URLSearchParams({
    [QUERY_KEY.ACCOUNT_ID]: 'account-id',
    [QUERY_KEY.ENVIRONMENT]: 'environment',
    [QUERY_KEY.LOCALE]: 'en',
    [QUERY_KEY.TRACKING]: 'tracking',
    client_id: 'client-id',
    redirect_uri: 'https://example.com/callback',
    response_type: 'code',
    scope: 'profile',
    state: 'oauth-state',
    code_challenge: 'challenge',
    code_challenge_method: 'S256',
    response_mode: 'query',
    code: 'authorization-code',
    authuser: 'account-id',
    prompt: 'login',
    hd: 'example.com',
    [startupFeatureToggleQueryParameterName]: forTestsOnlyFeatureToggleName,
  }).toString();

  it(
    'preserves existing auth and OAuth parameters alongside startup toggles and filters unrelated parameters',
    createAuthRedirectTest({
      authPath: `/auth/?${forwardedQueryString}&unrelated=value#/login`,
      expectedMainAppPath: `../?${forwardedQueryString}`,
    }),
  );
});
