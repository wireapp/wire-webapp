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

import {pathWithParams} from './urlUtil';

import {testOnlyFeatureToggleName} from '../../featureToggles/startupFeatureToggleNames';
import {startupFeatureToggleQueryParameterName} from '../../featureToggles/startupFeatureToggles';
import {QUERY_KEY} from '../route';

type AuthRedirectTestCase = {
  readonly authPath: string;
  readonly expectedMainAppPath: string;
};

function createAuthRedirectTest({authPath, expectedMainAppPath}: AuthRedirectTestCase): () => void {
  return () => {
    const originalUrl = window.location.href;
    const originalHistoryState = window.history.state;

    try {
      window.history.replaceState(null, '', authPath);
      const mainAppPath = pathWithParams('../');

      expect(mainAppPath).toBe(expectedMainAppPath);
    } finally {
      window.history.replaceState(originalHistoryState, '', originalUrl);
    }
  };
}

describe('pathWithParams', () => {
  const startupFeatureToggleQueryString = new URLSearchParams({
    [startupFeatureToggleQueryParameterName]: testOnlyFeatureToggleName,
  }).toString();

  it(
    'forwards startup feature toggles from the auth document into the main app',
    createAuthRedirectTest({
      authPath: `/auth/?${startupFeatureToggleQueryString}#/login`,
      expectedMainAppPath: `../?${startupFeatureToggleQueryString}`,
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
    [startupFeatureToggleQueryParameterName]: testOnlyFeatureToggleName,
  }).toString();

  it(
    'preserves existing auth and OAuth parameters alongside startup toggles and filters unrelated parameters',
    createAuthRedirectTest({
      authPath: `/auth/?${forwardedQueryString}&unrelated=value#/login`,
      expectedMainAppPath: `../?${forwardedQueryString}`,
    }),
  );
});
